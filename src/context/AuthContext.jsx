import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inicializar sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setRole(session?.user?.user_metadata?.role || 'admin'); // Default admin si no hay rol
      setLoading(false);
    });

    // Escuchar cambios de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setRole(session?.user?.user_metadata?.role || 'admin');
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
