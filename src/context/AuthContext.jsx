import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

// Tiempo máximo que esperamos a getSession() antes de asumir que quedó colgada
const SESSION_TIMEOUT_MS = 8000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

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

    const isVentas = sessionUser.email?.toLowerCase().includes('ventas');
    const defaultRole = isVentas ? 'ventas' : (sessionUser.user_metadata?.role || 'admin');

    try {
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

      let fallbackTenantId = sessionUser.user_metadata?.tenant_id || null;

      if (!fallbackTenantId) {
        // Auto-crear un nuevo tenant aislado para que el nuevo usuario inicie con cuenta limpia (en 0)
        const userSlug = sessionUser.email ? sessionUser.email.split('@')[0] : 'nuevo';
        const nombreNuevoComercio = sessionUser.user_metadata?.nombre_comercio || `Comercio (${userSlug})`;

        try {
          const { data: newTenant, error: createTenantErr } = await supabase
            .from('tenants')
            .insert([{
              nombre: nombreNuevoComercio,
              nombre_comercio: nombreNuevoComercio
            }])
            .select('id')
            .single();

          if (!createTenantErr && newTenant?.id) {
            fallbackTenantId = newTenant.id;
          } else {
            console.warn('No se pudo auto-crear tenant en la tabla tenants:', createTenantErr);
          }
        } catch (errCreate) {
          console.warn('Excepción al intentar auto-crear nuevo tenant:', errCreate);
        }
      }

      if (fallbackTenantId) {
        setTenantId(fallbackTenantId);
        setRole(defaultRole);

        try {
          await supabase.from('tenant_users').insert([{
            tenant_id: fallbackTenantId,
            user_id: sessionUser.id,
            role: defaultRole
          }]);
        } catch (insertErr) {
          console.warn('No se pudo auto-insertar tenant_user:', insertErr);
        }
      } else {
        setRole(defaultRole);
      }
    } catch (err) {
      console.error('Excepción al resolver el tenant:', err);
      setRole(defaultRole);
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
          const defaultRole = isVentas ? 'ventas' : (currentUser.user_metadata?.role || 'admin');
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
        const defaultRole = isVentas ? 'ventas' : (currentUser.user_metadata?.role || 'admin');
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
    <AuthContext.Provider value={{ user, tenantId, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);