import React, { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Check, X, Tag, Banknote, CreditCard, Smartphone, QrCode, Building, ArrowLeft, Trash2 } from 'lucide-react';
import { getInventario, updateMercaderia } from '../services/inventarioApi';
import { registrarVentaDirecta } from '../services/pedidosApi';

export default function Market() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado del Carrito
  const [carrito, setCarrito] = useState([]);
  
  // Estados para Modal de Agregar al Carrito
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidadToAdd, setCantidadToAdd] = useState('');
  
  // Estados para Modal de Checkout (Pago)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [step, setStep] = useState('metodos'); // 'metodos', 'confirmacion'
  const [metodoPago, setMetodoPago] = useState(null); 
  
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
    setCantidadToAdd('');
    setMensaje(null);
  };

  const handleCloseProductModal = () => {
    setSelectedProduct(null);
    setCantidadToAdd('');
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!cantidadToAdd || isNaN(cantidadToAdd) || Number(cantidadToAdd) <= 0) return;
    
    const cantidad = Number(cantidadToAdd);
    const precio = Number(selectedProduct.precio_unitario);
    const subtotal = cantidad * precio;
    
    const existingIndex = carrito.findIndex(item => item.producto.id === selectedProduct.id);
    if (existingIndex >= 0) {
      const newCarrito = [...carrito];
      newCarrito[existingIndex].cantidad += cantidad;
      newCarrito[existingIndex].subtotal += subtotal;
      setCarrito(newCarrito);
    } else {
      setCarrito([...carrito, { producto: selectedProduct, cantidad, subtotal }]);
    }
    
    handleCloseProductModal();
  };

  const removeFromCart = (index) => {
    const newCarrito = [...carrito];
    newCarrito.splice(index, 1);
    setCarrito(newCarrito);
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + item.subtotal, 0);

  const iniciarCobro = () => {
    if (carrito.length === 0) return;
    setStep('metodos');
    setMetodoPago(null);
    setIsCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    setStep('metodos');
    setMetodoPago(null);
  };

  const seleccionarMetodo = (metodo) => {
    setMetodoPago(metodo);
    setStep('confirmacion');
  };

  const confirmarVenta = async () => {
    if (carrito.length === 0 || !metodoPago) return;

    setProcesando(true);
    try {
      // 1. Actualizar el inventario restando la cantidad vendida de CADA producto
      for (const item of carrito) {
        // Find current stock to subtract correctly
        const prodDb = productos.find(p => p.id === item.producto.id);
        const stockActual = prodDb ? Number(prodDb.cantidad) : Number(item.producto.cantidad);
        const nuevaCantidad = stockActual - item.cantidad;
        
        await updateMercaderia(item.producto.id, {
          cantidad: nuevaCantidad
        });
      }

      // 2. Registrar la venta en auditoría con todos los items
      await registrarVentaDirecta(totalCarrito, metodoPago, carrito);

      const metodosLegibles = {
        'efectivo': 'Efectivo',
        'mercado_pago': 'Mercado Pago',
        'cuenta_dni': 'Cuenta DNI',
        'transferencia': 'Transferencia',
        'tarjeta': 'Tarjeta de Crédito'
      };

      setMensaje({ 
        type: 'success', 
        text: `Venta cobrada con éxito por un total de $${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2})} a través de ${metodosLegibles[metodoPago]}.` 
      });
      
      // Limpiar carrito y cerrar modal
      setCarrito([]);
      handleCloseCheckout();
      cargarProductos();
    } catch (error) {
      console.error('Error al confirmar venta:', error);
      setMensaje({ type: 'error', text: 'Ocurrió un error al procesar la venta.' });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      
      {/* COLUMNA IZQUIERDA: PRODUCTOS */}
      <div style={{ flex: '1 1 60%' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Punto de Venta</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Seleccione productos para agregarlos al carrito</p>
        </header>

        {mensaje && (
          <div className="animate-fade-in" style={{
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {productos.map((producto) => (
              <div
                key={producto.id}
                className="glass-panel hover-scale"
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  border: '1px solid var(--glass-border)',
                  transition: 'all 0.2s ease-in-out'
                }}
                onClick={() => handleProductClick(producto)}
              >
                {producto.imagen_url ? (
                  <img 
                    src={producto.imagen_url} 
                    alt={producto.nombre} 
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      marginBottom: '16px',
                      border: '3px solid rgba(255,255,255,0.05)'
                    }} 
                  />
                ) : (
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px',
                    borderRadius: '50%',
                    marginBottom: '16px'
                  }}>
                    <Tag size={40} color="var(--accent-primary)" />
                  </div>
                )}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>{producto.nombre}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  Stock: {Number(producto.cantidad).toLocaleString()} {producto.unidad_medida}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontWeight: 'bold', fontSize: '1.05rem' }}>
                  <DollarSign size={16} />
                  {Number(producto.precio_unitario).toLocaleString()} / {producto.unidad_medida}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COLUMNA DERECHA: CARRITO */}
      <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column' }}>
        <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
            <ShoppingCart size={24} color="var(--accent-primary)" /> Carrito
          </h2>

          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '8px' }}>
            {carrito.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                <ShoppingCart size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto' }} />
                <p>El carrito está vacío</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {carrito.map((item, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    background: 'rgba(255,255,255,0.02)', 
                    padding: '12px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{item.producto.nombre}</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {item.cantidad} {item.producto.unidad_medida} x ${Number(item.producto.precio_unitario).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                        ${item.subtotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </span>
                      <button 
                        onClick={() => removeFromCart(index)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Total:</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--success)' }}>
                ${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
              </span>
            </div>
            
            <button
              onClick={iniciarCobro}
              className="btn btn-primary"
              disabled={carrito.length === 0}
              style={{ width: '100%', padding: '16px', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Banknote size={24} /> Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: AGREGAR CANTIDAD AL CARRITO */}
      {selectedProduct && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', padding: '32px', position: 'relative' }}>
            <button
              onClick={handleCloseProductModal}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <ShoppingCart size={28} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.5rem' }}>{selectedProduct.nombre}</h2>
            </div>

            <form onSubmit={handleAddToCart}>
              <div className="input-group" style={{ marginBottom: '24px' }}>
                <label className="input-label">Cantidad ({selectedProduct.unidad_medida})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input-field"
                  value={cantidadToAdd}
                  onChange={(e) => setCantidadToAdd(e.target.value)}
                  placeholder="Ej: 2.5"
                  style={{ fontSize: '1.2rem', padding: '12px' }}
                  autoFocus
                />
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>
                  ${(Number(cantidadToAdd || 0) * Number(selectedProduct.precio_unitario)).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" onClick={handleCloseProductModal} className="btn" style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={!cantidadToAdd || Number(cantidadToAdd) <= 0} style={{ flex: 2, padding: '16px', fontSize: '1.1rem' }}>
                  Añadir al Carrito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECKOUT / MÉTODOS DE PAGO */}
      {isCheckoutOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '550px', padding: '32px', position: 'relative' }}>
            <button
              onClick={handleCloseCheckout}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              {step === 'confirmacion' && (
                <button 
                  onClick={() => setStep('metodos')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ArrowLeft size={24} />
                </button>
              )}
              <div>
                <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Banknote size={28} color="var(--accent-primary)" /> Resumen de Venta
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Total a cobrar: <strong style={{ color: 'var(--success)' }}>${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
                </p>
              </div>
            </div>

            {/* SELECCIONAR MÉTODO */}
            {step === 'metodos' && (
              <div className="animate-fade-in">
                <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Seleccione medio de pago:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <button onClick={() => seleccionarMetodo('efectivo')} className="btn hover-scale" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)' }}>
                    <Banknote size={32} />
                    <span style={{ fontWeight: 'bold' }}>Efectivo</span>
                  </button>
                  <button onClick={() => seleccionarMetodo('mercado_pago')} className="btn hover-scale" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8' }}>
                    <Smartphone size={32} />
                    <span style={{ fontWeight: 'bold' }}>Mercado Pago</span>
                  </button>
                  <button onClick={() => seleccionarMetodo('cuenta_dni')} className="btn hover-scale" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e' }}>
                    <QrCode size={32} />
                    <span style={{ fontWeight: 'bold' }}>Cuenta DNI</span>
                  </button>
                  <button onClick={() => seleccionarMetodo('tarjeta')} className="btn hover-scale" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid #f97316', color: '#f97316' }}>
                    <CreditCard size={32} />
                    <span style={{ fontWeight: 'bold' }}>Tarjetas</span>
                  </button>
                  <button onClick={() => seleccionarMetodo('transferencia')} className="btn hover-scale" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', color: '#a855f7', gridColumn: 'span 2' }}>
                    <Building size={32} />
                    <span style={{ fontWeight: 'bold' }}>Transferencia Bancaria</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMAR MÉTODO */}
            {step === 'confirmacion' && (
              <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                {metodoPago === 'efectivo' && (
                  <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <Banknote size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Cobro en Efectivo</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Recibe <strong>${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2})}</strong> en caja.</p>
                  </div>
                )}
                {metodoPago === 'mercado_pago' && (
                  <div style={{ padding: '20px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <Smartphone size={48} color="#38bdf8" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Mercado Pago Point</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Haz clic para enviar el cobro de <strong>${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2})}</strong> al dispositivo físico.</p>
                  </div>
                )}
                {metodoPago === 'cuenta_dni' && (
                  <div style={{ padding: '20px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <div style={{ width: '150px', height: '150px', background: 'white', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                      <QrCode size={120} color="#000" />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Código QR Cuenta DNI</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Pide al cliente que escanee este código por <strong>${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2})}</strong>.</p>
                  </div>
                )}
                {metodoPago === 'tarjeta' && (
                  <div style={{ padding: '20px', background: 'rgba(249, 115, 22, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <CreditCard size={48} color="#f97316" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Posnet Pawway</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Haz clic para iniciar el cobro con tarjeta en el dispositivo Pawway.</p>
                  </div>
                )}
                {metodoPago === 'transferencia' && (
                  <div style={{ padding: '20px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <Building size={48} color="#a855f7" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Transferencia</h3>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px', fontFamily: 'monospace', margin: '16px 0', fontSize: '1.1rem' }}>
                      Alias: CARNICERIA.ARGENTUM<br/>CBU: 0140000000000000000000
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>Verifica la acreditación antes de confirmar.</p>
                  </div>
                )}

                <button
                  onClick={confirmarVenta}
                  className="btn btn-primary"
                  disabled={procesando}
                  style={{ width: '100%', padding: '16px', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {procesando ? 'Procesando Venta...' : 'Confirmar Cobro'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
