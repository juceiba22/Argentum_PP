import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, LogOut, Menu, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/clientes', label: 'Clientes', icon: <Users size={20} /> },
    { path: '/pedidos', label: 'Pedidos', icon: <ShoppingBag size={20} /> },
  ];

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
            {navItems.map((item) => {
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
