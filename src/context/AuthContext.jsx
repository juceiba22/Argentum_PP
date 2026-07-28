import React, { createContext, useContext, useEffect, useState } from 'react';
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
      // Consultar la tabla puente 'tenant_users'
      const { data, error } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', sessionUser.id)
        .single();

      if (error) {
        console.error('Error al obtener tenant y rol del usuario:', error.message);
        setTenantId(null);
        setRole(null);
        return;
      }

      if (data) {
        setTenantId(data.tenant_id);
        setRole(data.role || 'admin');
      }
    } catch (err) {
      console.error('Excepción al resolver el tenant:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentUser = session?.user || null;
        if (isMounted) setUser(currentUser);
        
        if (currentUser) {
          await fetchTenantAndRole(currentUser);
        } else {
          if (isMounted) {
            setTenantId(null);
            setRole(null);
          }
        }
      } catch (err) {
        console.error('Error al obtener la sesión inicial:', err);
        if (isMounted) {
          setUser(null);
          setTenantId(null);
          setRole(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    // 2. Escuchar cambios de estado (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const currentUser = session?.user || null;
        if (isMounted) setUser(currentUser);
        
        if (currentUser) {
          await fetchTenantAndRole(currentUser);
        } else {
          if (isMounted) {
            setTenantId(null);
            setRole(null);
          }
        }
      } catch (err) {
        console.error('Error en onAuthStateChange:', err);
        if (isMounted) {
          setUser(null);
          setTenantId(null);
          setRole(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor: 'var(--bg-primary, #1a1a1a)', color: 'var(--text-primary, #ffffff)' }}>
        <p style={{ fontSize: '1.2rem' }}>Cargando sesión...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, tenantId, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);