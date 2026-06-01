import React, { useEffect, useState } from 'react';
import { Plus, Edit, RefreshCw, AlertCircle, CheckCircle2, Trash2, Calculator, Check, DollarSign, XCircle, BellRing, CreditCard } from 'lucide-react';
import { getTodosLosPedidos, createPedidoCompleto, updateEstadoPedido, updateCobroPedido } from '../services/pedidosApi';
import { cobrarConPoint } from '../services/mercadoPagoApi';
import { useActivity } from '../context/ActivityContext';
import { supabase } from '../services/supabaseClient';

const MENU_RESTAURANTE = [
  // Platos
  { id: 1, nombre: 'Ostras Frescas al Limón', precio: 25.50, categoria: 'Platos' },
  { id: 2, nombre: 'Ceviche de Salmón Rosado', precio: 32.00, categoria: 'Platos' },
  { id: 3, nombre: 'Risotto de Hongos Trufados', precio: 45.00, categoria: 'Platos' },
  { id: 4, nombre: 'Bife de Chorizo Angus (400g)', precio: 68.00, categoria: 'Platos' },
  { id: 5, nombre: 'Merluza Negra a la Mantequilla', precio: 75.00, categoria: 'Platos' },
  { id: 7, nombre: 'Tiramisú Clásico Italiano', precio: 18.00, categoria: 'Platos' },
  // Bebidas
  { id: 6, nombre: 'Vino Tinto Malbec Gran Reserva', precio: 120.00, categoria: 'Bebidas' },
  { id: 8, nombre: 'Café Espresso Doble', precio: 6.00, categoria: 'Bebidas' },
  { id: 9, nombre: 'Jugo Natural de Naranja', precio: 8.00, categoria: 'Bebidas' },
  { id: 10, nombre: 'Agua Mineral San Pellegrino', precio: 5.00, categoria: 'Bebidas' },
  { id: 11, nombre: 'Gaseosa Cola / Lima Limón', precio: 4.50, categoria: 'Bebidas' },
  { id: 12, nombre: 'Gin Tonic de Autor', precio: 15.00, categoria: 'Bebidas' }
];

