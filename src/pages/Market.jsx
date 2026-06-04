import React, { useEffect, useState } from 'react';
import { ShoppingCart, Package, DollarSign, Check, X, Tag } from 'lucide-react';
import { getInventario, updateMercaderia } from '../services/inventarioApi';

export default function Market() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidadCompra, setCantidadCompra] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const data = await getInventario();
      setProductos(data || []);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleProductClick = (producto) => {
    setSelectedProduct(producto);
    setCantidadCompra('');
    setMensaje(null);
  };

  const confirmarVenta = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !cantidadCompra || isNaN(cantidadCompra) || Number(cantidadCompra) <= 0) {
      return;
    }

    setProcesando(true);
    try {
      const cantidadRestar = Number(cantidadCompra);
      const nuevaCantidad = Number(selectedProduct.cantidad) - cantidadRestar;
      
      // Actualizar el inventario restando la cantidad vendida
      await updateMercaderia(selectedProduct.id, {
        cantidad: nuevaCantidad
      });

      setMensaje({ type: 'success', text: `Venta confirmada: ${cantidadCompra} ${selectedProduct.unidad_medida} de ${selectedProduct.nombre}` });
      setSelectedProduct(null);
      setCantidadCompra('');
      
      // Recargar el inventario
      cargarProductos();
    } catch (error) {
      console.error('Error al confirmar venta:', error);
      setMensaje({ type: 'error', text: 'Ocurrió un error al procesar la venta.' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Mercado / Punto de Venta</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Seleccione un producto para realizar una venta rápida</p>
      </header>

      {mensaje && (
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          borderRadius: '8px',
          backgroundColor: mensaje.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {mensaje.type === 'success' ? <Check size={20} /> : <X size={20} />}
          {mensaje.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Cargando productos...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
          {productos.map((producto) => (
            <div
              key={producto.id}
              className="glass-panel hover-scale"
              style={{
                padding: '24px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                border: selectedProduct?.id === producto.id ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => handleProductClick(producto)}
            >
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '24px',
                borderRadius: '50%',
                marginBottom: '16px'
              }}>
                <Tag size={48} color="var(--accent-primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>{producto.nombre}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Stock: {Number(producto.cantidad).toLocaleString()} {producto.unidad_medida}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <DollarSign size={18} />
                {Number(producto.precio_unitario).toLocaleString()} / {producto.unidad_medida}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Panel de Compra */}
      {selectedProduct && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '90%',
            maxWidth: '500px',
            padding: '32px',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedProduct(null)}
              style={{
                position: 'absolute',
                top: '16px', right: '16px',
                background: 'none', border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={28} color="var(--accent-primary)" /> Venta de {selectedProduct.nombre}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Precio unitario: ${Number(selectedProduct.precio_unitario).toLocaleString()} por {selectedProduct.unidad_medida}
            </p>

            <form onSubmit={confirmarVenta}>
              <div className="input-group" style={{ marginBottom: '24px' }}>
                <label className="input-label" style={{ fontSize: '1.1rem' }}>Cantidad a vender ({selectedProduct.unidad_medida})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input-field"
                  value={cantidadCompra}
                  onChange={(e) => setCantidadCompra(e.target.value)}
                  placeholder="Ej: 2.5"
                  style={{ fontSize: '1.2rem', padding: '12px' }}
                  autoFocus
                />
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid var(--success)',
                padding: '24px',
                borderRadius: '8px',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Precio Total:</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  ${(Number(cantidadCompra || 0) * Number(selectedProduct.precio_unitario)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="btn"
                  style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={procesando || !cantidadCompra || Number(cantidadCompra) <= 0}
                  style={{ flex: 2, padding: '16px', fontSize: '1.1rem' }}
                >
                  {procesando ? 'Procesando...' : 'Confirmar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
