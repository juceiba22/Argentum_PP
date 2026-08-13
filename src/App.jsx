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
import Caja from './pages/Caja';
import VentasHome from './pages/VentasHome';
import Facturacion from './pages/Facturacion';
import ConfiguracionFiscal from './pages/ConfiguracionFiscal';
import ConfiguracionMercadoPago from './pages/ConfiguracionMercadoPago';
import Importaciones from './pages/Importaciones';
import PerfilComercio from './pages/PerfilComercio';
import { ActivityProvider } from './context/ActivityContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';


import PaywallScreen from './components/PaywallScreen';

// Componente para proteger y redirigir rutas
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading, hasValidAccess } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor: '#0f172a', color: '#f8fafc' }}>
        <p style={{ fontSize: '1.2rem', fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Validación Centralizada: Si el trial de 15 días expiró y no tiene licencia activa, desplegar Paywall
  if (hasValidAccess === false) {
    return <PaywallScreen />;
  }

  // Fallback seguro de rol si el rol aún es nulo o se está resolviendo
  const effectiveRole = role || user?.user_metadata?.role || 'admin';

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
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
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor: '#0f172a', color: '#f8fafc' }}>
        <p style={{ fontSize: '1.2rem', fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>Cargando...</p>
      </div>
    );
  }
  
  if (user) {
    const effectiveRole = role || user?.user_metadata?.role || 'admin';
    if (effectiveRole === 'ventas') {
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
              <Route path="/mi-comercio" element={<ProtectedRoute allowedRoles={['admin', 'ventas']}><PerfilComercio /></ProtectedRoute>} />
              <Route path="/configuracion-fiscal" element={<ProtectedRoute allowedRoles={['admin']}><ConfiguracionFiscal /></ProtectedRoute>} />
              <Route path="/configuracion-mercadopago" element={<ProtectedRoute allowedRoles={['admin']}><ConfiguracionMercadoPago /></ProtectedRoute>} />
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
              <Route path="/erp/caja" element={<ProtectedRoute allowedRoles={['admin']}><Caja /></ProtectedRoute>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ActivityProvider>
    </AuthProvider>
  );
}

export default App;
