import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Clientes from './pages/Clientes';
import Inventario from './pages/Inventario';
import DesposteMediaRes from './pages/DesposteMediaRes';
import MiLicencia from './pages/MiLicencia';
import AdminLicencias from './pages/AdminLicencias';
import MiEquipo from './pages/MiEquipo';
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
import { hayIntencionCompra } from './utils/intencionCompra';
import './index.css';


import PaywallScreen from './components/PaywallScreen';
import RubroGate from './components/RubroGate';

// Componente para proteger y redirigir rutas
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading, hasValidAccess, tenantId, tenantInfo } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <p style={{ fontSize: '1.2rem', fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Validación Centralizada: Si el trial de 15 días expiró y no tiene licencia activa, desplegar Paywall
  if (hasValidAccess === false) {
    return <PaywallScreen />;
  }

  // Un alta por "Continuar con Google" nunca pasa por OnboardingWizard, así
  // que nadie le pidió el rubro de su comercio: tenants.rubro queda en null
  // y el catálogo inicial de productos nunca se siembra (ver AuthContext,
  // paso 3.6). Bloqueamos el resto de la app hasta que lo elija.
  if (tenantId && tenantInfo && !tenantInfo.rubro) {
    return <RubroGate />;
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

const PantallaCargando = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
    <p style={{ fontSize: '1.2rem', fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>Cargando...</p>
  </div>
);

// Pantalla de inicio de la app según el rol del usuario logueado.
const HomeSegunRol = ({ user, role }) => {
  const { isLicenseActive } = useAuth();
  const effectiveRole = role || user?.user_metadata?.role || 'admin';
  if (effectiveRole === 'ventas') {
    return <Navigate to="/ventas-home" replace />;
  }
  // Entró desde "Comprar la licencia" de la landing: directo al pago.
  if (!isLicenseActive && hayIntencionCompra(user)) {
    return <Navigate to="/licencia?comprar=1" replace />;
  }
  return <Navigate to="/market" replace />; // POS por defecto para admin
};

// "/": landing pública para visitantes; si ya hay sesión, directo a la app.
const LandingRedirect = () => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PantallaCargando />;
  if (user) return <HomeSegunRol user={user} role={role} />;

  // "Continuar con Google" vuelve siempre a "/" (es la URL autorizada en
  // Supabase). Si vuelve con error, lo derivamos al login con los mismos
  // parámetros para que Login.jsx lo muestre.
  if (/(^|[?#&])error(_code|_description)?=/.test(`${location.search}${location.hash}`)) {
    return <Navigate to={`/login${location.search}${location.hash}`} replace />;
  }

  return <Landing />;
};

// "/login": formulario de ingreso y alta; si ya hay sesión, directo a la app.
const LoginRedirect = () => {
  const { user, role, loading } = useAuth();

  if (loading) return <PantallaCargando />;
  if (user) return <HomeSegunRol user={user} role={role} />;

  return <Login />;
};

function App() {
  return (
    <AuthProvider>
      <ActivityProvider>
        <Router>
          <Routes>
            {/* Rutas Públicas (Landing y Login) */}
            <Route path="/" element={<LandingRedirect />} />
            <Route path="/login" element={<LoginRedirect />} />
            
            {/* Ruta Pública de Promociones */}
            <Route path="/promociones" element={<PromocionesPublicas />} />
            
            {/* Rutas Protegidas (Requieren Sesión) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/clientes" element={<ProtectedRoute allowedRoles={['admin']}><Clientes /></ProtectedRoute>} />
              <Route path="/facturacion" element={<ProtectedRoute allowedRoles={['admin']}><Facturacion /></ProtectedRoute>} />
              <Route path="/mi-comercio" element={<ProtectedRoute allowedRoles={['admin']}><PerfilComercio /></ProtectedRoute>} />
              <Route path="/equipo" element={<ProtectedRoute allowedRoles={['admin']}><MiEquipo /></ProtectedRoute>} />
              <Route path="/configuracion-fiscal" element={<ProtectedRoute allowedRoles={['admin']}><ConfiguracionFiscal /></ProtectedRoute>} />
              <Route path="/configuracion-mercadopago" element={<ProtectedRoute allowedRoles={['admin']}><ConfiguracionMercadoPago /></ProtectedRoute>} />
              <Route path="/importaciones" element={<ProtectedRoute allowedRoles={['admin']}><Importaciones /></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute allowedRoles={['admin']}><Inventario /></ProtectedRoute>} />
              <Route path="/licencia" element={<ProtectedRoute allowedRoles={['admin', 'ventas']}><MiLicencia /></ProtectedRoute>} />
              <Route path="/admin/licencias" element={<ProtectedRoute><AdminLicencias /></ProtectedRoute>} />
              <Route path="/desposte" element={<ProtectedRoute allowedRoles={['admin']}><DesposteMediaRes /></ProtectedRoute>} />
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
