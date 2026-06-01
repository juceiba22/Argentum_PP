import React, { useEffect, useState } from 'react';
import { ChefHat, Check, RefreshCw, BellRing } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { updateEstadoPedido } from '../services/pedidosApi';
import { useActivity } from '../context/ActivityContext';

export default function Cocina() {
  const { logActualizacion } = useActivity();
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [despachando, setDespachando] = useState(null);
  const [alertaNueva, setAlertaNueva] = useState(false);

  const reproducirSonidoCampana = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // Sonido tipo "Ding"
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) {
      console.warn('El navegador bloqueó el audio automático', e);
    }
  };

  const cargarComandas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          items_pedido (*)
        `)
        .in('estado', ['Pendiente', 'Pagado'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComandas(data || []);
    } catch (error) {
      console.error("Error al cargar comandas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarComandas();
    
    // Suscripción Realtime a Inserciones (Nuevos Pedidos)
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, (payload) => {
        reproducirSonidoCampana();
        setAlertaNueva(true);
        setTimeout(() => setAlertaNueva(false), 4000); // Apagar alerta visual a los 4s
        cargarComandas();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, () => {
        cargarComandas(); // Recargar si un estado se actualiza externamente
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDespachar = async (pedidoId) => {
    setDespachando(pedidoId);
    try {
      await updateEstadoPedido(pedidoId, 'Enviado'); 
      logActualizacion({ id: pedidoId, estado: 'Enviado' });
      setComandas(prev => prev.filter(c => c.id !== pedidoId));
    } catch (error) {
      console.error("Error al despachar:", error);
      alert("No se pudo despachar el pedido");
    } finally {
      setDespachando(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Tablero de Cocina</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Visualización de comandas activas en tiempo real</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {alertaNueva && (
            <div style={{ background: 'var(--warning)', color: 'white', padding: '8px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'pulse 1.5s infinite' }}>
              <BellRing size={18} /> ¡Nueva Comanda!
            </div>
          )}
          <button onClick={cargarComandas} className="btn btn-secondary">
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
      </header>

      {/* Agregar animación de pulso al CSS si no existe globalmente */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(210, 142, 61, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(210, 142, 61, 0); }
          100% { box-shadow: 0 0 0 0 rgba(210, 142, 61, 0); }
        }
      `}</style>

      {loading && comandas.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Cargando comandas en tiempo real...
        </div>
      ) : comandas.length === 0 ? (
        <div className="card-dark" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
          <ChefHat size={64} color="var(--glass-border)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Sin comandas activas</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Excelente trabajo, la cocina está al día.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
          {comandas.map(comanda => (
            <div key={comanda.id} className="glass-panel animate-fade-in" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${comanda.estado === 'Pendiente' ? 'var(--warning)' : 'var(--accent-primary)'}` }}>
              
              <div className="card-dark" style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Ubicación</p>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {comanda.mesa ? `Mesa ${comanda.mesa}` : 'S/D'}
                  </span>
                  <code className="code-dark" style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px' }}>{comanda.id.substring(0,6).toUpperCase()}</code>
                </div>
                <span className={`badge badge-${comanda.estado.toLowerCase()}`}>{comanda.estado}</span>
              </div>

              <div style={{ padding: '20px', flex: 1 }}>
                {(!comanda.items_pedido || comanda.items_pedido.length === 0) ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin ítems registrados.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {comanda.items_pedido.map(item => (
                      <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', fontSize: '1.05rem' }}>
                        <span style={{ fontWeight: 600 }}>{item.producto_nombre}</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(197, 160, 89, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>x{item.cantidad}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--glass-border)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hora de ingreso:</span>
                  <span>{new Date(comanda.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'var(--card-bg)' }}>
                <button 
                  onClick={() => handleDespachar(comanda.id)} 
                  className="btn btn-primary" 
                  style={{ width: '100%', background: 'var(--success)', border: 'none', color: 'white', display: 'flex', gap: '8px' }}
                  disabled={despachando === comanda.id}
                >
                  <Check size={18} /> {despachando === comanda.id ? 'Despachando...' : 'Despachar a Salón'}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
