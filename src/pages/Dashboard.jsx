import React, { useEffect, useState } from 'react';
import { Users, ShoppingBag, DollarSign, Clock, UserCheck, PackageCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useActivity } from '../context/ActivityContext';

export default function Dashboard() {
  const { activity } = useActivity();
  const [stats, setStats] = useState({ clientes: 0, pedidos: 0, ingresos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // 1. Conteo total de clientes
        const { count: clientesCount, error: errClientes } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true });
        
        if (errClientes) throw errClientes;

        // 2. Conteo total de pedidos
        const { count: pedidosCount, error: errPedidos } = await supabase
          .from('pedidos')
          .select('*', { count: 'exact', head: true });

        if (errPedidos) throw errPedidos;

        // 3. Suma de ingresos (pedidos NO cancelados)
        const { data: ingresosData, error: errIngresos } = await supabase
          .from('pedidos')
          .select('total')
          .neq('estado', 'Cancelado');

        if (errIngresos) throw errIngresos;

        const ingresos = ingresosData ? ingresosData.reduce((acc, curr) => acc + Number(curr.total), 0) : 0;

        setStats({
          clientes: clientesCount || 0,
          pedidos: pedidosCount || 0,
          ingresos
        });
      } catch (error) {
        console.error("Error cargando estadísticas de Supabase:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Clientes Totales', value: loading ? '...' : stats.clientes, icon: <Users size={24} />, color: '#3b82f6' },
    { title: 'Pedidos Totales', value: loading ? '...' : stats.pedidos, icon: <ShoppingBag size={24} />, color: '#8b5cf6' },
    { title: 'Ingresos Netos', value: loading ? '...' : `$${stats.ingresos.toLocaleString()}`, icon: <DollarSign size={24} />, color: '#10b981' },
  ];

  const formatearHora = (fecha) => {
    return fecha ? fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Resumen en tiempo real conectado a Supabase</p>
      </header>

      {/* ESTADÍSTICAS REALES */}
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
      
      {/* BITÁCORA DE ACTIVIDAD (CONTEXTO GLOBAL) */}
      <div style={{ marginTop: '40px' }} className="glass-panel">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Bitácora de Actividad Reciente (Sesión Actual)</h3>
        </div>
        
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          
          {/* Bloque 1: Último Cliente */}
          <div className="card-dark" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              <UserCheck size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Último Cliente Creado</span>
            </div>
            {activity.ultimoCliente ? (
              <div>
                <p className="text-white" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{activity.ultimoCliente.nombre}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{activity.ultimoCliente.email}</p>
                <code className="code-dark" style={{ display: 'block', marginTop: '8px', fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>ID: {activity.ultimoCliente.id.substring(0,8)}...</code>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>{formatearHora(activity.ultimoCliente.time)}</p>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No se han creado clientes en esta sesión.</p>
            )}
          </div>

          {/* Bloque 2: Último Pedido */}
          <div className="card-dark" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              <PackageCheck size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Último Pedido Generado</span>
            </div>
            {activity.ultimoPedido ? (
              <div>
                <p className="text-white" style={{ fontWeight: 600, fontSize: '1.1rem' }}>Total: ${Number(activity.ultimoPedido.total).toLocaleString()}</p>
                <div style={{ marginTop: '8px' }}>
                  <span className={`badge badge-${activity.ultimoPedido.estado.toLowerCase()}`}>{activity.ultimoPedido.estado}</span>
                </div>
                <code className="code-dark" style={{ display: 'block', marginTop: '8px', fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>ID: {activity.ultimoPedido.id.substring(0,8)}...</code>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>{formatearHora(activity.ultimoPedido.time)}</p>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No se han generado pedidos en esta sesión.</p>
            )}
          </div>

          {/* Bloque 3: Última Actualización */}
          <div className="card-dark" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              <RefreshCw size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Última Actualización</span>
            </div>
            {activity.ultimaActualizacion ? (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Nuevo Estado:</p>
                <span className={`badge badge-${activity.ultimaActualizacion.estado.toLowerCase()}`}>{activity.ultimaActualizacion.estado}</span>
                <code className="code-dark" style={{ display: 'block', marginTop: '16px', fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>ID: {activity.ultimaActualizacion.id.substring(0,8)}...</code>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>{formatearHora(activity.ultimaActualizacion.time)}</p>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No se han actualizado pedidos en esta sesión.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
