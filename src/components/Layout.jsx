import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, LogOut, Menu, X, Wallet, Package, Store, Megaphone, Truck, ShoppingCart, Activity, BarChart2, Receipt, UploadCloud, List, PieChart, MessageSquare, ShieldCheck, CreditCard, Building2, Beef, BadgeCheck, KeyRound } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { esAdminPlataforma } from '../services/licenciasApi';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (label) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const { user, role, isTrialActive, isLicenseActive, daysRemainingTrial, tenantInfo } = useAuth();

  // Solo el equipo de Argentum ve el panel de licencias (la base lo valida igual).
  const [adminPlataforma, setAdminPlataforma] = useState(false);
  useEffect(() => {
    let vigente = true;
    if (user) esAdminPlataforma().then(ok => { if (vigente) setAdminPlataforma(ok); });
    return () => { vigente = false; };
  }, [user]);

  const navItems = [
    // Suelta fuera de grupos
    { path: '/ventas-home', label: 'Inicio de Mostrador', icon: <Store size={20} />, allowed: ['ventas', 'admin'] },
    { path: '/licencia', label: 'Mi Licencia', icon: <BadgeCheck size={20} />, allowed: ['admin'] },
    
    // Grupo 1: Mostrador
    { 
      label: 'Mostrador', 
      icon: <Store size={20} />, 
      allowed: ['admin', 'ventas'],
      subItems: [
        { path: '/mi-comercio', label: 'Mi Carnicería', icon: <Building2 size={20} />, allowed: ['admin'] },
        { path: '/equipo', label: 'Mi Equipo', icon: <Users size={20} />, allowed: ['admin'] },
        { path: '/clientes', label: 'Clientes', icon: <Users size={20} />, allowed: ['admin'] },
        { path: '/gestion-promociones', label: 'Promociones', icon: <Megaphone size={20} />, allowed: ['admin'] },
        { path: '/market', label: 'Caja Mostrador (POS)', icon: <Store size={20} />, allowed: ['admin', 'ventas'] },
        { path: '/configuracion-mercadopago', label: 'Config. MP Point', icon: <CreditCard size={20} />, allowed: ['admin'] }
      ]
    },

    // Grupo 2: Contabilidad
    { 
      label: 'Contabilidad', 
      icon: <Wallet size={20} />, 
      allowed: ['admin'],
      subItems: [
        { path: '/erp/dashboard-liquidez', label: 'Ingresos/Egresos', icon: <Activity size={20} />, allowed: ['admin'] },
        { path: '/facturacion', label: 'Ventas (ARCA)', icon: <Receipt size={20} />, allowed: ['admin'] },
        { path: '/configuracion-fiscal', label: 'Config. Fiscal ARCA', icon: <ShieldCheck size={20} />, allowed: ['admin'] },
        { path: '/importaciones', label: 'IIBB (IVA)', icon: <UploadCloud size={20} />, allowed: ['admin'] },
        { path: '/erp/compras', label: 'Compras', icon: <ShoppingCart size={20} />, allowed: ['admin'] },
        { path: '/erp/gastos', label: 'Gastos', icon: <Receipt size={20} />, allowed: ['admin'] },
        { path: '/erp/caja', label: 'Caja', icon: <List size={20} />, allowed: ['admin'] }
      ]
    },

    // Grupo 3: Stock e Inventario
    { 
      label: 'Stock y Cortes', 
      icon: <Package size={20} />, 
      allowed: ['admin'],
      subItems: [
        { path: '/erp/proveedores', label: 'Proveedores / Frigoríficos', icon: <Truck size={20} />, allowed: ['admin'] },
        { path: '/desposte', label: 'Desposte Media Res', icon: <Beef size={20} />, allowed: ['admin'] },
        { path: '/inventario', label: 'Inventario de Cortes', icon: <Package size={20} />, allowed: ['admin'] }
      ]
    },

    // Grupo 4: Estadísticas
    { 
      label: 'Estadísticas', 
      icon: <PieChart size={20} />, 
      allowed: ['admin'],
      subItems: [
        { path: '/erp/dashboard-proveedores', label: 'Estadísticas de la Carnicería', icon: <BarChart2 size={20} />, allowed: ['admin'] },
        { path: '/erp/calculadora-costos', label: 'Costo Real por Kg', icon: <BarChart2 size={20} />, allowed: ['admin'] }
      ]
    },
    ...(adminPlataforma ? [
      { path: '/admin/licencias', label: 'Licencias (Admin)', icon: <KeyRound size={20} />, allowed: ['admin', 'ventas'] }
    ] : [])
  ];

  const currentRole = role || 'admin';

  // Últimos 3 días de prueba sin licencia: aviso arriba de todas las pantallas
  // (menos en Mi Licencia, donde ya está el panel de pago).
  const avisoVencimiento = isTrialActive && !isLicenseActive && daysRemainingTrial <= 3
    && currentRole !== 'ventas' && !location.pathname.startsWith('/licencia');
  const visibleNavItems = navItems
    .filter(item => item.allowed.includes(currentRole))
    .map(item => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter(sub => sub.allowed.includes(currentRole))
        };
      }
      return item;
    })
    .filter(item => !item.subItems || item.subItems.length > 0);

  const handleLogout = async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <h2 className="brand-title">Argentum</h2>
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {isSidebarCollapsed ? '>' : '<'}
        </button>
        
        <div className="sidebar-header">
          <h2 className="brand-title">Argentum</h2>
          <p className="brand-subtitle">Gestión para Carnicerías</p>

          {tenantInfo && (
            <Link
              to={currentRole === 'ventas' ? '/ventas-home' : '/mi-comercio'}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'block',
                marginTop: '14px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.08)',
                textDecoration: 'none',
                color: 'inherit'
              }}
              title="Ver perfil de la carnicería"
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tenantInfo.nombre_comercio || 'Mi carnicería'}
              </div>
              {tenantInfo.rubro && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {tenantInfo.rubro}
                </div>
              )}
            </Link>
          )}

          {isTrialActive && !isLicenseActive && (
            <Link to="/licencia" onClick={() => setMobileMenuOpen(false)} title="Activar licencia" style={{
              textDecoration: 'none',
              marginTop: '10px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(142, 27, 27, 0.15)',
              border: '1px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>⚡ Prueba: {daysRemainingTrial} {daysRemainingTrial === 1 ? 'día' : 'días'} · <u>Activar licencia</u></span>
            </Link>
          )}
        </div>

        <nav className="sidebar-nav">
          <ul>
            {visibleNavItems.map((item) => {
              if (item.subItems) {
                const isExpanded = expandedMenus[item.label];
                return (
                  <li key={item.label}>
                    <div 
                      className="sidebar-link"
                      onClick={() => toggleSubmenu(item.label)}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="link-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: '0.8rem' }}>▼</span>
                    </div>
                    {isExpanded && (
                      <ul style={{ paddingLeft: '16px', listStyle: 'none', marginTop: '4px' }}>
                        {item.subItems.map(subItem => {
                          const isActive = location.pathname.startsWith(subItem.path);
                          return (
                            <li key={subItem.path} style={{ marginBottom: '4px' }}>
                              <Link 
                                to={subItem.path} 
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileMenuOpen(false)}
                                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                              >
                                <span className="link-icon" style={{ marginRight: '8px' }}>{subItem.icon}</span>
                                {subItem.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="link-icon">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={handleLogout} 
            className="sidebar-link logout-link" 
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            title="Cerrar Sesión"
          >
            <span className="link-icon"><LogOut size={20} /></span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      <main className="main-content">
        {avisoVencimiento && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
            padding: '12px 18px', marginBottom: '24px', borderRadius: '12px',
            background: 'var(--accent-soft)', border: '1px solid rgba(142, 27, 27, 0.25)'
          }}>
            <span style={{ fontWeight: 600 }}>
              {daysRemainingTrial <= 1
                ? 'Hoy es el último día de tu prueba gratuita.'
                : `Te quedan ${daysRemainingTrial} días de prueba gratuita.`}
              {' '}Activá tu licencia para no cortar la venta.
            </span>
            <Link to="/licencia" className="btn btn-primary" style={{ minHeight: '40px', padding: '0 20px', fontSize: '0.92rem' }}>
              Activar licencia
            </Link>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
