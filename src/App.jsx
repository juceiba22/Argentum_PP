import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import { supabase } from './services/supabaseClient';
import { ActivityProvider } from './context/ActivityContext';
import './index.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener la sesión actual al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios de estado (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'white' }}>
        <p>Cargando sesión...</p>
      </div>
    );
  }

  return (
    <ActivityProvider>
      <Router>
        <Routes>
        {/* Ruta Pública (Login) */}
        <Route 
          path="/" 
          element={!session ? <Login /> : <Navigate to="/dashboard" replace />} 
        />
        
        {/* Rutas Protegidas (Requieren Sesión) */}
        {session ? (
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/pedidos" element={<Pedidos />} />
          </Route>
        ) : (
          /* Redirección automática si intenta acceder a rutas protegidas sin sesión */
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Router>
    </ActivityProvider>
  );
}

export default App;
