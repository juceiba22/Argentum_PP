import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, LogOut, Menu, X, Wallet, Package, Store, Megaphone, Truck, ShoppingCart, Activity, BarChart2, Receipt } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (label) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const { role } = useAuth();

  const navItems = [
    { path: '/clientes', label: 'Clientes', icon: <Users size={20} />, allowed: ['admin'] },
    { path: '/market', label: 'Mercado', icon: <Store size={20} />, allowed: ['admin'] },
    { path: '/gestion-promociones', label: 'Promociones', icon: <Megaphone size={20} />, allowed: ['admin'] },
    { 
      label: 'Compras e Inventario', 
      icon: <Package size={20} />, 
      allowed: ['admin'],
      subItems: [
        { path: '/erp/compras', label: 'Compras', icon: <ShoppingCart size={20} />, allowed: ['admin'] },
        { path: '/erp/proveedores', label: 'Proveedores ERP', icon: <Truck size={20} />, allowed: ['admin'] },
        { path: '/inventario', label: 'Inventario', icon: <Package size={20} />, allowed: ['admin'] }
      ]
    },
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
                        {item.label}
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
