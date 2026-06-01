import React, { useEffect, useState } from 'react';
import { Users, ShoppingBag, DollarSign, Clock, UserCheck, PackageCheck, RefreshCw, BellRing, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useActivity } from '../context/ActivityContext';
import { updateEstadoPedido } from '../services/pedidosApi';

export default function Dashboard() {
  const { activity } = useActivity();
  const [stats, setStats] = useState({ clientes: 0, pedidos: 0, ingresos: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // --- Estados de Caja ---
  const [cobrosPendientes, setCobrosPendientes] = useState([]);
  const [alertaCaja, setAlertaCaja] = useState('');
  const [procesandoCobro, setProcesandoCobro] = useState(null);

  const reproducirSonidoCaja = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio bloqueado', e);
    }
  };

  const fetchDashboardData = async () => {
    setLoadingStats(true);
    try {
      // 1. Estadísticas Globales
      const { count: clientesCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
      const { count: pedidosCount } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
      const { data: ingresosData } = await supabase.from('pedidos').select('total').neq('estado', 'Cancelado');
      
      const ingresos = ingresosData ? ingresosData.reduce((acc, curr) => acc + Number(curr.total), 0) : 0;
      setStats({ clientes: clientesCount || 0, pedidos: pedidosCount || 0, ingresos });

      // 2. Cobros Pendientes
      const { data: cobrosData } = await supabase
        .from('pedidos')
        .select('*')
        .eq('estado', 'Por Cobrar')
        .order('updated_at', { ascending: false });
      
      setCobrosPendientes(cobrosData || []);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Escuchar tiempo real para alertas de Caja
    const channel = supabase
      .channel('caja-dashboard-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        if (payload.new.estado === 'Por Cobrar' && payload.old.estado !== 'Por Cobrar') {
          reproducirSonidoCaja();
          setAlertaCaja(`¡Mesa ${payload.new.mesa || 'S/D'} solicitó la cuenta!`);
          setTimeout(() => setAlertaCaja(''), 8000);
        }
        fetchDashboardData(); // Refrescar stats y cobros
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCobrar = async (id) => {
    setProcesandoCobro(id);
    try {
      await updateEstadoPedido(id, 'Pagado');
      setCobrosPendientes(prev => prev.filter(c => c.id !== id));
      fetchDashboardData(); // Refrescar ingresos
    } catch (error) {
      console.error("Error al cobrar:", error);
      alert('Error procesando el cobro');
    } finally {
      setProcesandoCobro(null);
    }
  };

  const statCards = [
    { title: 'Clientes Totales', value: loadingStats ? '...' : stats.clientes, icon: <Users size={24} />, color: '#3b82f6' },
    { title: 'Pedidos Totales', value: loadingStats ? '...' : stats.pedidos, icon: <ShoppingBag size={24} />, color: '#8b5cf6' },
    { title: 'Ingresos Netos', value: loadingStats ? '...' : `$${stats.ingresos.toLocaleString()}`, icon: <DollarSign size={24} />, color: '#10b981' },
  ];

  const formatearHora = (fecha) => {
    return fecha ? fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Dashboard Financiero</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Resumen en tiempo real y módulo de Caja</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {alertaCaja && (
            <div style={{ background: 'var(--danger)', color: 'white', padding: '8px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'pulse 1.5s infinite' }}>
              <BellRing size={18} /> {alertaCaja}
            </div>
          )}
          <button onClick={fetchDashboardData} className="btn btn-secondary">
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
      </header>

      {/* COBROS PENDIENTES (CAJA) */}
      {cobrosPendientes.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: '32px', border: '2px solid var(--warning)' }}>
          <div style={{ padding: '20px', background: 'rgba(210, 142, 61, 0.05)', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={24} color="var(--warning)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning)' }}>Cuentas por Cobrar</h3>
          </div>
          <div style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {cobrosPendientes.map(pedido => (
              <div key={pedido.id} className="card-dark" style={{ width: '300px', padding: '20px', borderRadius: '8px', borderLeft: '4px solid var(--warning)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mesa</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{pedido.mesa || 'S/D'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>${Number(pedido.total).toLocaleString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleCobrar(pedido.id)}
                  disabled={procesandoCobro === pedido.id}
                  className="btn btn-primary" 
                  style={{ width: '100%', background: 'var(--success)', border: 'none', color: 'white', display: 'flex', gap: '8px' }}
                >
                  <Check size={18} /> {procesandoCobro === pedido.id ? 'Procesando...' : 'Marcar como Pagado'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

          <div className="card-dark" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              <PackageCheck size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Último Pedido Generado</span>
            </div>
            {activity.ultimoPedido ? (
              <div>
                <p className="text-white" style={{ fontWeight: 600, fontSize: '1.1rem' }}>Total: ${Number(activity.ultimoPedido.total).toLocaleString()}</p>
                <div style={{ marginTop: '8px' }}>
                  <span className={`badge badge-${activity.ultimoPedido.estado.toLowerCase().replace(' ', '-')}`}>{activity.ultimoPedido.estado}</span>
                </div>
                <code className="code-dark" style={{ display: 'block', marginTop: '8px', fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>ID: {activity.ultimoPedido.id.substring(0,8)}...</code>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>{formatearHora(activity.ultimoPedido.time)}</p>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No se han generado pedidos en esta sesión.</p>
            )}
          </div>

          <div className="card-dark" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              <RefreshCw size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Última Actualización</span>
            </div>
            {activity.ultimaActualizacion ? (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Nuevo Estado:</p>
                <span className={`badge badge-${activity.ultimaActualizacion.estado.toLowerCase().replace(' ', '-')}`}>{activity.ultimaActualizacion.estado}</span>
                <code className="code-dark" style={{ display: 'block', marginTop: '16px', fontSize: '0.75rem', padding: '4px', borderRadius: '4px' }}>ID: {activity.ultimaActualizacion.id.substring(0,8)}...</code>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>{formatearHora(activity.ultimaActualizacion.time)}</p>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No se han actualizado pedidos en esta sesión.</p>
            )}
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(183, 65, 52, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(183, 65, 52, 0); }
          100% { box-shadow: 0 0 0 0 rgba(183, 65, 52, 0); }
        }
      `}</style>
    </div>
  );
}
