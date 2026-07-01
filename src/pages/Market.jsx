import React, { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Check, X, Tag, Banknote, CreditCard, Smartphone, QrCode, Building, ArrowLeft, Trash2, Megaphone, UserPlus, Loader } from 'lucide-react';
import { getInventario, updateMercaderia } from '../services/inventarioApi';
import { getPromocionesActivas } from '../services/promocionesApi';
import { registrarVentaDirecta } from '../services/pedidosApi';
import { createCliente } from '../services/clientesApi';
import { cobrarConPoint, getPaymentIntentStatus } from '../services/mercadoPagoApi';

export default function Market() {
  const [productos, setProductos] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Responsive State
  const [isMobile, setIsMobile] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

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

  // MP Point Polling
  const [mpStatus, setMpStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Estados de Cliente
  const [clienteAsignado, setClienteAsignado] = useState(null);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [clienteForm, setClienteForm] = useState({ nombre: '', apellido: '', telefono: '' });
  const [creandoCliente, setCreandoCliente] = useState(false);

  useEffect(() => {
    const checkResponsive = () => setIsMobile(window.innerWidth < 1024);
    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [invData, promoData] = await Promise.all([
        getInventario(),
        getPromocionesActivas()
      ]);
      setProductos(invData || []);
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

  const handleItemClick = (item, esPromocion = false) => {
    const itemNormalizado = esPromocion ? {
      ...item,
      es_promocion: true,
      id_original: item.producto_id,
      nombre_mostrar: `PROMO: ${item.cantidad_kg}Kg ${item.nombre_producto}`,
      unidad_medida: 'Kg',
      precio_unitario_calculado: Number(item.precio_promocional) / Number(item.cantidad_kg)
    } : {
      ...item,
      es_promocion: false,
      id_original: item.id,
      nombre_mostrar: item.nombre,
      unidad_medida: item.unidad_medida,
      precio_unitario_calculado: Number(item.precio_unitario)
    };

    setSelectedProduct(itemNormalizado);
    setCantidadToAdd(esPromocion ? String(item.cantidad_kg) : '');
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
    const precio = selectedProduct.precio_unitario_calculado;
    const subtotal = cantidad * precio;
    
    const existingIndex = carrito.findIndex(item => 
      item.itemNormalizado.id === selectedProduct.id && 
      item.itemNormalizado.es_promocion === selectedProduct.es_promocion
    );

    if (existingIndex >= 0) {
      const newCarrito = [...carrito];
      newCarrito[existingIndex].cantidad += cantidad;
      newCarrito[existingIndex].subtotal += subtotal;
      setCarrito(newCarrito);
    } else {
      setCarrito([...carrito, { itemNormalizado: selectedProduct, cantidad, subtotal }]);
    }
    
    handleCloseProductModal();
  };

  const removeFromCart = (index) => {
    const newCarrito = [...carrito];
    newCarrito.splice(index, 1);
    setCarrito(newCarrito);
    if (newCarrito.length === 0) setIsCartModalOpen(false);
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + item.subtotal, 0);

  const iniciarCobro = () => {
    if (carrito.length === 0) return;
    setIsCartModalOpen(false);
    setStep('metodos');
    setMetodoPago(null);
    setIsCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    setIsCheckoutOpen(false);
    setStep('metodos');
    setMetodoPago(null);
    setMpStatus(null);
  };

  const seleccionarMetodo = (metodo) => {
    setMetodoPago(metodo);
    setStep('confirmacion');
  };

  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    if (!clienteForm.nombre) return;
    setCreandoCliente(true);
    try {
      const nuevoCliente = await createCliente({
        nombre: `${clienteForm.nombre} ${clienteForm.apellido}`.trim(),
        telefono: clienteForm.telefono,
        email: ''
      });
      setClienteAsignado(nuevoCliente);
      setIsClienteModalOpen(false);
      setClienteForm({ nombre: '', apellido: '', telefono: '' });
      if (carrito.length > 0) {
        iniciarCobro();
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      alert('Error al registrar cliente');
    } finally {
      setCreandoCliente(false);
    }
  };

  const handleCobroMercadoPago = async () => {
    setProcesando(true);
    setMpStatus('waiting');
    setMensaje(null);
    try {
      const pedidoIdTemp = `VTA-${Date.now()}`;
      const intent = await cobrarConPoint(totalCarrito, pedidoIdTemp, '0');
      
      const pId = intent.id;

      const interval = setInterval(async () => {
        try {
          const statusData = await getPaymentIntentStatus(pId);
          const status = statusData.status;
          if (status === 'processed') {
             clearInterval(interval);
             setMpStatus('approved');
             await confirmarVenta(); // Completa la venta real en Supabase
          } else if (status === 'canceled' || status === 'failed' || status === 'expired') {
             clearInterval(interval);
             setProcesando(false);
             setMpStatus(null);
             setMensaje({ type: 'error', text: 'El cobro fue cancelado o rechazado en la terminal.' });
          }
        } catch (e) {
          console.error("Error consultando estado:", e);
        }
      }, 3000);

      setPollingInterval(interval);
    } catch (error) {
      setProcesando(false);
      setMpStatus(null);
      setMensaje({ type: 'error', text: 'Error al iniciar el cobro en el terminal físico. Revisa tus credenciales.' });
    }
  };

  const confirmarVenta = async () => {
    if (carrito.length === 0 || !metodoPago) return;

    setProcesando(true);
    try {
      for (const cartItem of carrito) {
        const prodDb = productos.find(p => p.id === cartItem.itemNormalizado.id_original);
        if (prodDb) {
          const stockActual = Number(prodDb.cantidad);
          const nuevaCantidad = stockActual - cartItem.cantidad;
          await updateMercaderia(prodDb.id, { cantidad: nuevaCantidad });
        }
      }

      const itemsParaVenta = carrito.map(c => ({
        producto: { 
           id: c.itemNormalizado.id_original, 
           nombre: c.itemNormalizado.nombre_mostrar,
           precio_unitario: c.itemNormalizado.precio_unitario_calculado
        },
        cantidad: c.cantidad,
        subtotal: c.subtotal
      }));

      await registrarVentaDirecta(totalCarrito, metodoPago, itemsParaVenta, clienteAsignado ? clienteAsignado.id : null);

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
      
      setCarrito([]);
      setClienteAsignado(null);
      handleCloseCheckout();
      cargarDatos();
    } catch (error) {
      console.error('Error al confirmar venta:', error);
      setMensaje({ type: 'error', text: 'Ocurrió un error al procesar la venta.' });
    } finally {
      setProcesando(false);
    }
  };

  const renderCarritoUI = () => (
    <div className={isMobile ? "" : "glass-panel"} style={{ 
      padding: isMobile ? '0' : '24px', 
      position: isMobile ? 'relative' : 'sticky', 
      top: isMobile ? '0' : '24px', 
      display: 'flex', 
      flexDirection: 'column', 
      height: isMobile ? '80vh' : 'calc(100vh - 100px)' 
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
        <ShoppingCart size={24} color="var(--accent-primary)" /> Carrito {isMobile && <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>({carrito.length} ítems)</span>}
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
                background: item.itemNormalizado.es_promocion ? 'rgba(236, 72, 153, 0.1)' : (isMobile ? 'var(--panel-bg)' : 'rgba(255,255,255,0.02)'), 
                padding: '12px', 
                borderRadius: '8px',
                border: item.itemNormalizado.es_promocion ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid var(--glass-border)'
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px', color: item.itemNormalizado.es_promocion ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {item.itemNormalizado.nombre_mostrar}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {item.cantidad} {item.itemNormalizado.unidad_medida} x ${(item.itemNormalizado.precio_unitario_calculado).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--success)' }}>
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

      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: 'auto', background: isMobile ? 'var(--bg-color)' : 'transparent' }}>
        {/* CLIENTE INFO / BUTTON */}
        <div style={{ marginBottom: '16px' }}>
          {clienteAsignado ? (
            <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>Cliente Asignado:</p>
                <p style={{ fontWeight: 600 }}>{clienteAsignado.nombre}</p>
              </div>
              <button onClick={() => setClienteAsignado(null)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Remover Cliente">
                <X size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsClienteModalOpen(true)}
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--glass-border)', borderRadius: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
              className="hover-scale"
            >
              <UserPlus size={20} /> Asignar Cliente (Opcional)
            </button>
          )}
        </div>

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
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile && carrito.length > 0 ? '100px' : '40px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      
      {/* COLUMNA IZQUIERDA: PRODUCTOS Y PROMOCIONES */}
      <div style={{ flex: isMobile ? '1 1 100%' : '1 1 60%' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Punto de Venta</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Seleccione promociones o productos para agregarlos al carrito</p>
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
            Cargando catálogo...
          </div>
        ) : (
          <>
            {/* SECCIÓN PROMOCIONES */}
            {promociones.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                  <Megaphone size={24} /> Promociones Destacadas
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                  {promociones.map((promo) => (
                    <div
                      key={promo.id}
                      className="glass-panel hover-scale"
                      style={{
                        padding: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        border: '2px solid var(--accent-primary)',
                        transition: 'all 0.2s ease-in-out',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => handleItemClick(promo, true)}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--accent-primary)', color: 'white', padding: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        ¡PROMO ESPECIAL!
                      </div>
                      
                      {promo.imagen_url ? (
                        <img 
                          src={promo.imagen_url} 
                          alt={promo.nombre_producto} 
                          style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '50%', marginBottom: '16px', marginTop: '24px', border: '3px solid rgba(255,255,255,0.1)' }} 
                        />
                      ) : (
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '50%', marginBottom: '16px', marginTop: '24px' }}>
                          <Tag size={40} color="var(--accent-primary)" />
                        </div>
                      )}
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>{promo.nombre_producto}</h3>
                      <p style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px', fontWeight: 600, marginBottom: '8px' }}>
                        {promo.cantidad_kg} Kg x ${Number(promo.precio_promocional).toLocaleString()}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.9rem' }}>
                        Precio base: ${(Number(promo.precio_promocional) / Number(promo.cantidad_kg)).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} / Kg
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN PRODUCTOS INDIVIDUALES */}
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <Tag size={24} /> Productos Individuales
              </h2>
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
                    onClick={() => handleItemClick(producto, false)}
                  >
                    {producto.imagen_url ? (
                      <img 
                        src={producto.imagen_url} 
                        alt={producto.nombre} 
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', marginBottom: '16px', border: '3px solid rgba(255,255,255,0.05)' }} 
                      />
                    ) : (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '50%', marginBottom: '16px' }}>
                        <Tag size={40} color="var(--text-secondary)" />
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
            </div>
          </>
        )}
      </div>

      {/* COLUMNA DERECHA: CARRITO (SOLO DESKTOP) */}
      {!isMobile && (
        <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column' }}>
          {renderCarritoUI()}
        </div>
      )}

      {/* FLOATING BOTTOM BAR (SOLO MOBILE) */}
      {isMobile && carrito.length > 0 && !isCartModalOpen && !isCheckoutOpen && !selectedProduct && !isClienteModalOpen && (
        <div className="animate-fade-in" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, 
          background: 'var(--panel-bg)', padding: '16px 24px',
          borderTop: '1px solid var(--glass-border)', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 90
        }}>
          <div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{carrito.length} ítems</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>
              ${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
            </div>
          </div>
          <button onClick={() => setIsCartModalOpen(true)} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '24px' }}>
            <ShoppingCart size={20} /> Ver Carrito
          </button>
        </div>
      )}

      {/* MODAL CARRITO (SOLO MOBILE) */}
      {isMobile && isCartModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end',
          zIndex: 100, backdropFilter: 'blur(5px)'
        }}>
          <div className="animate-fade-in" style={{ width: '100%', background: 'var(--bg-color)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px' }}>
             <button onClick={() => setIsCartModalOpen(false)} style={{ display: 'block', margin: '0 auto 16px', background: 'var(--text-secondary)', border: 'none', width: '40px', height: '6px', borderRadius: '4px', opacity: 0.5, cursor: 'pointer' }}></button>
             {renderCarritoUI()}
          </div>
        </div>
      )}

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
              {selectedProduct.es_promocion ? <Megaphone size={28} color="var(--accent-primary)" /> : <ShoppingCart size={28} color="var(--accent-primary)" />}
              <h2 style={{ fontSize: '1.4rem' }}>{selectedProduct.nombre_mostrar}</h2>
            </div>

            <form onSubmit={handleAddToCart}>
              <div className="input-group" style={{ marginBottom: '24px' }}>
                <label className="input-label">
                  Peso real en balanza ({selectedProduct.unidad_medida})
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  className="input-field"
                  value={cantidadToAdd}
                  onChange={(e) => setCantidadToAdd(e.target.value)}
                  placeholder="Ej: 3.150"
                  style={{ fontSize: '1.2rem', padding: '12px' }}
                  autoFocus
                />
                {selectedProduct.es_promocion && (
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>
                     Precio promocional: ${(selectedProduct.precio_unitario_calculado).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} por {selectedProduct.unidad_medida}
                   </p>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal calculado:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>
                  ${(Number(cantidadToAdd || 0) * selectedProduct.precio_unitario_calculado).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" onClick={handleCloseProductModal} className="btn" style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={!cantidadToAdd || Number(cantidadToAdd) <= 0} style={{ flex: 2, padding: '16px', fontSize: '1.1rem' }}>
                  Añadir
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
                  disabled={mpStatus === 'waiting'} // Bloquear retroceso si está pagando
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
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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
                  <button onClick={() => seleccionarMetodo('transferencia')} className="btn hover-scale" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', color: '#a855f7', gridColumn: isMobile ? 'span 1' : 'span 2' }}>
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
                    {mpStatus === 'waiting' ? (
                       <div style={{ padding: '16px 0' }}>
                          <Loader className="spin" size={32} color="#38bdf8" style={{ margin: '0 auto 16px', animation: 'spin 2s linear infinite' }} />
                          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Esperando que el cliente pase la tarjeta o pague con QR en el dispositivo físico...</p>
                       </div>
                    ) : (
                       <p style={{ color: 'var(--text-secondary)' }}>Haz clic para enviar el cobro de <strong>${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2})}</strong> al dispositivo físico.</p>
                    )}
                  </div>
                )}
                {metodoPago === 'cuenta_dni' && (
                  <div style={{ padding: '20px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <QrCode size={48} color="#22c55e" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Cuenta DNI</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Pide al cliente que escanee el cartón físico en tu mostrador por <strong>${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2})}</strong> y luego presiona confirmar.</p>
                  </div>
                )}
                {metodoPago === 'tarjeta' && (
                  <div style={{ padding: '20px', background: 'rgba(249, 115, 22, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <CreditCard size={48} color="#f97316" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Posnet Pawway</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Digita manualmente <strong>${totalCarrito.toLocaleString(undefined, {minimumFractionDigits:2})}</strong> en el dispositivo Pawway. Al aprobarse, presiona confirmar.</p>
                  </div>
                )}
                {metodoPago === 'transferencia' && (
                  <div style={{ padding: '20px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', marginBottom: '24px' }}>
                    <Building size={48} color="#a855f7" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Transferencia</h3>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px', fontFamily: 'monospace', margin: '16px 0', fontSize: '1.1rem' }}>
                      CBU: Configurar oportunamente
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>Verifica la acreditación en tu cuenta antes de confirmar.</p>
                  </div>
                )}

                {metodoPago === 'mercado_pago' ? (
                   <button
                     onClick={handleCobroMercadoPago}
                     className="btn btn-primary"
                     disabled={procesando || mpStatus === 'waiting'}
                     style={{ width: '100%', padding: '16px', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                   >
                     {mpStatus === 'waiting' ? 'Esperando Aprobación...' : 'Enviar a Posnet'}
                   </button>
                ) : (
                   <button
                     onClick={confirmarVenta}
                     className="btn btn-primary"
                     disabled={procesando}
                     style={{ width: '100%', padding: '16px', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                   >
                     {procesando ? 'Procesando Venta...' : 'Confirmar Cobro'}
                   </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTRAR CLIENTE */}
      {isClienteModalOpen && (
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
              onClick={() => setIsClienteModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <UserPlus size={28} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.5rem' }}>Registrar Cliente</h2>
            </div>

            <form onSubmit={handleGuardarCliente}>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label className="input-label">Nombre</label>
                <input
                  type="text"
                  className="input-field"
                  value={clienteForm.nombre}
                  onChange={(e) => setClienteForm({...clienteForm, nombre: e.target.value})}
                  required
                  autoFocus
                />
              </div>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label className="input-label">Apellido (Opcional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={clienteForm.apellido}
                  onChange={(e) => setClienteForm({...clienteForm, apellido: e.target.value})}
                />
              </div>
              <div className="input-group" style={{ marginBottom: '24px' }}>
                <label className="input-label">WhatsApp / Teléfono (Opcional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={clienteForm.telefono}
                  onChange={(e) => setClienteForm({...clienteForm, telefono: e.target.value})}
                  placeholder="Ej: +54 9 11 1234-5678"
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" onClick={() => setIsClienteModalOpen(false)} className="btn" style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creandoCliente || !clienteForm.nombre} style={{ flex: 2, padding: '16px', fontSize: '1.1rem' }}>
                  {creandoCliente ? 'Guardando...' : 'Guardar y Cobrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Estilos para animación de carga de MP */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 2s linear infinite; }
      `}} />
    </div>
  );
}
