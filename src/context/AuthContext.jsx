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

    try {
      // Consultar la tabla puente 'tenant_users' usando maybeSingle() para evitar excepciones si no hay registros
      const { data, error } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error al obtener tenant y rol del usuario:', error.message);
        setTenantId(sessionUser.user_metadata?.tenant_id || null);
        setRole(sessionUser.user_metadata?.role || 'admin');
        return;
      }

      if (data) {
        setTenantId(data.tenant_id);
        setRole(data.role || sessionUser.user_metadata?.role || 'admin');
      } else {
        // Fallback si el usuario no tiene fila en tenant_users aún
        setTenantId(sessionUser.user_metadata?.tenant_id || null);
        setRole(sessionUser.user_metadata?.role || 'admin');
      }
    } catch (err) {
      console.error('Excepción al resolver el tenant:', err);
      setTenantId(sessionUser.user_metadata?.tenant_id || null);
      setRole(sessionUser.user_metadata?.role || 'admin');
    }
  };

  useEffect(() => {
    // 1. Inicializar sesión al montar
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
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
        setLoading(false);
      }
    };

    initSession();

    // 2. Escuchar cambios de autenticación (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return; // Ya lo maneja initSession

      try {
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await fetchTenantAndRole(currentUser);
        } else {
          setTenantId(null);
          setRole(null);
        }
      } catch (err) {
        console.error('Error en el listener de auth:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenantId, role, loading }}>
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          flexDirection: 'column', 
          backgroundColor: 'var(--bg-color, #FAFAFA)', 
          color: 'var(--text-primary, #2C2C2C)' 
        }}>
          <p style={{ fontSize: '1.2rem', fontFamily: 'Lato, sans-serif', fontWeight: 600 }}>Cargando sesión...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);