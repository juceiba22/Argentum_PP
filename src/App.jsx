import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import Inventario from './pages/Inventario';
import Market from './pages/Market';
import GestionPromociones from './pages/GestionPromociones';
import PromocionesPublicas from './pages/PromocionesPublicas';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import Gastos from './pages/Gastos';
import CalculadoraCostos from './pages/CalculadoraCostos';
import DashboardProveedores from './pages/DashboardProveedores';
import DashboardLiquidez from './pages/DashboardLiquidez';
import VentasHome from './pages/VentasHome';
import Facturacion from './pages/Facturacion';
import Importaciones from './pages/Importaciones';
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
    return (
      <div style={{ padding: '40px', textAlign: 'center', marginTop: '100px' }}>
        <h2>Acceso Denegado</h2>
        <p>No tienes los permisos necesarios para ver esta pantalla.</p>
      </div>
    );
  }

  return children;
};

// Componente para manejar la redirección post-login
const LoginRedirect = () => {
  const { user, role } = useAuth();
  
  if (user) {
    if (role === 'ventas') {
      return <Navigate to="/ventas-home" replace />;
    }
    return <Navigate to="/market" replace />; // POS por defecto para admin
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
              <Route path="/clientes" element={<ProtectedRoute allowedRoles={['admin']}><Clientes /></ProtectedRoute>} />
              <Route path="/facturacion" element={<ProtectedRoute allowedRoles={['admin']}><Facturacion /></ProtectedRoute>} />
              <Route path="/importaciones" element={<ProtectedRoute allowedRoles={['admin']}><Importaciones /></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute allowedRoles={['admin']}><Inventario /></ProtectedRoute>} />
              <Route path="/market" element={<ProtectedRoute allowedRoles={['admin', 'ventas']}><Market /></ProtectedRoute>} />
              <Route path="/ventas-home" element={<ProtectedRoute allowedRoles={['admin', 'ventas']}><VentasHome /></ProtectedRoute>} />
              <Route path="/gestion-promociones" element={<ProtectedRoute allowedRoles={['admin']}><GestionPromociones /></ProtectedRoute>} />
              {/* ERP Rutas */}
              <Route path="/erp/proveedores" element={<ProtectedRoute allowedRoles={['admin']}><Proveedores /></ProtectedRoute>} />
              <Route path="/erp/compras" element={<ProtectedRoute allowedRoles={['admin']}><Compras /></ProtectedRoute>} />
              <Route path="/erp/gastos" element={<ProtectedRoute allowedRoles={['admin']}><Gastos /></ProtectedRoute>} />
              <Route path="/erp/calculadora-costos" element={<ProtectedRoute allowedRoles={['admin']}><CalculadoraCostos /></ProtectedRoute>} />
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
