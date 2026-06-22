import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import RegistrosCaja from './pages/RegistrosCaja';
import Inventario from './pages/Inventario';
import Market from './pages/Market';
import GestionPromociones from './pages/GestionPromociones';
import PromocionesPublicas from './pages/PromocionesPublicas';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import DashboardProveedores from './pages/DashboardProveedores';
import DashboardLiquidez from './pages/DashboardLiquidez';
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
    return <Navigate to="/" replace />;
  }

  return children;
};

// Componente para manejar la redirección post-login
const LoginRedirect = () => {
  const { user, role } = useAuth();
  
  if (user) {
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
            
            {/* Ruta Pública de Promociones */}
            <Route path="/promociones" element={<PromocionesPublicas />} />
            
            {/* Rutas Protegidas (Requieren Sesión) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute allowedRoles={['admin']}><Clientes /></ProtectedRoute>} />
              <Route path="/registros" element={<ProtectedRoute allowedRoles={['admin']}><RegistrosCaja /></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute allowedRoles={['admin']}><Inventario /></ProtectedRoute>} />
              <Route path="/market" element={<ProtectedRoute allowedRoles={['admin']}><Market /></ProtectedRoute>} />
              <Route path="/gestion-promociones" element={<ProtectedRoute allowedRoles={['admin']}><GestionPromociones /></ProtectedRoute>} />
              {/* ERP Rutas */}
              <Route path="/erp/proveedores" element={<ProtectedRoute allowedRoles={['admin']}><Proveedores /></ProtectedRoute>} />
              <Route path="/erp/compras" element={<ProtectedRoute allowedRoles={['admin']}><Compras /></ProtectedRoute>} />
              <Route path="/erp/dashboard-proveedores" element={<ProtectedRoute allowedRoles={['admin']}><DashboardProveedores /></ProtectedRoute>} />
              <Route path="/erp/dashboard-liquidez" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLiquidez /></ProtectedRoute>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ActivityProvider>
    </AuthProvider>
  );
}

export default App;
