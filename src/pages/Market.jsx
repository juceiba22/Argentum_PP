import React, { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Check, X, Tag, Banknote, CreditCard, Smartphone, QrCode, Building, ArrowLeft } from 'lucide-react';
import { getInventario, updateMercaderia } from '../services/inventarioApi';

export default function Market() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Checkout flow states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [step, setStep] = useState('cantidad'); // 'cantidad', 'metodos', 'confirmacion'
  const [cantidadCompra, setCantidadCompra] = useState('');
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
    setCantidadCompra('');
    setMensaje(null);
    setStep('cantidad');
    setMetodoPago(null);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setStep('cantidad');
    setMetodoPago(null);
  };

  const procederPago = (e) => {
    e.preventDefault();
    if (!cantidadCompra || isNaN(cantidadCompra) || Number(cantidadCompra) <= 0) return;
    setStep('metodos');
  };

  const seleccionarMetodo = (metodo) => {
    setMetodoPago(metodo);
    setStep('confirmacion');
  };

  const confirmarVenta = async () => {
    if (!selectedProduct || !cantidadCompra || !metodoPago) return;

    setProcesando(true);
    try {
      const cantidadRestar = Number(cantidadCompra);
      const nuevaCantidad = Number(selectedProduct.cantidad) - cantidadRestar;
      
      // Actualizar el inventario restando la cantidad vendida
      await updateMercaderia(selectedProduct.id, {
        cantidad: nuevaCantidad
      });

      // Formatear el método de pago para el mensaje
      const metodosLegibles = {
        'efectivo': 'Efectivo',
        'mercado_pago': 'Mercado Pago',
        'cuenta_dni': 'Cuenta DNI',
        'transferencia': 'Transferencia',
        'tarjeta': 'Tarjeta de Crédito'
      };

      setMensaje({ 
        type: 'success', 
        text: `Venta cobrada con éxito: ${cantidadCompra} ${selectedProduct.unidad_medida} de ${selectedProduct.nombre} a través de ${metodosLegibles[metodoPago]}` 
      });
      
      handleCloseModal();
      cargarProductos();
    } catch (error) {
      console.error('Error al confirmar venta:', error);
      setMensaje({ type: 'error', text: 'Ocurrió un error al procesar la venta.' });
    } finally {
      setProcesando(false);
    }
  };

  const precioTotal = selectedProduct ? (Number(cantidadCompra || 0) * Number(selectedProduct.precio_unitario)) : 0;
  const precioFormateado = precioTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Mercado / Punto de Venta</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Seleccione un producto para realizar una venta rápida</p>
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
              {producto.imagen_url ? (
                <img 
                  src={producto.imagen_url} 
                  alt={producto.nombre} 
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    marginBottom: '16px',
                    border: '4px solid rgba(255,255,255,0.05)'
                  }} 
                />
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '24px',
                  borderRadius: '50%',
                  marginBottom: '16px'
                }}>
                  <Tag size={48} color="var(--accent-primary)" />
                </div>
              )}
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
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '90%',
            maxWidth: '550px',
            padding: '32px',
            position: 'relative'
          }}>
            <button
              onClick={handleCloseModal}
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
            
            {/* Cabecera del Modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              {step !== 'cantidad' && (
                <button 
                  onClick={() => step === 'confirmacion' ? setStep('metodos') : setStep('cantidad')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ArrowLeft size={24} />
                </button>
              )}
              <div>
                <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={28} color="var(--accent-primary)" /> {selectedProduct.nombre}
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Total a pagar: <strong style={{ color: 'var(--success)' }}>${precioFormateado}</strong>
                </p>
              </div>
            </div>

            {/* PASO 1: Ingresar Cantidad */}
            {step === 'cantidad' && (
              <form onSubmit={procederPago} className="animate-fade-in">
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

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn"
                    style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!cantidadCompra || Number(cantidadCompra) <= 0}
                    style={{ flex: 2, padding: '16px', fontSize: '1.1rem' }}
                  >
                    Proceder al Pago
                  </button>
                </div>
              </form>
            )}

            {/* PASO 2: Seleccionar Método de Pago */}
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

            {/* PASO 3: Confirmación Específica por Método */}
            {step === 'confirmacion' && (
              <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                
                {metodoPago === 'efectivo' && (
                  <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <Banknote size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Cobro en Efectivo</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Recibe <strong>${precioFormateado}</strong> en caja.</p>
                  </div>
                )}

                {metodoPago === 'mercado_pago' && (
                  <div style={{ padding: '20px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <Smartphone size={48} color="#38bdf8" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Mercado Pago Point</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Haz clic para enviar el cobro de <strong>${precioFormateado}</strong> al dispositivo físico.</p>
                  </div>
                )}

                {metodoPago === 'cuenta_dni' && (
                  <div style={{ padding: '20px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    {/* Simulador de QR */}
                    <div style={{ width: '150px', height: '150px', background: 'white', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                      <QrCode size={120} color="#000" />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Código QR Cuenta DNI</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Pide al cliente que escanee este código por <strong>${precioFormateado}</strong>.</p>
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
                      Alias: CARNICERIA.ARGENTUM<br/>
                      CBU: 0140000000000000000000
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>Verifica la acreditación de <strong>${precioFormateado}</strong> antes de confirmar.</p>
                  </div>
                )}

                <button
                  onClick={confirmarVenta}
                  className="btn btn-primary"
                  disabled={procesando}
                  style={{ width: '100%', padding: '16px', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {procesando ? 'Procesando Venta...' : (
                    <>
                      {metodoPago === 'efectivo' && 'Confirmar Cobro en Efectivo'}
                      {metodoPago === 'mercado_pago' && 'Generar pago en posnet'}
                      {metodoPago === 'cuenta_dni' && 'Confirmar Lectura de QR'}
                      {metodoPago === 'tarjeta' && 'Cobro con posnet Pawway'}
                      {metodoPago === 'transferencia' && 'Confirmar Recepción del Dinero'}
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
