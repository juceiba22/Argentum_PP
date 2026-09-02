import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { seedProductosIniciales } from '../utils/starterProducts';

const AuthContext = createContext();

// Tiempo máximo que esperamos a getSession() antes de asumir que quedó colgada
const SESSION_TIMEOUT_MS = 8000;

// Único email que puede heredar el tenant histórico original (el que tiene
// todas las ventas/compras/proveedores reales del comercio principal).
// IMPORTANTE: esto es una whitelist explícita y cerrada, no un "includes()".
// Cualquier otro usuario, sea cual sea su email o el rol que traiga en
// user_metadata, SIEMPRE arranca con su propio tenant aislado.
const ADMIN_PRINCIPAL_EMAIL = 'admin@argentum.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [licenseInfo, setLicenseInfo] = useState({
    isTrialActive: true,
    isLicenseActive: false,
    daysRemainingTrial: 15,
    hasValidAccess: true,
    trialEndsAt: null,
    licenseState: null
  });
  // Datos completos del comercio (para la tarjeta de perfil). Se completa en
  // checkTrialAndLicense, que ya consulta tenants por otros motivos.
  const [tenantInfo, setTenantInfo] = useState(null);

  // Evita que StrictMode (doble invocación de efectos en dev) dispare dos
  // inicializaciones de sesión en paralelo, compitiendo por el mismo estado.
  const hasInitialized = useRef(false);

  // Guarda el id del último usuario para el que ya resolvimos tenant/rol.
  // Sirve para ignorar eventos de auth "ruidosos" (ej: TOKEN_REFRESHED al
  // volver de background) que no implican un cambio real de usuario, y que
  // de otro modo hacían "parpadear" tenantId a null y rompían la carga de
  // datos en las páginas (Market, GestionPromociones, etc.).
  const resolvedUserIdRef = useRef(null);

  // BUG (productos que desaparecen en el próximo login): initSession() llama
  // a fetchTenantAndRole() directamente, y el listener de onAuthStateChange
  // (evento SIGNED_IN, que Supabase dispara al detectar el token en la URL
  // tras confirmar el email o volver del redirect de Google) puede disparar
  // OTRA llamada a fetchTenantAndRole() para el MISMO usuario mientras la
  // primera todavía está en vuelo (resolvedUserIdRef recién se setea DESPUÉS
  // de terminar, así que no alcanza a frenar la segunda). Para un usuario
  // nuevo (sin fila todavía en tenant_users) ambas llamadas ven "no tiene
  // tenant" al mismo tiempo y cada una crea+siembra su propio tenant nuevo:
  // quedan dos tenants para el mismo usuario, y en el próximo login siempre
  // gana el más viejo (tenant_users ordena por created_at) aunque el usuario
  // haya estado cargando productos en el otro durante toda la sesión -- ahí
  // "desaparecen". Este ref deduplica: si ya hay una resolución en curso
  // para este mismo user_id, todos los llamadores esperan la MISMA promesa
  // en vez de arrancar una segunda.
  const fetchInFlightRef = useRef(null); // { userId, promise } | null

  // Función de purga dura para limpiar tokens o estados corruptos en localStorage sin bloquear la UI
  const hardClearSession = () => {
    setUser(null);
    setTenantId(null);
    setRole(null);
    setTenantInfo(null);
    setLoading(false);
    resolvedUserIdRef.current = null;

    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Error purgando localStorage:', e);
    }

    supabase.auth.signOut().catch(() => {});
  };

  const fetchTenantAndRole = async (sessionUser) => {
    if (!sessionUser) {
      setTenantId(null);
      setRole(null);
      return;
    }

    const emailLower = sessionUser.email?.toLowerCase() || '';
    const isVentas = emailLower.includes('ventas');
    // El rol mostrado en la UI puede venir de user_metadata (es solo display),
    // pero NUNCA se usa para decidir a qué tenant se conecta el usuario.
    const defaultRole = isVentas ? 'ventas' : (sessionUser.user_metadata?.role || 'usuario');

    try {
      // 1. Intentar obtener asignación existente en tenant_users.
      // Esta es la ÚNICA fuente de verdad sobre a qué tenant pertenece un
      // usuario ya vinculado anteriormente.
      const { data, error: tenantUserErr } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', sessionUser.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (tenantUserErr) {
        console.warn('Error al buscar tenant_users:', tenantUserErr);
      }

      if (data && data.length > 0 && data[0].tenant_id) {
        const tenantRow = data[0];
        setTenantId(tenantRow.tenant_id);
        setRole(tenantRow.role || defaultRole);
        try { localStorage.setItem('argentum_current_tenant_id', tenantRow.tenant_id); } catch (e) {}
        resolvedUserIdRef.current = sessionUser.id;
        await checkTrialAndLicense(sessionUser, tenantRow.tenant_id);
        return;
      }

      let assignedTenantId = null;
      let isNewTenant = false;
      let rubroParaSeed = null;

      // 2/3/3.5. Alta de tenant + vínculo en tenant_users, atómicos en el
      // servidor (función SECURITY DEFINER "provision_tenant_for_current_user",
      // ver migración 20260901000000_secure_tenant_provisioning.sql).
      //
      // ANTES esto eran 3 pasos separados hechos desde el cliente: SELECT
      // (¿es el admin?) -> INSERT en tenants (con un tenant_id generado acá,
      // client-side) -> INSERT en tenant_users. Dos problemas serios con eso:
      //
      //  1. Cualquier usuario autenticado podía, llamando directo al REST
      //     API (sin pasar por esta UI), insertar en tenant_users un
      //     {user_id: <el suyo>, tenant_id: <de OTRO comercio, adivinado o
      //     filtrado>} -- la policy de INSERT solo validaba el user_id,
      //     nunca el tenant_id. Eso le daba lectura/escritura completa sobre
      //     los datos de ese comercio ajeno. La función server-side ya no
      //     acepta un tenant_id arbitrario del cliente: SIEMPRE genera uno
      //     nuevo o resuelve el propio, nunca uno que el cliente le pase.
      //
      //  2. Dos llamadas concurrentes a este método para el mismo usuario
      //     nuevo (ver fetchInFlightRef más arriba) podían pasar el chequeo
      //     "¿tiene tenant?" al mismo tiempo y crear dos tenants duplicados.
      //     La función usa un advisory lock por usuario dentro de la misma
      //     transacción de Postgres, así que ninguna carrera -- ni siquiera
      //     entre pestañas o dispositivos distintos -- puede duplicarlo.
      const meta = sessionUser.user_metadata || {};
      const userSlug = sessionUser.email ? sessionUser.email.split('@')[0] : 'comercio';
      const nombreNuevoComercio = meta.nombre_comercio || `Comercio (${userSlug})`;
      const userCuit = meta.cuit || '00-00000000-0';
      rubroParaSeed = meta.rubro || null;

      try {
        const { data: provisionData, error: provisionErr } = await supabase.rpc(
          'provision_tenant_for_current_user',
          {
            p_nombre_comercio: nombreNuevoComercio,
            p_razon_social: meta.razon_social || nombreNuevoComercio,
            p_rubro: rubroParaSeed,
            p_cuit: userCuit,
            p_condicion_fiscal: meta.condicion_fiscal || 'Monotributista',
            p_domicilio_fiscal: meta.domicilio_fiscal || null,
            p_provincia: meta.provincia || null,
            p_localidad: meta.localidad || null,
            p_codigo_postal: meta.codigo_postal || null,
            p_afip_punto_de_venta: Number(meta.afip_punto_de_venta || 1),
            p_necesita_crear_pto_venta: Boolean(meta.necesita_crear_pto_venta),
            p_role: defaultRole
          }
        );

        if (provisionErr) {
          console.error('Error al aprovisionar tenant vía RPC:', provisionErr.message);
        } else {
          const row = Array.isArray(provisionData) ? provisionData[0] : provisionData;
          if (row?.tenant_id) {
            assignedTenantId = row.tenant_id;
            isNewTenant = Boolean(row.is_new_tenant);
          }
        }
      } catch (errProvision) {
        console.warn('Excepción al aprovisionar tenant vía RPC:', errProvision);
      }

      if (assignedTenantId) {
        // 3.6 Poblar catálogo inicial de productos por defecto. Solo para un
        // tenant recién creado (no para el admin recuperando el historico) Y
        // que ya trae un rubro elegido (viene de OnboardingWizard). Un alta
        // por Google nunca pasa por el wizard -- user_metadata no tiene
        // "rubro" -- así que antes esto sembraba el catálogo genérico
        // "general / otro" y el tenant quedaba con rubro=null para siempre
        // (nada en la app volvía a pedírselo). Ahora, si no hay rubro, se
        // deja sin sembrar: RubroGate (ver App.jsx) obliga a elegir un rubro
        // en el primer uso y ahí sí siembra el catálogo correcto una única
        // vez, ya con el rubro real guardado en tenants.rubro.
        if (isNewTenant && rubroParaSeed) {
          try {
            await seedProductosIniciales(assignedTenantId, rubroParaSeed);
          } catch (errSeed) {
            console.warn('No se pudieron cargar los productos iniciales:', errSeed);
          }
        }
      }

      // 4. Asignar tenantId y guardar en localStorage
      setTenantId(assignedTenantId);
      setRole(defaultRole);
      try { localStorage.setItem('argentum_current_tenant_id', assignedTenantId); } catch (e) {}
      resolvedUserIdRef.current = sessionUser.id;

      // 5. Verificar estado de Trial de 15 días y Licencias activas por Email
      await checkTrialAndLicense(sessionUser, assignedTenantId);
    } catch (err) {
      console.error('Excepción al resolver el tenant:', err);
      setRole(defaultRole);
    }
  };

  // Punto único de entrada a fetchTenantAndRole: si ya hay una resolución en
  // curso para este user_id, reutiliza esa promesa en vez de lanzar una
  // segunda ejecución concurrente (ver comentario en fetchInFlightRef).
  const fetchTenantAndRoleOnce = (sessionUser) => {
    if (!sessionUser) return fetchTenantAndRole(sessionUser);

    if (fetchInFlightRef.current && fetchInFlightRef.current.userId === sessionUser.id) {
      return fetchInFlightRef.current.promise;
    }

    const promise = fetchTenantAndRole(sessionUser).finally(() => {
      if (fetchInFlightRef.current?.promise === promise) {
        fetchInFlightRef.current = null;
      }
    });

    fetchInFlightRef.current = { userId: sessionUser.id, promise };
    return promise;
  };

  const checkTrialAndLicense = async (sessionUser, resolvedTenantId) => {
    if (!sessionUser) {
      setLicenseInfo({
        isTrialActive: false,
        isLicenseActive: false,
        daysRemainingTrial: 0,
        hasValidAccess: false,
        trialEndsAt: null,
        licenseState: null
      });
      setTenantInfo(null);
      return;
    }

    try {
      // FIX: estas dos variables faltaban y provocaban un ReferenceError
      // silencioso (atrapado más abajo por el catch), que hacía que
      // setLicenseInfo nunca se llamara y la app quedara pegada en el
      // estado inicial por defecto: trial activo de 15 días para TODOS
      // los usuarios, tuvieran o no una licencia paga vigente.
      const email = sessionUser.email?.toLowerCase() || '';
      const now = new Date();

      // 1. Consultar si posee una Licencia Activa Paga en 'licencias_activas' vinculada por Email
      let isLicenseActive = false;
      let licenseState = null;

      if (email) {
        const { data: licData } = await supabase
          .from('licencias_activas')
          .select('*')
          .eq('email', email)
          .eq('estado', 'activa')
          .maybeSingle();

        if (licData) {
          const expDate = licData.valida_hasta || licData.fecha_vencimiento ? new Date(licData.valida_hasta || licData.fecha_vencimiento) : null;
          if (!expDate || expDate >= now) {
            isLicenseActive = true;
            licenseState = licData;
          }
        }
      }

      // 2. Consultar datos completos del tenant: trial_ends_at/is_active para
      // decidir el acceso, y el resto (nombre, rubro, cuit, domicilio, etc.)
      // para exponerlos como tenantInfo (tarjeta de perfil del comercio).
      let trialEndsAt = null;
      let tenantActive = true;

      if (resolvedTenantId) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, nombre_comercio, razon_social, rubro, cuit, condicion_fiscal, domicilio_fiscal, provincia, localidad, codigo_postal, trial_ends_at, is_active, afip_delegacion_verificada, mp_integracion_verificada, created_at')
          .eq('id', resolvedTenantId)
          .maybeSingle();

        setTenantInfo(tenantData || null);

        if (tenantData) {
          trialEndsAt = tenantData.trial_ends_at ? new Date(tenantData.trial_ends_at) : null;
          if (tenantData.is_active !== undefined && tenantData.is_active !== null) {
            tenantActive = tenantData.is_active;
          }
        }
      } else {
        setTenantInfo(null);
      }

      // 3. Calcular si el Trial de 15 días sigue vigente
      let isTrialActive = false;
      let daysRemainingTrial = 0;

      if (trialEndsAt && trialEndsAt >= now) {
        isTrialActive = true;
        const diffTime = Math.abs(trialEndsAt - now);
        daysRemainingTrial = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      // 4. Determinar acceso general: Excepción admin principal, o Licencia Activa, o Trial Vigente
      const isSystemAdmin = email?.toLowerCase() === ADMIN_PRINCIPAL_EMAIL;
      const hasValidAccess = tenantActive && (isLicenseActive || isTrialActive || isSystemAdmin);

      setLicenseInfo({
        isTrialActive,
        isLicenseActive,
        daysRemainingTrial,
        hasValidAccess,
        trialEndsAt,
        licenseState
      });
    } catch (errLic) {
      console.warn('Error verificando prueba/licencia:', errLic);
    }
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let isMounted = true;

    const withTimeout = (promise, ms) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SESSION_TIMEOUT')), ms)
        ),
      ]);
    };

    const initSession = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS
        );

        if (error) {
          console.warn('Error recuperando sesión:', error.message);
          const errStr = (error.message || '').toLowerCase();
          if (errStr.includes('invalid') || errStr.includes('expired') || errStr.includes('not found')) {
            if (isMounted) hardClearSession();
            return;
          }
        }

        const currentUser = session?.user || null;

        if (isMounted) setUser(currentUser);

        if (currentUser) {
          const isVentas = currentUser.email?.toLowerCase().includes('ventas');
          // Este es solo un valor optimista/temporal mientras resolvemos el
          // tenant real en fetchTenantAndRole; no decide accesos por sí solo.
          const defaultRole = isVentas ? 'ventas' : (currentUser.user_metadata?.role || 'usuario');
          if (isMounted) {
            setRole(defaultRole);
            setTenantId(currentUser.user_metadata?.tenant_id || null);
          }
          await fetchTenantAndRoleOnce(currentUser);
          resolvedUserIdRef.current = currentUser.id;
        } else {
          if (isMounted) {
            setTenantId(null);
            setRole(null);
            setTenantInfo(null);
          }
          resolvedUserIdRef.current = null;
        }
      } catch (err) {
        if (err?.message === 'SESSION_TIMEOUT') {
          console.warn('getSession() no respondió a tiempo. Purgando sesión para desbloquear la app.');
          if (isMounted) hardClearSession();
          return;
        }
        console.error('Excepción al inicializar sesión:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;

      const currentUser = session?.user || null;

      if (isMounted) setUser(currentUser);

      if (!currentUser) {
        resolvedUserIdRef.current = null;
        if (isMounted) {
          setTenantId(null);
          setRole(null);
          setTenantInfo(null);
        }
        return;
      }

      // Si ya habíamos resuelto tenant/rol para este mismo usuario, ignoramos
      // el evento. Esto cubre casos como TOKEN_REFRESHED disparado al volver
      // de background (pestaña inactiva, tablet bloqueada, etc.), donde el
      // usuario NO cambió y no hace falta tocar tenantId/role: hacerlo genera
      // un valor intermedio (null) que rompe la carga de datos en las páginas.
      if (currentUser.id === resolvedUserIdRef.current) {
        return;
      }

      try {
        const isVentas = currentUser.email?.toLowerCase().includes('ventas');
        const defaultRole = isVentas ? 'ventas' : (currentUser.user_metadata?.role || 'usuario');
        if (isMounted) {
          setRole(defaultRole);
        }
        await fetchTenantAndRoleOnce(currentUser);
        resolvedUserIdRef.current = currentUser.id;
      } catch (err) {
        console.error('Error en el listener de auth:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenantId, role, loading, licenseInfo, tenantInfo, refetchTenantInfo: () => fetchTenantAndRole(user), ...licenseInfo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



