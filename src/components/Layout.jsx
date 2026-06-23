import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, LogOut, Menu, X, Wallet, Package, Store, Megaphone, Truck, ShoppingCart, Activity, BarChart2, Receipt } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { role } = useAuth();

  const navItems = [
    { path: '/clientes', label: 'Clientes', icon: <Users size={20} />, allowed: ['admin'] },
    { path: '/inventario', label: 'Inventario', icon: <Package size={20} />, allowed: ['admin'] },
    { path: '/market', label: 'Mercado', icon: <Store size={20} />, allowed: ['admin'] },
    { path: '/gestion-promociones', label: 'Promociones', icon: <Megaphone size={20} />, allowed: ['admin'] },
    { path: '/erp/proveedores', label: 'Proveedores (ERP)', icon: <Truck size={20} />, allowed: ['admin'] },
    { path: '/erp/compras', label: 'Compras (ERP)', icon: <ShoppingCart size={20} />, allowed: ['admin'] },
    { path: '/erp/dashboard-liquidez', label: 'Cash Flow (ERP)', icon: <Activity size={20} />, allowed: ['admin'] },
    { path: '/erp/gastos', label: 'Gastos (ERP)', icon: <Receipt size={20} />, allowed: ['admin'] },
    { path: '/erp/dashboard-proveedores', label: 'Analítica Prov. (ERP)', icon: <BarChart2 size={20} />, allowed: ['admin'] },
  ];

  const visibleNavItems = navItems.filter(item => item.allowed.includes(role || 'admin'));

  const handleLogout = async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    navigate('/');
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

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="brand-title">Argentum</h2>
          <p className="brand-subtitle">Gestión Interna</p>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {visibleNavItems.map((item) => {
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
                    {item.label}
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
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
