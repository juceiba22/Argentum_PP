import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función de purga dura para limpiar tokens o estados corruptos en localStorage sin bloquear la UI
  const hardClearSession = () => {
    // 1. Limpiar inmediatamente el estado local de React
    setUser(null);
    setTenantId(null);
    setRole(null);
    setLoading(false);

    // 2. Limpieza síncrona manual de localStorage
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Error purgando localStorage:', e);
    }

    // 3. Intentar signOut en segundo plano (sin await para no bloquear la UI)
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
      // 1. Consultar la tabla puente 'tenant_users'
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

      // 2. Si no tiene registro en tenant_users, buscar el tenant id disponible en la base de datos
      let fallbackTenantId = sessionUser.user_metadata?.tenant_id || null;

      if (!fallbackTenantId) {
        const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        if (tenantData?.id) {
          fallbackTenantId = tenantData.id;
        } else {
          const { data: anyTenantUser } = await supabase.from('tenant_users').select('tenant_id').limit(1).maybeSingle();
          if (anyTenantUser?.tenant_id) {
            fallbackTenantId = anyTenantUser.tenant_id;
          }
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
    let isMounted = true;

    // Recuperar sesión con timeout de 1.5s usando Promise.race para prevenir deadlocks del SDK
    const fetchSessionWithTimeout = async (timeoutMs = 1500) => {
      return Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session retrieval timeout')), timeoutMs)
        )
      ]);
    };

    const initSession = async () => {
      try {
        const { data, error } = await fetchSessionWithTimeout(1500);
        if (error) throw error;

        const session = data?.session || null;
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
        } else {
          if (isMounted) {
            setTenantId(null);
            setRole(null);
          }
        }
      } catch (err) {
        console.warn('Sesión no encontrada o corrupta. Ejecutando limpieza dura:', err.message || err);
        if (isMounted) {
          hardClearSession();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    // Listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;

      try {
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
        } else {
          if (isMounted) {
            setTenantId(null);
            setRole(null);
          }
        }
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