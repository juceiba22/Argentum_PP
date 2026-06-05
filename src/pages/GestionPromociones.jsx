import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Check, X, Tag, Power, PowerOff } from 'lucide-react';
import { getInventario, uploadImage } from '../services/inventarioApi';
import { getAllPromociones, createPromocion, deletePromocion, updatePromocion } from '../services/promocionesApi';

export default function GestionPromociones() {
  const [promociones, setPromociones] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para nueva promoción
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagen, setImagen] = useState(null);
  const [creando, setCreando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [invData, promoData] = await Promise.all([
        getInventario(),
        getAllPromociones()
      ]);
      setInventario(invData || []);
      setPromociones(promoData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleAgregar = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!productoId || !cantidad || !precio) {
      setErrorMsg('Seleccione un producto, indique los Kilos y el precio de la promoción.');
      return;
    }

    setCreando(true);
    try {
      const producto = inventario.find(p => p.id === productoId);
      
      let imagenUrl = null;
      if (imagen) {
        imagenUrl = await uploadImage(imagen);
      } else {
        imagenUrl = producto?.imagen_url || null; // Fallback a la imagen del inventario
      }

      await createPromocion({
        producto_id: productoId,
        nombre_producto: producto.nombre,
        cantidad_kg: Number(cantidad),
        precio_promocional: Number(precio),
        imagen_url: imagenUrl,
        activa: true
      });

      setProductoId('');
      setCantidad('');
      setPrecio('');
      setImagen(null);
      const fileInput = document.getElementById('promo-image');
      if (fileInput) fileInput.value = '';

      cargarDatos();
    } catch (error) {
      console.error('Error creando promoción:', error);
      setErrorMsg('Ocurrió un error al guardar la promoción.');
    } finally {
      setCreando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Eliminar esta promoción?')) {
      try {
        await deletePromocion(id);
        cargarDatos();
      } catch (error) {
        console.error(error);
        alert('Error al eliminar');
      }
    }
  };

  const handleToggleActiva = async (promo) => {
    try {
      await updatePromocion(promo.id, { activa: !promo.activa });
      cargarDatos();
    } catch (error) {
      console.error(error);
      alert('Error al cambiar estado');
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Gestión de Promociones</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Crea promociones para que los clientes las vean públicamente</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Formulario de Nueva Promo */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="var(--accent-primary)" /> Cargar Promoción
          </h2>
          
          <form onSubmit={handleAgregar} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: '2', minWidth: '200px', marginBottom: 0 }}>
              <label className="input-label">Corte / Producto</label>
              <select className="input-field" value={productoId} onChange={e => setProductoId(e.target.value)} style={{ appearance: 'auto' }}>
                <option value="">-- Seleccionar Producto --</option>
                {inventario.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} (Stock: {item.cantidad} {item.unidad_medida})
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group" style={{ flex: '1', minWidth: '100px', marginBottom: 0 }}>
              <label className="input-label">Cantidad (Kg)</label>
              <input type="number" step="0.01" className="input-field" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Ej: 2" />
            </div>
            <div className="input-group" style={{ flex: '1', minWidth: '120px', marginBottom: 0 }}>
              <label className="input-label">Precio Total ($)</label>
              <input type="number" step="0.01" className="input-field" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Ej: 15000" />
            </div>
            <div className="input-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
              <label className="input-label">Foto Especial (Opcional)</label>
              <input id="promo-image" type="file" accept="image/*" className="input-field" onChange={e => setImagen(e.target.files[0])} style={{ padding: '8px' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creando} style={{ height: '42px', padding: '0 24px' }}>
              {creando ? 'Subiendo...' : 'Cargar Promoción'}
            </button>
          </form>
          {errorMsg && <p style={{ color: 'var(--danger)', marginTop: '16px' }}>{errorMsg}</p>}
        </div>

        {/* Listado de Promociones */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={20} color="var(--text-primary)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Promociones Cargadas</h3>
          </div>
          
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)' }}>
                  <th>Producto</th>
                  <th>Promo</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</td></tr>
                ) : promociones.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay promociones cargadas.</td></tr>
                ) : (
                  promociones.map(promo => (
                    <tr key={promo.id} style={{ borderBottom: '1px solid var(--glass-border)', opacity: promo.activa ? 1 : 0.5 }}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {promo.imagen_url ? (
                          <img src={promo.imagen_url} alt={promo.nombre_producto} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Tag size={20} />
                          </div>
                        )}
                        <span style={{ fontWeight: 600 }}>{promo.nombre_producto}</span>
                      </td>
                      <td>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {promo.cantidad_kg} Kg
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>
                        ${Number(promo.precio_promocional).toLocaleString()}
                      </td>
                      <td>
                        {promo.activa ? (
                          <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Publicada</span>
                        ) : (
                          <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>Pausada</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleToggleActiva(promo)} style={{ background: 'transparent', border: '1px solid var(--text-secondary)', color: promo.activa ? 'var(--warning)' : 'var(--success)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }} title={promo.activa ? 'Pausar' : 'Reactivar'}>
                            {promo.activa ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button onClick={() => handleEliminar(promo.id)} style={{ background: 'rgba(183, 65, 52, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