export default function Pedidos() {
  const { logPedido, logActualizacion } = useActivity();
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // --- Estados: Crear Pedido ---
  const [mesa, setMesa] = useState('');
  const [nuevoItems, setNuevoItems] = useState([{ producto_nombre: '', precio_unitario: '', cantidad: 1 }]);
  const [creando, setCreando] = useState(false);
  const [crearError, setCrearError] = useState('');
  const [crearExito, setCrearExito] = useState('');

  // --- Alertas Mozo ---
  const [alertaMozo, setAlertaMozo] = useState('');
  
  // --- Estados: Mercado Pago (Simulado) ---
  const [procesandoCobroPoint, setProcesandoCobroPoint] = useState(null);
  const [qrPago, setQrPago] = useState(null);

  const reproducirSonidoCampana = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('El navegador bloqueó el audio automático', e);
    }
  };

  const cargarPedidos = async () => {
    setLoadingPedidos(true);
    try {
      const data = await getTodosLosPedidos();
      setPedidos(data);
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    cargarPedidos();

    const channel = supabase
      .channel('mozo-pedidos-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        if (payload.new.estado === 'Enviado' && payload.old.estado !== 'Enviado') {
          reproducirSonidoCampana();
          setAlertaMozo(`¡Mesa ${payload.new.mesa || 'S/D'} lista para retirar!`);
          setTimeout(() => setAlertaMozo(''), 6000);
        }
        cargarPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Handlers: Crear Pedido ---
  const handleAgregarItem = () => {
    setNuevoItems([...nuevoItems, { producto_nombre: '', precio_unitario: '', cantidad: 1 }]);
  };

  const handleEliminarItem = (index) => {
    if (nuevoItems.length > 1) {
      const actualizados = nuevoItems.filter((_, i) => i !== index);
      setNuevoItems(actualizados);
    }
  };

  const handleProductoChange = (index, nombreProducto) => {
    const productoInfo = MENU_RESTAURANTE.find(p => p.nombre === nombreProducto);
    const actualizados = [...nuevoItems];
    actualizados[index].producto_nombre = nombreProducto;
    if (productoInfo) {
      actualizados[index].precio_unitario = productoInfo.precio;
    }
    setNuevoItems(actualizados);
  };

  const handleCantidadChange = (index, cantidad) => {
    const actualizados = [...nuevoItems];
    actualizados[index].cantidad = cantidad;
    setNuevoItems(actualizados);
  };

  const calcularTotal = () => {
    return nuevoItems.reduce((acc, item) => acc + (Number(item.precio_unitario) || 0) * (Number(item.cantidad) || 0), 0);
  };

  const handleCrearPedido = async (e) => {
    e.preventDefault();
    setCreando(true);
    setCrearError('');
    setCrearExito('');

    if (!mesa) {
      setCrearError('Debes seleccionar un número de mesa.');
      setCreando(false);
      return;
    }

    for (let item of nuevoItems) {
      if (!item.producto_nombre || !item.precio_unitario || !item.cantidad) {
        setCrearError('Todos los ítems deben tener un producto seleccionado y cantidad válida.');
        setCreando(false);
        return;
      }
    }

    try {
      const pedidoData = await createPedidoCompleto(mesa, nuevoItems);
      setCrearExito('¡Comanda enviada a cocina!');
      logPedido({ id: pedidoData.id, estado: pedidoData.estado, total: pedidoData.total });
      setMesa('');
      setNuevoItems([{ producto_nombre: '', precio_unitario: '', cantidad: 1 }]);
      cargarPedidos();
      setTimeout(() => setCrearExito(''), 3000);
    } catch (error) {
      console.error(error);
      setCrearError(error.message || 'Error al generar la comanda. Verifica los datos.');
    } finally {
      setCreando(false);
    }
  };

  // --- Handlers: Acciones Rápidas ---
  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await updateEstadoPedido(id, nuevoEstado);
      logActualizacion({ id, estado: nuevoEstado });
      cargarPedidos();
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el estado del pedido.');
    }
  };

  const handleCancelar = (id, numMesa) => {
    const confirmacion = window.confirm(`⚠️ ADVERTENCIA\n¿Está seguro de CANCELAR el pedido de la Mesa ${numMesa || 'S/D'}?\nEsta acción no se puede deshacer.`);
    if (confirmacion) {
      handleCambiarEstado(id, 'Cancelado');
    }
  };

  // --- Handler: Mercado Pago Point (Simulación con QR) ---
  const handleCobrarConPoint = (pedido) => {
    // En lugar de llamar al posnet real, abrimos un modal con un QR genérico para pruebas
    setQrPago(pedido);
  };

  const handleConfirmarPagoSimulado = async (pedido) => {
    setQrPago(null);
    setProcesandoCobroPoint(pedido.id);
    try {
      // Simulamos la respuesta de la API de Mercado Pago
      const paymentIntentSimulado = {
        id: `SIMULADO-${Date.now()}`,
        status: 'approved'
      };
      
      // Guardar datos financieros en Supabase
      await updateCobroPedido(pedido.id, paymentIntentSimulado);
      logActualizacion({ id: pedido.id, estado: 'Pagado (QR Simulado)' });
      
      // Confirmación visual
      alert('Pago aprobado mediante QR ✅');
      cargarPedidos();
    } catch (error) {
      console.error(error);
      alert('Error al procesar el pago: ' + error.message);
    } finally {
      setProcesandoCobroPoint(null);
    }
  };

  // Separar carta para renderizar
  const platosMenu = MENU_RESTAURANTE.filter(i => i.categoria === 'Platos');
  const bebidasMenu = MENU_RESTAURANTE.filter(i => i.categoria === 'Bebidas');

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Toma de Órdenes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Módulo operativo para Mozos de Salón</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {alertaMozo && (
            <div style={{ background: 'var(--success)', color: 'white', padding: '8px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'pulse 1.5s infinite' }}>
              <BellRing size={18} /> {alertaMozo}
            </div>
          )}
          <button onClick={cargarPedidos} className="btn btn-secondary">
            <RefreshCw size={16} /> Recargar Tabla
          </button>
        </div>
      </header>

      {/* SECCIÓN 1: CREAR PEDIDO */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} color="var(--accent-primary)" /> Generar Comanda
        </h2>

        <form onSubmit={handleCrearPedido}>
          <div className="input-group" style={{ maxWidth: '300px' }}>
            <label className="input-label">Mesa Destino</label>
            <select 
              className="input-field" 
              style={{ appearance: 'auto', cursor: 'pointer', background: 'var(--bg-color)', fontWeight: 700 }}
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              required
            >
              <option value="" disabled>Seleccione número de mesa...</option>
              {[...Array(20)].map((_, i) => (
                <option key={i+1} value={i+1}>Mesa {i+1}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="input-label" style={{ marginBottom: 0 }}>Carta (Platos y Bebidas)</label>
            <button type="button" onClick={handleAgregarItem} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              + Añadir Ítem
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {nuevoItems.map((item, index) => {
              const subtotal = (Number(item.precio_unitario) || 0) * (Number(item.cantidad) || 0);
              return (
                <div key={index} className="card-dark" style={{ padding: '16px', borderRadius: '8px', position: 'relative', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {nuevoItems.length > 1 && (
                    <button type="button" onClick={() => handleEliminarItem(index)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  )}
                  
                  <div className="input-group" style={{ flex: '2', minWidth: '250px', marginBottom: 0, paddingRight: nuevoItems.length > 1 ? '30px' : '0' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Consumo</label>
                    <select 
                      className="input-field" 
                      style={{ padding: '8px 12px', appearance: 'auto', cursor: 'pointer' }} 
                      value={item.producto_nombre} 
                      onChange={(e) => handleProductoChange(index, e.target.value)} 
                      required
                    >
                      <option value="" disabled>Seleccione una opción...</option>
                      <optgroup label="🍽️ PLATOS PRINCIPALES Y POSTRES">
                        {platosMenu.map(p => (
                          <option key={p.id} value={p.nombre}>{p.nombre} - ${p.precio.toFixed(2)}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🍷 BEBIDAS">
                        {bebidasMenu.map(p => (
                          <option key={p.id} value={p.nombre}>{p.nombre} - ${p.precio.toFixed(2)}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  
                  <div className="input-group" style={{ width: '100px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>CANT.</label>
                    <input type="number" min="1" className="input-field" style={{ padding: '8px 12px', textAlign: 'center' }} value={item.cantidad} onChange={(e) => handleCantidadChange(index, parseInt(e.target.value) || 1)} required />
                  </div>
                  
                  <div style={{ width: '100px', textAlign: 'right' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Subtotal</p>
                    <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-primary)' }}>${subtotal.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Calculator size={20} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Estimado</span>
            </div>
            <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>${calcularTotal().toLocaleString()}</span>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '14px 24px' }} disabled={creando}>
            {creando ? 'Enviando a Cocina...' : 'Generar e Imprimir Comanda'}
          </button>
        </form>

        {crearError && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(183, 65, 52, 0.05)', border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.9rem', display: 'flex', gap: '8px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} /> <span>{crearError}</span>
          </div>
        )}
        {crearExito && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(74, 124, 89, 0.05)', border: '1px solid var(--success)', borderRadius: '4px', color: 'var(--success)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle2 size={18} /> {crearExito}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: TABLA DE HISTORIAL DE PEDIDOS */}
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Gestión de Salón (Órdenes Activas)</h3>
        </div>
        
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                <th>Mesa</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones de Mozo</th>
              </tr>
            </thead>
            <tbody>
              {loadingPedidos ? (
                <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando órdenes...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay pedidos registrados.</td></tr>
              ) : (
                pedidos.map(pedido => (
                  <tr key={pedido.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                      {pedido.mesa ? `Mesa ${pedido.mesa}` : <span style={{ color: 'var(--warning)', fontWeight: 500 }}>S/D</span>}
                    </td>
                    <td>
                      <span className={`badge badge-${pedido.estado.toLowerCase().replace(' ', '-')}`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>${Number(pedido.total).toLocaleString()}</td>
                    <td style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '16px 20px', flexWrap: 'wrap' }}>
                      
                      {pedido.estado === 'Enviado' && (
                        <button onClick={() => handleCambiarEstado(pedido.id, 'Entregado')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--success)', border: 'none', color: 'white' }}>
                          <Check size={14} /> Entregado
                        </button>
                      )}

                      {pedido.estado === 'Entregado' && (
                        <button onClick={() => handleCambiarEstado(pedido.id, 'Por Cobrar')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                          <DollarSign size={14} /> Pedir Cuenta
                        </button>
                      )}

                      {pedido.estado === 'Por Cobrar' && (
                        <button 
                          onClick={() => handleCobrarConPoint(pedido)} 
                          className="btn btn-primary" 
                          disabled={procesandoCobroPoint === pedido.id}
                          style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#009ee3', border: 'none', color: 'white' }}
                        >
                          <CreditCard size={14} /> {procesandoCobroPoint === pedido.id ? 'Procesando cobro en Point...' : 'Cobrar con Point'}
                        </button>
                      )}

                      {(pedido.estado === 'Pendiente' || pedido.estado === 'Enviado') && (
                        <button onClick={() => handleCancelar(pedido.id, pedido.mesa)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                          <XCircle size={14} /> Cancelar
                        </button>
                      )}

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(74, 124, 89, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(74, 124, 89, 0); }
          100% { box-shadow: 0 0 0 0 rgba(74, 124, 89, 0); }
        }
      `}</style>

      {/* MODAL QR DE PRUEBA */}
      {qrPago && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="card-dark animate-fade-in" style={{ padding: '32px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Mesa {qrPago.mesa || 'S/D'}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1.1rem' }}>Total a cobrar: <strong style={{color: 'var(--accent-primary)'}}>${Number(qrPago.total).toLocaleString()}</strong></p>
            
            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '24px', border: '4px solid #009ee3' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MercadoPago_Mesa_${qrPago.mesa}_Monto_${qrPago.total}`} 
                alt="QR de Pago" 
                style={{ display: 'block', borderRadius: '8px' }}
              />
            </div>
            
            <p style={{ color: '#009ee3', fontWeight: 600, fontSize: '0.9rem', marginBottom: '24px' }}>Escanea con Mercado Pago (Modo Prueba)</p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button onClick={() => setQrPago(null)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={() => handleConfirmarPagoSimulado(qrPago)} className="btn btn-primary" style={{ background: 'var(--success)', border: 'none', color: 'white' }}>
                Simular Pago Aprobado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
