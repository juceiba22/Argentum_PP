import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import Cocina from './pages/Cocina';
import RegistrosCaja from './pages/RegistrosCaja';
import Inventario from './pages/Inventario';
import Market from './pages/Market';
import { ActivityProvider } from './context/ActivityContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Componente para proteger y redirigir rutas
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'caja') return <Navigate to="/dashboard" replace />;
    if (role === 'cocina') return <Navigate to="/cocina" replace />;
    if (role === 'mozo') return <Navigate to="/pedidos" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

// Componente para manejar la redirección post-login
const LoginRedirect = () => {
  const { user, role } = useAuth();
  
  if (user) {
    if (role === 'caja') return <Navigate to="/dashboard" replace />;
    if (role === 'cocina') return <Navigate to="/cocina" replace />;
    if (role === 'mozo') return <Navigate to="/pedidos" replace />;
    return <Navigate to="/dashboard" replace />; // Admin por defecto
  }
  
  return <Login />;
};

function App() {
  return (
    <AuthProvider>
      <ActivityProvider>
        <Router>
          <Routes>
            {/* Ruta Pública (Login) */}
            <Route path="/" element={<LoginRedirect />} />
            
            {/* Rutas Protegidas (Requieren Sesión) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'caja']}><Dashboard /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute allowedRoles={['admin']}><Clientes /></ProtectedRoute>} />
              <Route path="/registros" element={<ProtectedRoute allowedRoles={['admin', 'caja']}><RegistrosCaja /></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute allowedRoles={['admin']}><Inventario /></ProtectedRoute>} />
              <Route path="/pedidos" element={<ProtectedRoute allowedRoles={['admin', 'mozo']}><Pedidos /></ProtectedRoute>} />
              <Route path="/cocina" element={<ProtectedRoute allowedRoles={['admin', 'cocina']}><Cocina /></ProtectedRoute>} />
              <Route path="/market" element={<ProtectedRoute allowedRoles={['admin', 'caja']}><Market /></ProtectedRoute>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ActivityProvider>
    </AuthProvider>
  );
}

export default App;
