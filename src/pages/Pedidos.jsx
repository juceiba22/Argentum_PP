import React, { useEffect, useState } from 'react';
import { Plus, Edit, RefreshCw, AlertCircle, CheckCircle2, Trash2, Calculator } from 'lucide-react';
import { getTodosLosPedidos, createPedidoCompleto, updateEstadoPedido } from '../services/pedidosApi';
import { useActivity } from '../context/ActivityContext';

const MENU_RESTAURANTE = [
  { id: 1, nombre: 'Ostras Frescas al Limón', precio: 25.50 },
  { id: 2, nombre: 'Ceviche de Salmón Rosado', precio: 32.00 },
  { id: 3, nombre: 'Risotto de Hongos Trufados', precio: 45.00 },
  { id: 4, nombre: 'Bife de Chorizo Angus (400g)', precio: 68.00 },
  { id: 5, nombre: 'Merluza Negra a la Mantequilla', precio: 75.00 },
  { id: 6, nombre: 'Vino Tinto Malbec Gran Reserva', precio: 120.00 },
  { id: 7, nombre: 'Tiramisú Clásico Italiano', precio: 18.00 },
  { id: 8, nombre: 'Café Espresso Doble', precio: 6.00 }
];

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

    // Validar items
    for (let item of nuevoItems) {
      if (!item.producto_nombre || !item.precio_unitario || !item.cantidad) {
        setCrearError('Todos los ítems deben tener un producto seleccionado y cantidad válida.');
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
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Toma de Órdenes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Módulo operativo para Mozos de Salón</p>
        </div>
        <button onClick={cargarPedidos} className="btn btn-secondary">
          <RefreshCw size={16} /> Recargar Tabla
        </button>
      </header>

      {/* SECCIÓN 1: TABLA DE HISTORIAL DE PEDIDOS */}
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Órdenes Activas e Históricas</h3>
        </div>
        
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                <th>ID Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loadingPedidos ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando órdenes desde la nube...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay pedidos registrados.</td></tr>
              ) : (
                pedidos.map(pedido => (
                  <tr key={pedido.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <code className="code-dark" style={{ fontSize: '0.8rem', padding: '4px', borderRadius: '4px' }}>{pedido.id.substring(0,8)}...</code>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {pedido.clientes ? pedido.clientes.nombre : <span style={{ color: 'var(--danger)' }}>Cliente Borrado</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(pedido.created_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>${Number(pedido.total).toLocaleString()}</td>
                    <td>
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
            <Plus size={20} color="var(--accent-primary)" /> Generar Comanda
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
              <label className="input-label" style={{ marginBottom: 0 }}>Productos de Carta</label>
              <button type="button" onClick={handleAgregarItem} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                + Añadir Ítem
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {nuevoItems.map((item, index) => {
                const subtotal = (Number(item.precio_unitario) || 0) * (Number(item.cantidad) || 0);
                return (
                  <div key={index} className="card-dark" style={{ padding: '16px', borderRadius: '8px', position: 'relative' }}>
                    {nuevoItems.length > 1 && (
                      <button type="button" onClick={() => handleEliminarItem(index)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                    
                    <div className="input-group" style={{ marginBottom: '12px', paddingRight: '24px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Producto</label>
                      <select 
                        className="input-field" 
                        style={{ padding: '8px 12px', appearance: 'auto', cursor: 'pointer' }} 
                        value={item.producto_nombre} 
                        onChange={(e) => handleProductoChange(index, e.target.value)} 
                        required
                      >
                        <option value="" disabled>Seleccione un plato...</option>
                        {MENU_RESTAURANTE.map(p => (
                          <option key={p.id} value={p.nombre}>{p.nombre} - ${p.precio.toFixed(2)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                      <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>CANTIDAD</label>
                        <input type="number" min="1" className="input-field" style={{ padding: '8px 12px' }} value={item.cantidad} onChange={(e) => handleCantidadChange(index, parseInt(e.target.value) || 1)} required />
                      </div>
                      <div style={{ width: '120px', textAlign: 'right', paddingBottom: '8px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Subtotal</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>${subtotal.toLocaleString()}</p>
                      </div>
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
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>${calcularTotal().toLocaleString()}</span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creando}>
              {creando ? 'Generando Comanda...' : 'Guardar Pedido'}
            </button>
          </form>

          {/* Alertas Crear */}
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
                style={{ appearance: 'auto', cursor: 'pointer' }}
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
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(183, 65, 52, 0.05)', border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.9rem', display: 'flex', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} /> <span>{updateError}</span>
            </div>
          )}
          {updateExito && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(74, 124, 89, 0.05)', border: '1px solid var(--success)', borderRadius: '4px', color: 'var(--success)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <CheckCircle2 size={18} /> {updateExito}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
