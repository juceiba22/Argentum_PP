import React, { useEffect, useState } from 'react';
import { PackagePlus, Trash2, Check, ShoppingCart, Truck, Plus } from 'lucide-react';
import { getProveedores, registrarCompraCompleta } from '../services/erpApi';
import { getInventario } from '../services/inventarioApi';

export default function Compras() {
  const [proveedores, setProveedores] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Form states
  const [proveedorId, setProveedorId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  // Items de compra
  const [items, setItems] = useState([]);
  
  // Selección temporal para agregar ítem
  const [tempProdId, setTempProdId] = useState('');
  const [tempCant, setTempCant] = useState('');
  const [tempPrecio, setTempPrecio] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [provs, inv] = await Promise.all([getProveedores(), getInventario()]);
      setProveedores(provs || []);
      setInventario(inv || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!tempProdId || !tempCant || !tempPrecio) return;
    
    const producto = inventario.find(p => p.id === tempProdId);
    if (!producto) return;

    const subtotal = Number(tempCant) * Number(tempPrecio);
    
    setItems([...items, {
      producto_id: producto.id,
      nombre: producto.nombre,
      unidad: producto.unidad_medida,
      cantidad: Number(tempCant),
      precio_unitario: Number(tempPrecio),
      subtotal
    }]);

    setTempProdId('');
    setTempCant('');
    setTempPrecio('');
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCompra = items.reduce((acc, item) => acc + item.subtotal, 0);

  const handleSubmit = async () => {
    if (!proveedorId || items.length === 0) return;
    setProcesando(true);
    setMensaje(null);

    try {
      await registrarCompraCompleta(
        { proveedor_id: proveedorId, importe: totalCompra, observaciones },
        items,
        'Admin' // Sistema de autenticación
      );
      
      setMensaje({ type: 'success', text: 'Compra registrada con éxito y stock repuesto.' });
      setProveedorId('');
      setObservaciones('');
      setItems([]);
      fetchData(); // Refrescar stock visualmente
    } catch (error) {
      console.error(error);
      setMensaje({ type: 'error', text: 'Ocurrió un error al registrar la compra.' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Reposición de Mercadería (Compras)</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Módulo ERP: Registrar compras a proveedores, reponer stock y asentar egreso financiero.</p>
      </header>

      {mensaje && (
        <div style={{
          padding: '16px', marginBottom: '24px', borderRadius: '8px',
          backgroundColor: mensaje.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
        }}>
          {mensaje.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Paso 1: Datos de Compra */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={20} color="var(--accent-primary)" /> Datos de la Compra
          </h2>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: '1', minWidth: '250px' }}>
              <label className="input-label">Proveedor</label>
              <select className="input-field" value={proveedorId} onChange={e => setProveedorId(e.target.value)} style={{ appearance: 'auto' }}>
                <option value="">-- Seleccionar Proveedor --</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="input-group" style={{ flex: '2', minWidth: '300px' }}>
              <label className="input-label">Observaciones (Opcional)</label>
              <input type="text" className="input-field" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej: Factura A N° 0001-00001234" />
            </div>
          </div>
        </div>

        {/* Paso 2: Detalle de Ítems */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackagePlus size={20} color="var(--accent-primary)" /> Agregar Productos
          </h2>
          
          <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', paddingBottom: '24px', borderBottom: '1px solid var(--glass-border)', marginBottom: '24px' }}>
            <div className="input-group" style={{ flex: '2', minWidth: '200px', marginBottom: 0 }}>
              <label className="input-label">Producto a Reponer</label>
              <select className="input-field" value={tempProdId} onChange={e => setTempProdId(e.target.value)} style={{ appearance: 'auto' }}>
                <option value="">-- Buscar Producto --</option>
                {inventario.map(item => (
                  <option key={item.id} value={item.id}>{item.nombre} (Stock actual: {item.cantidad} {item.unidad_medida})</option>
                ))}
              </select>
            </div>
            <div className="input-group" style={{ flex: '1', minWidth: '100px', marginBottom: 0 }}>
              <label className="input-label">Cantidad</label>
              <input type="number" step="0.01" className="input-field" value={tempCant} onChange={e => setTempCant(e.target.value)} placeholder="Ej: 50" />
            </div>
            <div className="input-group" style={{ flex: '1', minWidth: '120px', marginBottom: 0 }}>
              <label className="input-label">Costo Unitario ($)</label>
              <input type="number" step="0.01" className="input-field" value={tempPrecio} onChange={e => setTempPrecio(e.target.value)} placeholder="Ej: 4500" />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={!tempProdId || !tempCant || !tempPrecio} style={{ height: '42px', padding: '0 24px' }}>
              <Plus size={18} /> Agregar
            </button>
          </form>

          {/* Tabla de Detalle */}
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Costo Unit.</th>
                  <th>Subtotal</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay productos en la compra.</td></tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                      <td>{item.cantidad} {item.unidad}</td>
                      <td>${item.precio_unitario.toLocaleString()}</td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>${item.subtotal.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => handleRemoveItem(index)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
              Total Compra: <strong style={{ fontSize: '2rem', color: 'var(--warning)', marginLeft: '8px' }}>${totalCompra.toLocaleString()}</strong>
            </div>
            <button 
              onClick={handleSubmit} 
              className="btn btn-primary" 
              disabled={procesando || items.length === 0 || !proveedorId}
              style={{ padding: '16px 32px', fontSize: '1.1rem', display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              {procesando ? 'Procesando...' : <><Check size={20} /> Registrar y Reponer Stock</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
