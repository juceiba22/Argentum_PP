import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';

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
      // principal) SIEMPRE recibe un tenant nuevo, aislado y único.
      if (!assignedTenantId) {
        const newTenantId = crypto.randomUUID();
        const userSlug = sessionUser.email ? sessionUser.email.split('@')[0] : 'comercio';
        const nombreNuevoComercio = sessionUser.user_metadata?.nombre_comercio || `Comercio (${userSlug})`;
        const trialEndsAtDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
        const userCuit = sessionUser.user_metadata?.cuit || '00-00000000-0';

        assignedTenantId = newTenantId;

        try {
          const { data: newTenant, error: createTenantErr } = await supabase
            .from('tenants')
            .insert([{
              id: newTenantId,
              nombre_comercio: nombreNuevoComercio,
              cuit: userCuit,
              trial_ends_at: trialEndsAtDate,
              is_active: true
            }])
            .select('id')
            .maybeSingle();

          if (newTenant?.id) {
            assignedTenantId = newTenant.id;
          } else if (createTenantErr) {
            console.warn('Reintentando creación de tenant nuevo:', createTenantErr.message);
            const { data: retryTenant } = await supabase
              .from('tenants')
              .insert([{
                id: newTenantId,
                nombre_comercio: nombreNuevoComercio,
                cuit: userCuit
              }])
              .select('id')
              .maybeSingle();

            if (retryTenant?.id) {
              assignedTenantId = retryTenant.id;
            }
          }
        } catch (errCreate) {
          console.warn('Excepción al intentar crear nuevo tenant en BD:', errCreate);
        }
      }

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

      // 2. Consultar fecha de trial (trial_ends_at) e is_active en la tabla tenants
      let trialEndsAt = null;
      let tenantActive = true;

      if (resolvedTenantId) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('trial_ends_at, is_active')
          .eq('id', resolvedTenantId)
          .maybeSingle();

        if (tenantData) {
          trialEndsAt = tenantData.trial_ends_at ? new Date(tenantData.trial_ends_at) : null;
          if (tenantData.is_active !== undefined && tenantData.is_active !== null) {
            tenantActive = tenantData.is_active;
          }
        }
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
          setTenantId(currentUser.user_metadata?.tenant_id || null);
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
    <AuthContext.Provider value={{ user, tenantId, role, loading, licenseInfo, ...licenseInfo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



