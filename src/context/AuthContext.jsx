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
      const { data } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', sessionUser.id)
        .maybeSingle();

      if (data && data.tenant_id) {
        setTenantId(data.tenant_id);
        setRole(data.role || defaultRole);
        try { localStorage.setItem('argentum_current_tenant_id', data.tenant_id); } catch (e) {}
        resolvedUserIdRef.current = sessionUser.id;
        await checkTrialAndLicense(sessionUser, data.tenant_id);
        return;
      }

      let assignedTenantId = null;

      // 2. Solo el Administrador Principal (whitelist exacta por email, NO
      // por substring ni por el role que haya en user_metadata) recupera el
      // tenant histórico original.
      if (emailLower === ADMIN_PRINCIPAL_EMAIL) {
        try {
          const { data: primaryTenants } = await supabase
            .from('tenants')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1);

          if (primaryTenants && primaryTenants.length > 0) {
            assignedTenantId = primaryTenants[0].id;
          }
        } catch (errPrimary) {
          console.warn('Error recuperando tenant histórico del admin:', errPrimary);
        }
      }

      // 3. Cualquier otro usuario sin tenant asignado (todos, salvo el admin
      // principal) SIEMPRE recibe un tenant nuevo, aislado y único. Si viene
      // de OnboardingWizard (confirmó su email y este es su primer login),
      // user_metadata trae todos los datos que cargó en el wizard (rubro,
      // CUIT, domicilio, etc.) -- si no vienen (ej: usuario creado por otra
      // vía), se usan valores mínimos por defecto.
      let isNewTenant = false;
      let rubroParaSeed = null;

      if (!assignedTenantId) {
        const newTenantId = crypto.randomUUID();
        const meta = sessionUser.user_metadata || {};
        const userSlug = sessionUser.email ? sessionUser.email.split('@')[0] : 'comercio';
        const nombreNuevoComercio = meta.nombre_comercio || `Comercio (${userSlug})`;
        const trialEndsAtDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
        const userCuit = meta.cuit || '00-00000000-0';
        rubroParaSeed = meta.rubro || null;

        try {
          // OJO: sin .select() a propósito. La policy de SELECT de tenants
          // exige un vínculo en tenant_users que todavía no existe en este
          // punto (se crea recién en el paso 3.5, siguiente), así que pedir
          // la fila de vuelta con RETURNING hacía fallar el INSERT entero
          // con "new row violates row-level security policy" aunque el
          // INSERT en sí mismo fuera perfectamente válido. El id ya lo
          // generamos nosotros, no hace falta que Postgres nos lo devuelva.
          const { error: createTenantErr } = await supabase
            .from('tenants')
            .insert([{
              id: newTenantId,
              nombre_comercio: nombreNuevoComercio,
              razon_social: meta.razon_social || nombreNuevoComercio,
              rubro: rubroParaSeed,
              cuit: userCuit,
              afip_cuit_delegado: userCuit,
              condicion_fiscal: meta.condicion_fiscal || 'Monotributista',
              domicilio_fiscal: meta.domicilio_fiscal || null,
              provincia: meta.provincia || null,
              localidad: meta.localidad || null,
              codigo_postal: meta.codigo_postal || null,
              afip_punto_de_venta: Number(meta.afip_punto_de_venta || 1),
              necesita_crear_pto_venta: Boolean(meta.necesita_crear_pto_venta),
              trial_ends_at: trialEndsAtDate,
              is_active: true,
              onboarding_completado: Boolean(rubroParaSeed),
              onboarding_paso_actual: rubroParaSeed ? 4 : 1
            }]);

          if (createTenantErr) {
            console.error('Error al crear nuevo tenant en BD:', createTenantErr.message);
          } else {
            assignedTenantId = newTenantId;
            isNewTenant = true;
          }
        } catch (errCreate) {
          console.warn('Excepción al intentar crear nuevo tenant en BD:', errCreate);
        }
      }

      // 3.5 Vincular el usuario a su tenant en tenant_users. Sin esto, el
      // usuario nunca "recuerda" su tenant entre sesiones (cada login volvía
      // a crear uno nuevo, huérfano) y, como tenants tiene RLS restringido a
      // tenant_users, tampoco puede leer ni actualizar su propio tenant
      // (incluido trial_ends_at) — quedaba bloqueado por el paywall aunque
      // el trial fuera válido.
      if (assignedTenantId) {
        try {
          const { error: linkError } = await supabase
            .from('tenant_users')
            .insert([{
              tenant_id: assignedTenantId,
              user_id: sessionUser.id,
              role: defaultRole
            }]);
          if (linkError) {
            console.warn('No se pudo vincular el usuario a su tenant en tenant_users:', linkError.message);
          }
        } catch (errLink) {
          console.warn('Excepción al vincular usuario a tenant_users:', errLink);
        }

        // 3.6 Poblar catálogo inicial de productos por defecto. Solo para un
        // tenant recién creado (no para el admin recuperando el historico).
        if (isNewTenant) {
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
          await fetchTenantAndRole(currentUser);
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
        await fetchTenantAndRole(currentUser);
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
    <AuthContext.Provider value={{ user, tenantId, role, loading, licenseInfo, tenantInfo, ...licenseInfo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



