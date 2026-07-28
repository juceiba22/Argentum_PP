import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPromocionesActivas } from '../services/promocionesApi';
import { getInventario } from '../services/inventarioApi';
import { registrarPedidoWeb } from '../services/pedidosApi';
import { supabase } from '../services/supabaseClient';
import { Tag, ShoppingCart, Plus, Minus, X, CheckCircle, Info, Package } from 'lucide-react';

export default function PromocionesPublicas() {
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('local') || searchParams.get('tenant');

  const [promociones, setPromociones] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [nombreComercio, setNombreComercio] = useState('Lo De Cacho Carnes');
  const [resolvedTenantId, setResolvedTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Categoría seleccionada por defecto: 'promociones'
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('promociones');

  // Estados del carrito y checkout
  const [carrito, setCarrito] = useState([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [datosEntrega, setDatosEntrega] = useState({ metodo: 'retiro', direccion: '' });
  const [procesando, setProcesando] = useState(false);

  const WHATSAPP_NUMBER = "5491125675158";

  useEffect(() => {
    let isMounted = true;

    // Timer de seguridad para garantizar que la pantalla no se quede en "Cargando..."
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2000);

    const fetchCatalogData = async () => {
      try {
        let activeTenantId = null;

        if (tenantParam) {
          const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tenantParam);
          let query = supabase.from('tenants').select('id, nombre_comercio');
          
          if (isUuid) {
            query = query.eq('id', tenantParam);
          } else {
            query = query.eq('slug', tenantParam.toLowerCase());
          }

          const { data: t } = await query.maybeSingle();
          if (t) {
            activeTenantId = t.id;
            if (t.nombre_comercio) setNombreComercio(t.nombre_comercio);
          }
        }

        if (!activeTenantId) {
          const { data: t } = await supabase.from('tenants').select('id, nombre_comercio').limit(1).maybeSingle();
          if (t) {
            activeTenantId = t.id;
            if (t.nombre_comercio) setNombreComercio(t.nombre_comercio);
          }
        }

        if (isMounted) setResolvedTenantId(activeTenantId);

        // Cargar promociones e inventario de forma segura
        const [promosResult, invResult] = await Promise.allSettled([
          getPromocionesActivas(activeTenantId),
          getInventario(activeTenantId)
        ]);

        if (isMounted) {
          if (promosResult.status === 'fulfilled') {
            setPromociones(promosResult.value || []);
          }
          if (invResult.status === 'fulfilled') {
            setInventario(invResult.value || []);
          }
        }

      } catch (error) {
        console.error("Error al cargar catálogo:", error);
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    fetchCatalogData();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [tenantParam]);

  // Clasificador de productos individuales por categoría
  const clasificarProducto = (item) => {
    const nombre = (item.nombre || '').toLowerCase();
    const cat = (item.categoria || '').toLowerCase();
    
    if (cat.includes('pollo') || cat.includes('granja') || nombre.includes('pollo') || nombre.includes('pata') || nombre.includes('muslo') || nombre.includes('suprema') || nombre.includes('pechuga') || nombre.includes('ala')) {
      return 'pollos';
    }
    if (cat.includes('embutido') || cat.includes('achura') || cat.includes('chacinado') || nombre.includes('chorizo') || nombre.includes('morcilla') || nombre.includes('salchicha') || nombre.includes('salame') || nombre.includes('jamon') || nombre.includes('achura') || nombre.includes('chinchul') || nombre.includes('molleja')) {
      return 'embutidos';
    }
    return 'carnes';
  };

  const productosFiltrados = () => {
    if (categoriaSeleccionada === 'promociones') return promociones;
    if (categoriaSeleccionada === 'todos') return [...promociones, ...inventario];
    return inventario.filter(item => clasificarProducto(item) === categoriaSeleccionada);
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad_carrito), 0);

  const agregarAlCarrito = (producto) => {
    const itemNorm = {
      id: producto.id,
      nombre: producto.nombre_producto || producto.nombre,
      precio: Number(producto.precio_promocional || producto.precio_unitario || 0),
      es_promocion: !!producto.precio_promocional,
      cantidad_kg: producto.cantidad_kg || null,
      unidad_medida: producto.unidad_medida || 'kg',
      imagen_url: producto.imagen_url
    };

    setCarrito(prev => {
      const existe = prev.find(i => i.id === itemNorm.id);
      if (existe) {
        return prev.map(i => i.id === itemNorm.id ? { ...i, cantidad_carrito: i.cantidad_carrito + 1 } : i);
      }
      return [...prev, { ...itemNorm, cantidad_carrito: 1 }];
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
      const itemsAInsertar = carrito.map(item => ({
        nombre_producto: item.nombre,
        cantidad_carrito: item.cantidad_carrito,
        precio_promocional: item.precio
      }));

      await registrarPedidoWeb(totalCarrito, itemsAInsertar, datosEntrega, resolvedTenantId);
      
      // 2. Armar mensaje de WhatsApp
      let mensaje = `¡Hola! Quiero confirmar mi pedido web:\n\n`;
      carrito.forEach(item => {
        const detalleCant = item.cantidad_kg ? ` (Llevá ${item.cantidad_kg} Kg)` : ` (${item.unidad_medida})`;
        mensaje += `• ${item.cantidad_carrito}x ${item.nombre}${detalleCant} - $${Number(item.precio * item.cantidad_carrito).toLocaleString()}\n`;
      });
      mensaje += `\n*Total a pagar: $${totalCarrito.toLocaleString()}*\n`;
      mensaje += `*Método de entrega:* ${datosEntrega.metodo === 'retiro' ? 'Retiro en el local' : 'A domicilio'}\n`;
      if (datosEntrega.metodo === 'domicilio') {
        mensaje += `*Dirección:* ${datosEntrega.direccion}\n`;
      }
      mensaje += `\nEntiendo que el pago es en Efectivo o Transferencia. ¡Gracias!`;

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

  const listaActual = productosFiltrados();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '40px 20px 120px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ENCABEZADO */}
        <header style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '12px', background: 'linear-gradient(to right, #f87171, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {nombreComercio}
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8' }}>Catálogo online de ofertas y cortes seleccionados</p>
        </header>

        {/* NAVEGACIÓN POR CATEGORÍAS (TABS) */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '36px', scrollbarWidth: 'none' }}>
          {[
            { id: 'promociones', label: '🔥 Promociones', count: promociones.length },
            { id: 'carnes', label: '🥩 Carnes', count: inventario.filter(i => clasificarProducto(i) === 'carnes').length },
            { id: 'pollos', label: '🍗 Pollos', count: inventario.filter(i => clasificarProducto(i) === 'pollos').length },
            { id: 'embutidos', label: '🌭 Embutidos', count: inventario.filter(i => clasificarProducto(i) === 'embutidos').length },
            { id: 'todos', label: '📋 Todos', count: promociones.length + inventario.length }
          ].map(cat => {
            const isActive = categoriaSeleccionada === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaSeleccionada(cat.id)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '99px',
                  border: isActive ? '2px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                  background: isActive ? 'rgba(249, 115, 22, 0.2)' : 'rgba(30, 41, 59, 0.7)',
                  color: isActive ? '#f97316' : '#cbd5e1',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{cat.label}</span>
                <span style={{ fontSize: '0.8rem', background: isActive ? '#f97316' : 'rgba(255,255,255,0.1)', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* LISTADO DE PRODUCTOS */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.2rem', padding: '40px' }}>
            Cargando catálogo...
          </div>
        ) : listaActual.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Tag size={64} color="#475569" style={{ margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '1.5rem', color: '#e2e8f0', marginBottom: '8px' }}>No hay productos en esta categoría en este momento.</h2>
            <p style={{ color: '#94a3b8' }}>¡Probá seleccionando otra categoría arriba!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
            {listaActual.map(prod => {
              const esPromo = !!prod.precio_promocional;
              const nombre = prod.nombre_producto || prod.nombre;
              const precio = Number(prod.precio_promocional || prod.precio_unitario || 0);
              const itemEnCarrito = carrito.find(i => i.id === prod.id);

              return (
                <div 
                  key={prod.id} 
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
                  <div style={{ height: '200px', backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden' }}>
                    {prod.imagen_url ? (
                      <img 
                        src={prod.imagen_url} 
                        alt={nombre} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #1e293b, #0f172a)' }}>
                        {esPromo ? <Tag size={64} color="#334155" /> : <Package size={64} color="#334155" />}
                      </div>
                    )}
                    
                    {esPromo ? (
                      <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#ef4444', color: 'white', padding: '6px 14px', borderRadius: '99px', fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                        OFERTA
                      </div>
                    ) : (
                      <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(15, 23, 42, 0.8)', color: '#94a3b8', padding: '6px 12px', borderRadius: '99px', fontWeight: 'bold', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {prod.unidad_medida || 'kg'}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: '#f8fafc' }}>
                      {nombre}
                    </h3>
                    
                    {esPromo ? (
                      <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', color: '#cbd5e1', fontWeight: 600, marginBottom: '16px' }}>
                        Llevá {prod.cantidad_kg} Kg
                      </div>
                    ) : (
                      <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', color: '#94a3b8', fontWeight: 500, marginBottom: '16px' }}>
                        Precio por {prod.unidad_medida || 'kg'}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
                      <div>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px' }}>{esPromo ? 'Precio Especial' : 'Precio'}</p>
                        <p style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                          ${precio.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {itemEnCarrito ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px' }}>
                        <button onClick={() => modificarCantidad(prod.id, -1)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus size={20} />
                        </button>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{itemEnCarrito.cantidad_carrito}</span>
                        <button onClick={() => modificarCantidad(prod.id, 1)} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: 'none', width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={20} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        style={{
                          width: '100%',
                          marginTop: '20px',
                          background: '#f97316',
                          color: 'white',
                          border: 'none',
                          padding: '14px',
                          borderRadius: '12px',
                          fontSize: '1rem',
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
                        onClick={() => agregarAlCarrito(prod)}
                      >
                        <ShoppingCart size={18} /> Agregar al carrito
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WIDGET FLOTANTE DEL CARRITO */}
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

      {/* MODAL DEL CARRITO */}
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
                    <h4 style={{ color: 'white', margin: 0 }}>{item.nombre}</h4>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>${item.precio.toLocaleString()} c/u</span>
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

      {/* MODAL DE CHECKOUT */}
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
                  Recordá que los pedidos online se abonan en <strong>Efectivo</strong> o <strong>Transferencia</strong> al momento de la entrega/retiro.
                </p>
              </div>
            </div>

            <button 
              onClick={handleConfirmarCompra}
              disabled={procesando}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#25D366', color: 'white', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: procesando ? 0.7 : 1 }}
            >
              {procesando ? 'Procesando...' : 'Confirmar Compra por WhatsApp'}
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
