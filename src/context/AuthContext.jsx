import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

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
        // Intentar obtener el tenant_id de la tabla 'tenants'
        const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        if (tenantData?.id) {
          fallbackTenantId = tenantData.id;
        } else {
          // Intentar obtener cualquier tenant_id existente en tenant_users
          const { data: anyTenantUser } = await supabase.from('tenant_users').select('tenant_id').limit(1).maybeSingle();
          if (anyTenantUser?.tenant_id) {
            fallbackTenantId = anyTenantUser.tenant_id;
          }
        }
      }

      if (fallbackTenantId) {
        setTenantId(fallbackTenantId);
        setRole(defaultRole);

        // Auto-asociar en tenant_users para evitar problemas futuros
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
    // Temporizador de seguridad: si Supabase tarda más de 800ms, liberar la carga de sesión
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 800);

    // 1. Inicializar sesión al montar
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          const isVentas = currentUser.email?.toLowerCase().includes('ventas');
          const defaultRole = isVentas ? 'ventas' : (currentUser.user_metadata?.role || 'admin');
          setRole(defaultRole);
          setTenantId(currentUser.user_metadata?.tenant_id || null);
          await fetchTenantAndRole(currentUser);
        } else {
          setTenantId(null);
          setRole(null);
        }
      } catch (err) {
        console.error('Error al obtener la sesión inicial:', err);
        setUser(null);
        setTenantId(null);
        setRole(null);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    initSession();

    // 2. Escuchar cambios de autenticación (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;

      try {
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          const isVentas = currentUser.email?.toLowerCase().includes('ventas');
          const defaultRole = isVentas ? 'ventas' : (currentUser.user_metadata?.role || 'admin');
          setRole(defaultRole);
          setTenantId(currentUser.user_metadata?.tenant_id || null);
          await fetchTenantAndRole(currentUser);
        } else {
          setTenantId(null);
          setRole(null);
        }
      } catch (err) {
        console.error('Error en el listener de auth:', err);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
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