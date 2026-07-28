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
    // 1. Obtener la sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        await fetchTenantAndRole(currentUser);
      }
      setLoading(false);
    });

    // 2. Escuchar cambios de estado (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        await fetchTenantAndRole(currentUser);
      } else {
        setTenantId(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenantId, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);