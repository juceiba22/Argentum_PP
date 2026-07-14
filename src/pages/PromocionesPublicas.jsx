import React, { useEffect, useState } from 'react';
import { getPromocionesActivas } from '../services/promocionesApi';
import { registrarPedidoWeb } from '../services/pedidosApi';
import { Tag, ShoppingCart, Plus, Minus, X, CheckCircle, Info } from 'lucide-react';

export default function PromocionesPublicas() {
  const [promociones, setPromociones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del carrito y checkout
  const [carrito, setCarrito] = useState([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [datosEntrega, setDatosEntrega] = useState({ metodo: 'retiro', direccion: '' });
  const [procesando, setProcesando] = useState(false);

  const WHATSAPP_NUMBER = "5491125675158";

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const data = await getPromocionesActivas();
        setPromociones(data || []);
      } catch (error) {
        console.error("Error al cargar promociones:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPromos();
  }, []);

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio_promocional * item.cantidad_carrito), 0);

  const agregarAlCarrito = (promo) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === promo.id);
      if (existe) {
        return prev.map(i => i.id === promo.id ? { ...i, cantidad_carrito: i.cantidad_carrito + 1 } : i);
      }
      return [...prev, { ...promo, cantidad_carrito: 1 }];
    });
  };

  const modificarCantidad = (id, delta) => {
    setCarrito(prev => {
      return prev.map(i => {
        if (i.id === id) {
          const nuevaCantidad = i.cantidad_carrito + delta;
          return { ...i, cantidad_carrito: Math.max(0, nuevaCantidad) };
        }
        return i;
      }).filter(i => i.cantidad_carrito > 0);
    });
  };

  const handleConfirmarCompra = async () => {
    if (carrito.length === 0) return;
    
    if (datosEntrega.metodo === 'domicilio' && !datosEntrega.direccion.trim()) {
      alert("Por favor, ingresá tu dirección para el envío a domicilio.");
      return;
    }

    setProcesando(true);
    try {
      // 1. Guardar en Base de Datos
      await registrarPedidoWeb(totalCarrito, carrito, datosEntrega);
      
      // 2. Armar mensaje de WhatsApp
      let mensaje = `¡Hola! Quiero confirmar mi pedido web:\n\n`;
      carrito.forEach(item => {
        mensaje += `• ${item.cantidad_carrito}x ${item.nombre_producto} ($${Number(item.precio_promocional * item.cantidad_carrito).toLocaleString()})\n`;
      });
      mensaje += `\n*Total a pagar: $${totalCarrito.toLocaleString()}*\n`;
      mensaje += `*Método de entrega:* ${datosEntrega.metodo === 'retiro' ? 'Retiro en el local' : 'A domicilio'}\n`;
      if (datosEntrega.metodo === 'domicilio') {
        mensaje += `*Dirección:* ${datosEntrega.direccion}\n`;
      }
      mensaje += `\nEntiendo que el pago es en Efectivo o Transferencia al alias lodecacho.carnes. ¡Gracias!`;

      // 3. Abrir WhatsApp y limpiar carrito
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
      
      setCarrito([]);
      setIsCheckoutModalOpen(false);
      setIsCartModalOpen(false);
      setDatosEntrega({ metodo: 'retiro', direccion: '' });
      
    } catch (error) {
      console.error("Error al registrar pedido:", error);
      alert("Hubo un error al procesar tu pedido: " + (error.message || JSON.stringify(error)));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '40px 20px 120px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '16px', background: 'linear-gradient(to right, #f87171, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Lo de Cacho Carnes
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>Las mejores ofertas en cortes seleccionados para vos.</p>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.2rem', padding: '40px' }}>
            Cargando las mejores ofertas...
          </div>
        ) : promociones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Tag size={64} color="#475569" style={{ margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '1.5rem', color: '#e2e8f0', marginBottom: '8px' }}>No hay promociones activas en este momento.</h2>
            <p style={{ color: '#94a3b8' }}>¡Vuelve pronto para ver nuestras ofertas!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '32px' }}>
            {promociones.map(promo => {
              const itemEnCarrito = carrito.find(i => i.id === promo.id);
              return (
                <div 
                  key={promo.id} 
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                  }}
                >
                  <div style={{ height: '220px', backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden' }}>
                    {promo.imagen_url ? (
                      <img 
                        src={promo.imagen_url} 
                        alt={promo.nombre_producto} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #1e293b, #0f172a)' }}>
                        <Tag size={64} color="#334155" />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '99px', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                      OFERTA
                    </div>
                  </div>

                  <div style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: '#f8fafc' }}>
                      {promo.nombre_producto}
                    </h3>
                    <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', color: '#cbd5e1', fontWeight: 600, marginBottom: '16px' }}>
                      Llevá {promo.cantidad_kg} Kg
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
                      <div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '4px' }}>Precio Especial</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                          ${Number(promo.precio_promocional).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {itemEnCarrito ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px' }}>
                        <button onClick={() => modificarCantidad(promo.id, -1)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus size={20} />
                        </button>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{itemEnCarrito.cantidad_carrito}</span>
                        <button onClick={() => modificarCantidad(promo.id, 1)} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: 'none', width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={20} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        style={{
                          width: '100%',
                          marginTop: '24px',
                          background: '#f97316',
                          color: 'white',
                          border: 'none',
                          padding: '16px',
                          borderRadius: '12px',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#ea580c'}
                        onMouseOut={e => e.currentTarget.style.background = '#f97316'}
                        onClick={() => agregarAlCarrito(promo)}
                      >
                        <ShoppingCart size={20} /> Agregar al carrito
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING CART WIDGET */}
      {carrito.length > 0 && !isCartModalOpen && !isCheckoutModalOpen && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '50%', transform: 'translateX(50%)',
          background: 'rgba(30, 41, 59, 0.95)', padding: '12px 24px',
          borderRadius: '32px', border: '1px solid #f97316', 
          boxShadow: '0 8px 32px rgba(249, 115, 22, 0.4)',
          display: 'flex', gap: '24px', alignItems: 'center', zIndex: 90,
          backdropFilter: 'blur(10px)',
          width: '90%', maxWidth: '400px', justifyContent: 'space-between',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#f97316', color: 'white', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', lineHeight: 1.2 }}>
                Tu Pedido ({carrito.reduce((acc, item) => acc + item.cantidad_carrito, 0)})
              </span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981', lineHeight: 1.2 }}>
                ${totalCarrito.toLocaleString()}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsCartModalOpen(true)} 
            style={{ padding: '10px 20px', borderRadius: '24px', fontSize: '1rem', whiteSpace: 'nowrap', background: '#f97316', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Ver
          </button>
        </div>
      )}

      {/* CART MODAL */}
      {isCartModalOpen && !isCheckoutModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)',
          padding: '20px'
        }}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#1e293b', borderRadius: '24px', padding: '24px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)', animation: 'slideUp 0.3s ease-out' }}>
            <button onClick={() => setIsCartModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart /> Mi Pedido
            </h2>

            <div style={{ maxHeight: '40vh', overflowY: 'auto', marginBottom: '24px', paddingRight: '8px' }}>
              {carrito.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ color: 'white', margin: 0 }}>{item.nombre_producto}</h4>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>${Number(item.precio_promocional).toLocaleString()} c/u</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                    <button onClick={() => modificarCantidad(item.id, -1)} style={{ background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer' }}><Minus size={16} /></button>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>{item.cantidad_carrito}</span>
                    <button onClick={() => modificarCantidad(item.id, 1)} style={{ background: 'none', color: '#10b981', border: 'none', cursor: 'pointer' }}><Plus size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>Total</span>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>${totalCarrito.toLocaleString()}</span>
            </div>

            <button 
              onClick={() => setIsCheckoutModalOpen(true)}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#f97316', color: 'white', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              Continuar <CheckCircle size={20} />
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)',
          padding: '20px'
        }}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#1e293b', borderRadius: '24px', padding: '24px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)', animation: 'slideUp 0.3s ease-out' }}>
            <button onClick={() => setIsCheckoutModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'white' }}>Confirmar Compra</h2>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '12px' }}>¿Cómo querés recibir tu pedido?</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div 
                  onClick={() => setDatosEntrega({ ...datosEntrega, metodo: 'retiro' })}
                  style={{ flex: 1, padding: '16px', borderRadius: '12px', cursor: 'pointer', border: datosEntrega.metodo === 'retiro' ? '2px solid #f97316' : '1px solid rgba(255,255,255,0.1)', background: datosEntrega.metodo === 'retiro' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(0,0,0,0.2)', textAlign: 'center', color: 'white', fontWeight: 'bold' }}
                >
                  Retiro en el local
                </div>
                <div 
                  onClick={() => setDatosEntrega({ ...datosEntrega, metodo: 'domicilio' })}
                  style={{ flex: 1, padding: '16px', borderRadius: '12px', cursor: 'pointer', border: datosEntrega.metodo === 'domicilio' ? '2px solid #f97316' : '1px solid rgba(255,255,255,0.1)', background: datosEntrega.metodo === 'domicilio' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(0,0,0,0.2)', textAlign: 'center', color: 'white', fontWeight: 'bold' }}
                >
                  A domicilio
                </div>
              </div>
            </div>

            {datosEntrega.metodo === 'domicilio' && (
              <div style={{ marginBottom: '24px', animation: 'fadeInUp 0.3s ease-out' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Dirección de envío</label>
                <input 
                  type="text" 
                  value={datosEntrega.direccion}
                  onChange={(e) => setDatosEntrega({ ...datosEntrega, direccion: e.target.value })}
                  placeholder="Ej: Calle Falsa 123, Timbre 2"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '1rem', outline: 'none' }}
                />
              </div>
            )}

            {/* Banner Informativo de Pago */}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Info color="#3b82f6" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ color: '#e2e8f0', fontSize: '0.95rem', margin: 0, lineHeight: 1.4 }}>
                  Recordá que las promociones exclusivas web se abonan únicamente en <strong>Efectivo</strong> o <strong>Transferencia</strong>.
                </p>
                <p style={{ color: '#93c5fd', fontWeight: 'bold', margin: '8px 0 0 0', fontSize: '1rem' }}>
                  Alias: <span style={{ background: 'rgba(59,130,246,0.2)', padding: '2px 6px', borderRadius: '4px' }}>lodecacho.carnes</span>
                </p>
              </div>
            </div>

            <button 
              onClick={handleConfirmarCompra}
              disabled={procesando}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#25D366', color: 'white', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: procesando ? 0.7 : 1 }}
            >
              {procesando ? 'Procesando...' : 'Confirmar Compra'}
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp { from { opacity: 0; transform: translate(50%, 20px); } to { opacity: 1; transform: translate(50%, 0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
