import React, { useEffect, useState } from 'react';
import { Plus, Edit, RefreshCw, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { getTodosLosPedidos, createPedidoCompleto, updateEstadoPedido } from '../services/pedidosApi';
import { useActivity } from '../context/ActivityContext';

export default function Pedidos() {
  const { logPedido, logActualizacion } = useActivity();
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // --- Estados: Crear Pedido ---
  const [nuevoClienteId, setNuevoClienteId] = useState('');
  const [nuevoItems, setNuevoItems] = useState([{ producto_nombre: '', precio_unitario: '', cantidad: 1 }]);
  const [creando, setCreando] = useState(false);
  const [crearError, setCrearError] = useState('');
  const [crearExito, setCrearExito] = useState('');

  // --- Estados: Actualizar Estado ---
  const [updatePedidoId, setUpdatePedidoId] = useState('');
  const [updateEstado, setUpdateEstado] = useState('Pendiente');
  const [actualizando, setActualizando] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateExito, setUpdateExito] = useState('');

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

  const handleItemChange = (index, field, value) => {
    const actualizados = [...nuevoItems];
    actualizados[index][field] = value;
    setNuevoItems(actualizados);
  };

  const handleCrearPedido = async (e) => {
    e.preventDefault();
    setCreando(true);
    setCrearError('');
    setCrearExito('');

    // Validar items
    for (let item of nuevoItems) {
      if (!item.producto_nombre || !item.precio_unitario || !item.cantidad) {
        setCrearError('Todos los campos de los ítems son obligatorios.');
        setCreando(false);
        return;
      }
    }

    try {
      const pedidoData = await createPedidoCompleto(nuevoClienteId, nuevoItems);
      setCrearExito('¡Pedido creado correctamente!');
      logPedido({ id: pedidoData.id, estado: pedidoData.estado, total: pedidoData.total });
      setNuevoClienteId('');
      setNuevoItems([{ producto_nombre: '', precio_unitario: '', cantidad: 1 }]);
      cargarPedidos(); // Recargar tabla
    } catch (error) {
      console.error(error);
      setCrearError(error.message || 'Error al crear el pedido. Revisa el ID del cliente.');
    } finally {
      setCreando(false);
    }
  };

  // --- Handlers: Actualizar Estado ---
  const handleActualizarEstado = async (e) => {
    e.preventDefault();
    if (!updatePedidoId) return;

    setActualizando(true);
    setUpdateError('');
    setUpdateExito('');

    try {
      await updateEstadoPedido(updatePedidoId, updateEstado);
      setUpdateExito('¡Estado actualizado correctamente!');
      logActualizacion({ id: updatePedidoId, estado: updateEstado });
      setUpdatePedidoId('');
      cargarPedidos(); // Recargar tabla
    } catch (error) {
      console.error(error);
      setUpdateError(error.message || 'Error al actualizar el estado. Revisa el ID.');
    } finally {
      setActualizando(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Gestión de Pedidos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Administra el flujo de órdenes en tiempo real</p>
        </div>
        <button onClick={cargarPedidos} className="btn btn-secondary">
          <RefreshCw size={16} /> Recargar Tabla
        </button>
      </header>

      {/* SECCIÓN 1: TABLA DE HISTORIAL DE PEDIDOS */}
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Órdenes Recientes</h3>
        </div>
        
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>ID Pedido</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Cliente</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loadingPedidos ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando órdenes desde la nube...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay pedidos registrados.</td></tr>
              ) : (
                pedidos.map(pedido => (
                  <tr key={pedido.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <code style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '4px' }}>{pedido.id.substring(0,8)}...</code>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 500 }}>
                      {pedido.clientes ? pedido.clientes.nombre : <span style={{ color: 'var(--danger)' }}>Cliente Borrado</span>}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{new Date(pedido.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>${Number(pedido.total).toLocaleString()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge badge-${pedido.estado.toLowerCase()}`}>
                        {pedido.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* SECCIÓN 2: CREAR PEDIDO (FORMULARIO CON ÍTEMS) */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="var(--accent-primary)" /> Crear Nuevo Pedido
          </h2>

          <form onSubmit={handleCrearPedido}>
            <div className="input-group">
              <label className="input-label">ID del Cliente (UUID)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Pega el ID del cliente aquí" 
                value={nuevoClienteId}
                onChange={(e) => setNuevoClienteId(e.target.value)}
                required
              />
            </div>

            <div style={{ marginTop: '24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Ítems de Compra</label>
              <button type="button" onClick={handleAgregarItem} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                + Añadir Ítem
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {nuevoItems.map((item, index) => (
                <div key={index} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', position: 'relative' }}>
                  {nuevoItems.length > 1 && (
                    <button type="button" onClick={() => handleEliminarItem(index)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                  
                  <div className="input-group" style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nombre del Producto</label>
                    <input type="text" className="input-field" style={{ padding: '8px 12px' }} value={item.producto_nombre} onChange={(e) => handleItemChange(index, 'producto_nombre', e.target.value)} required />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Precio Unit. ($)</label>
                      <input type="number" step="0.01" className="input-field" style={{ padding: '8px 12px' }} value={item.precio_unitario} onChange={(e) => handleItemChange(index, 'precio_unitario', parseFloat(e.target.value) || '')} required />
                    </div>
                    <div className="input-group" style={{ width: '80px', marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cant.</label>
                      <input type="number" min="1" className="input-field" style={{ padding: '8px 12px' }} value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 1)} required />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creando}>
              {creando ? 'Guardando en la nube...' : 'Guardar Pedido'}
            </button>
          </form>

          {/* Alertas Crear */}
          {crearError && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', display: 'flex', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} /> <span>{crearError}</span>
            </div>
          )}
          {crearExito && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', color: '#6ee7b7', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <CheckCircle2 size={18} /> {crearExito}
            </div>
          )}
        </div>

        {/* SECCIÓN 3: ACTUALIZAR ESTADO DE PEDIDO */}
        <div className="glass-panel" style={{ padding: '24px', alignSelf: 'start' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit size={20} color="var(--warning)" /> Actualizar Estado
          </h2>

          <form onSubmit={handleActualizarEstado}>
            <div className="input-group">
              <label className="input-label">ID del Pedido (UUID)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Pega el ID del pedido aquí" 
                value={updatePedidoId}
                onChange={(e) => setUpdatePedidoId(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Nuevo Estado</label>
              <select 
                className="input-field" 
                style={{ appearance: 'none', cursor: 'pointer' }}
                value={updateEstado}
                onChange={(e) => setUpdateEstado(e.target.value)}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
                <option value="Enviado">Enviado</option>
                <option value="Entregado">Entregado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }} disabled={actualizando}>
              {actualizando ? 'Actualizando...' : 'Actualizar'}
            </button>
          </form>

          {/* Alertas Actualizar */}
          {updateError && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', display: 'flex', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} /> <span>{updateError}</span>
            </div>
          )}
          {updateExito && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', color: '#6ee7b7', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <CheckCircle2 size={18} /> {updateExito}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
