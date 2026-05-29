import React, { useEffect, useState } from 'react';
import { Users, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { getClientes, getPedidos } from '../services/mockData';

export default function Dashboard() {
  const [stats, setStats] = useState({ clientes: 0, pedidos: 0, ingresos: 0 });

  useEffect(() => {
    Promise.all([getClientes(), getPedidos()]).then(([clientesData, pedidosData]) => {
      const ingresos = pedidosData.filter(p => p.estado !== 'Cancelado').reduce((acc, curr) => acc + curr.total, 0);
      setStats({
        clientes: clientesData.length,
        pedidos: pedidosData.length,
        ingresos
      });
    });
  }, []);

  const statCards = [
    { title: 'Clientes Totales', value: stats.clientes, icon: <Users size={24} />, color: '#3b82f6' },
    { title: 'Pedidos', value: stats.pedidos, icon: <ShoppingBag size={24} />, color: '#8b5cf6' },
    { title: 'Ingresos Totales', value: `$${stats.ingresos.toLocaleString()}`, icon: <DollarSign size={24} />, color: '#10b981' },
    { title: 'Crecimiento', value: '+12.5%', icon: <TrendingUp size={24} />, color: '#f59e0b' },
  ];

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Resumen general de tu negocio</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {statCards.map((stat, index) => (
          <div key={index} className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              background: `rgba(${parseInt(stat.color.slice(1,3), 16)}, ${parseInt(stat.color.slice(3,5), 16)}, ${parseInt(stat.color.slice(5,7), 16)}, 0.15)`,
              color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>{stat.title}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '40px' }} className="glass-panel">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Actividad Reciente</h3>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p>Gráficos y reportes se mostrarán aquí</p>
        </div>
      </div>
    </div>
  );
}
