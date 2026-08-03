import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPromocionesActivas } from '../services/promocionesApi';
import { getInventario } from '../services/inventarioApi';
import { registrarPedidoWeb } from '../services/pedidosApi';
import { supabase } from '../services/supabaseClient';
import { Tag, ShoppingCart, Plus, Minus, X, CheckCircle, Info, Package, Search, Filter, ChevronDown } from 'lucide-react';

export default function PromocionesPublicas() {
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('local') || searchParams.get('tenant');

  const [promociones, setPromociones] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [nombreComercio, setNombreComercio] = useState('Lo De Cacho Carnes');
  const [resolvedTenantId, setResolvedTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Categoría seleccionada por defecto: 'todos'
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  // Filtro de búsqueda por texto
  const [busquedaText, setBusquedaText] = useState('');

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

  const CATEGORIAS = [
    { id: 'todos', label: '📋 Todos' },
    { id: 'promociones', label: '🔥 Promociones' },
    { id: 'carne_vacuna', label: '🥩 Carne Vacuna' },
    { id: 'preparados', label: '🍱 Preparados' },
    { id: 'pollo', label: '🍗 Pollo' },
    { id: 'cerdo', label: '🐖 Cerdo' },
    { id: 'achuras', label: '🍢 Achuras' },
    { id: 'huevos', label: '🥚 Huevos' },
    { id: 'pescado', label: '🐟 Pescado' }
  ];

  // Clasificador de productos individuales por categoría según listado oficial
  const clasificarProducto = (item) => {
    const normalizar = (str) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const nombre = normalizar(item.nombre_producto || item.nombre);
    const cat = normalizar(item.categoria);
    const text = `${nombre} ${cat}`;

    // 1. PREPARADOS: Milanesas de carne, Milanesas de pollo, Hamburguesas
    if (
      text.includes('milanesa') ||
      text.includes('hamburguesa') ||
      cat.includes('preparado')
    ) {
      return 'preparados';
    }

    // Excepción para "bife de chorizo" (va a Carne Vacuna, no a Achuras)
    const esBifeDeChorizo = text.includes('bife de chorizo');

    // 2. ACHURAS: Hígado, Riñón, Chinchulines, Molleja, Morcilla, Chorizo colorado, Chorizo de cerdo, Salchicha criolla, Salchicha viena, Lengua, Rabo, Mondongo, Corazón, Seso, Rueda
    if (
      !esBifeDeChorizo &&
      (text.includes('higado') ||
        text.includes('rinon') ||
        text.includes('chinchulin') ||
        text.includes('molleja') ||
        text.includes('morcilla') ||
        text.includes('chorizo') ||
        text.includes('salchicha') ||
        text.includes('lengua') ||
        text.includes('rabo') ||
        text.includes('mondongo') ||
        text.includes('corazon') ||
        text.includes('seso') ||
        text.includes('rueda') ||
        cat.includes('achura') ||
        cat.includes('embutido') ||
        cat.includes('chacinado'))
    ) {
      return 'achuras';
    }

    // 3. HUEVOS: Maple de huevos, Docena de huevos
    if (
      text.includes('huevo') ||
      text.includes('maple') ||
      cat.includes('huevo')
    ) {
      return 'huevos';
    }

    // 4. PESCADO: Filet de merluza
    if (
      text.includes('merluza') ||
      text.includes('pescado') ||
      cat.includes('pescado') ||
      cat.includes('marisco')
    ) {
      return 'pescado';
    }

    // 5. CERDO: Pechito de cerdo, Matambre de cerdo, Carré de cerdo, Solomillo, Churrasquitos, Bondiola, Panceta ahumada, Panceta salada
    if (
      text.includes('pechito') ||
      text.includes('matambre de cerdo') ||
      text.includes('carre') ||
      text.includes('solomillo') ||
      text.includes('churrasquito') ||
      text.includes('bondiola') ||
      text.includes('panceta') ||
      text.includes('cerdo') ||
      cat.includes('cerdo') ||
      cat.includes('porcino')
    ) {
      return 'cerdo';
    }

    // 6. POLLO: Pollo, Pechuga, Pata y muslo, Alitas
    if (
      text.includes('pollo') ||
      text.includes('pechuga') ||
      text.includes('pata') ||
      text.includes('muslo') ||
      text.includes('alita') ||
      text.includes('ala') ||
      cat.includes('pollo') ||
      cat.includes('granja') ||
      cat.includes('ave')
    ) {
      return 'pollo';
    }

    // 7. CARNE VACUNA: Asado, Vacío, Matambre, Entraña, Palomita, Tortuguita, Roast beef, Bife ancho, Ojo de bife, Marucha, Paleta, Nalga, Tapa de nalga, Bola de lomo, Cuadrada, Cuadril, Peceto, Bife angosto, Bife de chorizo, Bife con lomo, Lomo, Carnaza común, Falda, Falda parrillera, Osobuco, Espinazo, Arañita, Colita de cuadril, Tapa de asado.
    return 'carne_vacuna';
  };

  const getItemsPorCategoria = (catId) => {
    if (catId === 'promociones') return promociones;
    if (catId === 'todos') return [...promociones, ...inventario];
    
    const deInventario = inventario.filter(item => clasificarProducto(item) === catId);
    const dePromociones = promociones.filter(item => clasificarProducto(item) === catId);
    return [...dePromociones, ...deInventario];
  };

  const getCountCategoria = (catId) => {
    return getItemsPorCategoria(catId).length;
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + Math.round(item.precio * item.cantidad_carrito), 0);

  const esProductoKg = (item) => {
    if (item.es_promocion) return false;
    const um = (item.unidad_medida || 'kg').toLowerCase();
    return um === 'kg' || um === 'kilo' || um === 'kilos';
  };

  const formatCantidadLabel = (cant, unidad = 'kg', esPromo = false) => {
    const formattedNum = cant.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (esPromo) {
      return `${formattedNum} ${cant === 1 ? 'promo' : 'promos'}`;
    }
    const um = (unidad || 'kg').toLowerCase();
    if (um === 'kg' || um === 'kilo' || um === 'kilos') {
      return `${formattedNum} Kg`;
    }
    return `${formattedNum} ${unidad}`;
  };

  const agregarAlCarrito = (producto, cantidadInicial = 1) => {
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
        const isKg = esProductoKg(itemNorm);
        const step = isKg ? 0.25 : 1;
        const nuevaCant = Math.round((existe.cantidad_carrito + step) * 100) / 100;
        return prev.map(i => i.id === itemNorm.id ? { ...i, cantidad_carrito: nuevaCant } : i);
      }
      return [...prev, { ...itemNorm, cantidad_carrito: Math.round(cantidadInicial * 100) / 100 }];
    });
  };

  const modificarCantidad = (id, delta) => {
    setCarrito(prev => {
      return prev.map(i => {
        if (i.id === id) {
          const isKg = esProductoKg(i);
          let change = delta;
          if (delta === 1 || delta === -1) {
            const step = isKg ? 0.25 : 1;
            change = delta > 0 ? step : -step;
          }
          const nuevaCantidad = Math.round((i.cantidad_carrito + change) * 100) / 100;
          return { ...i, cantidad_carrito: Math.max(0, nuevaCantidad) };
        }
        return i;
      }).filter(i => i.cantidad_carrito > 0);
    });
  };

  const fijarCantidadDirecta = (id, exactKg) => {
    setCarrito(prev => {
      return prev.map(i => {
        if (i.id === id) {
          const nuevaCant = Math.round(Number(exactKg) * 100) / 100;
          return { ...i, cantidad_carrito: Math.max(0, nuevaCant) };
        }
        return i;
      });
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
        const itemTotal = Math.round(item.precio * item.cantidad_carrito);
        const cantTexto = formatCantidadLabel(item.cantidad_carrito, item.unidad_medida, item.es_promocion);
        const detallePromo = item.es_promocion && item.cantidad_kg ? ` (Promo ${item.cantidad_kg} Kg)` : '';
        mensaje += `• ${cantTexto} - ${item.nombre}${detallePromo} - $${itemTotal.toLocaleString('es-AR')}\n`;
      });
      mensaje += `\n*Total a pagar: $${totalCarrito.toLocaleString('es-AR')}*\n`;
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

  // Filtrado final: por defecto busca en 'todos' si hay texto de búsqueda, de lo contrario filtra por categoría
  const listaActual = (() => {
    const baseList = busquedaText.trim() ? getItemsPorCategoria('todos') : getItemsPorCategoria(categoriaSeleccionada);
    if (!busquedaText.trim()) return baseList;

    const normalizar = (str) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const query = normalizar(busquedaText);
    return baseList.filter((item) => {
      const nombre = normalizar(item.nombre_producto || item.nombre);
      const cat = normalizar(item.categoria);
      return nombre.includes(query) || cat.includes(query);
    });
  })();

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

        {/* FILTROS: BARRA DEL BUSCADOR (ARRIBA) + BARRA DE AGRUPAMIENTO DE CATEGORÍAS (ABAJO) */}
        <div 
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            marginBottom: '36px'
          }}
        >
          {/* 1. BARRA DEL BUSCADOR (ARRIBA) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔍 Buscar producto o corte 
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={20} color="#f97316" style={{ position: 'absolute', left: '16px', pointerEvents: 'none' }} />
              <input
                type="text"
                value={busquedaText}
                onChange={(e) => setBusquedaText(e.target.value)}
                placeholder="Ej: asado, milanesa, pechuga, matambre..."
                style={{
                  width: '100%',
                  padding: '16px 48px 16px 48px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '1.05rem',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                }}
                onFocus={(e) => e.target.style.borderColor = '#f97316'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
              {busquedaText && (
                <button
                  onClick={() => setBusquedaText('')}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                  title="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* 2. BARRA DE AGRUPAMIENTO / CATEGORÍAS (ABAJO DEL BUSCADOR) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Barra de Agrupamiento (Categorías)
            </label>

            <div 
              className="category-tabs-wrapper"
              style={{ 
                display: 'flex', 
                gap: '8px', 
                overflowX: 'auto', 
                paddingBottom: '8px',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'thin'
              }}
            >
              {CATEGORIAS.map(cat => {
                const count = getCountCategoria(cat.id);
                const isActive = categoriaSeleccionada === cat.id && !busquedaText;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategoriaSeleccionada(cat.id);
                      setBusquedaText('');
                    }}
                    style={{
                      background: isActive 
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' 
                        : 'rgba(15, 23, 42, 0.8)',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      border: isActive ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontSize: '0.92rem',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 4px 12px rgba(249, 115, 22, 0.4)' : 'none'
                    }}
                  >
                    <span>{cat.label}</span>
                    <span 
                      style={{
                        background: isActive ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* INDICADOR DE RESUMEN DE FILTROS Y RESULTADOS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Mostrando <strong style={{ color: '#f8fafc' }}>{listaActual.length}</strong> {listaActual.length === 1 ? 'resultado' : 'resultados'}
              {busquedaText ? (
                <span> buscando "<strong style={{ color: '#10b981' }}>{busquedaText}</strong>" (en todos por defecto)</span>
              ) : (
                <span> en <strong style={{ color: '#f97316' }}>{CATEGORIAS.find(c => c.id === categoriaSeleccionada)?.label}</strong></span>
              )}
            </div>

            {(categoriaSeleccionada !== 'todos' || busquedaText) && (
              <button
                onClick={() => {
                  setCategoriaSeleccionada('todos');
                  setBusquedaText('');
                }}
                style={{
                  background: 'rgba(249, 115, 22, 0.15)',
                  color: '#f97316',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  padding: '6px 14px',
                  borderRadius: '99px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Resetear filtros
              </button>
            )}
          </div>
        </div>

        {/* LISTADO DE PRODUCTOS */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.2rem', padding: '40px' }}>
            Cargando catálogo...
          </div>
        ) : listaActual.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Tag size={64} color="#475569" style={{ margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: '1.5rem', color: '#e2e8f0', marginBottom: '8px' }}>
              {busquedaText 
                ? `No se encontraron productos para "${busquedaText}"`
                : 'No hay productos disponibles en esta categoría en este momento.'}
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              {busquedaText 
                ? 'Intenta buscar con otra palabra clave o reseteá la búsqueda.' 
                : '¡Probá seleccionando otra categoría en el menú desplegable arriba!'}
            </p>
            {(busquedaText || categoriaSeleccionada !== 'promociones') && (
              <button
                onClick={() => {
                  setBusquedaText('');
                  setCategoriaSeleccionada('promociones');
                }}
                style={{
                  background: '#f97316',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Ver todas las promociones
              </button>
            )}
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

                    {/* CONTROLES DE CANTIDAD (PASO DE 0.25 EN CORTES Y SELECCIÓN RÁPIDA DE PESOS) */}
                    {itemEnCarrito ? (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px', border: '1px solid rgba(249, 115, 22, 0.4)' }}>
                          <button onClick={() => modificarCantidad(prod.id, -1)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Disminuir">
                            <Minus size={18} />
                          </button>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', display: 'block' }}>
                              {formatCantidadLabel(itemEnCarrito.cantidad_carrito, itemEnCarrito.unidad_medida, itemEnCarrito.es_promocion)}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                              Total: ${Math.round(precio * itemEnCarrito.cantidad_carrito).toLocaleString('es-AR')}
                            </span>
                          </div>
                          <button onClick={() => modificarCantidad(prod.id, 1)} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: 'none', width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Aumentar">
                            <Plus size={18} />
                          </button>
                        </div>

                        {/* CHIPS DE PESOS FRACCIONADOS PARA CORTES */}
                        {esProductoKg({ ...prod, es_promocion: esPromo }) && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {[1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3].map(kgVal => (
                              <button
                                key={kgVal}
                                onClick={() => fijarCantidadDirecta(prod.id, kgVal)}
                                style={{
                                  padding: '3px 7px',
                                  fontSize: '0.72rem',
                                  fontWeight: itemEnCarrito.cantidad_carrito === kgVal ? 800 : 600,
                                  borderRadius: '6px',
                                  border: itemEnCarrito.cantidad_carrito === kgVal ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                                  background: itemEnCarrito.cantidad_carrito === kgVal ? 'rgba(249, 115, 22, 0.3)' : 'rgba(15, 23, 42, 0.6)',
                                  color: itemEnCarrito.cantidad_carrito === kgVal ? '#f97316' : '#94a3b8',
                                  cursor: 'pointer'
                                }}
                              >
                                {kgVal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}k
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: '16px' }}>
                        <button 
                          style={{
                            width: '100%',
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
                          onClick={() => agregarAlCarrito(prod, 1)}
                        >
                          <ShoppingCart size={18} /> Agregar al carrito
                        </button>

                        {/* CHIPS DE PESO RÁPIDO PARA AGREGAR DIRECTO AL CARRITO */}
                        {esProductoKg({ ...prod, es_promocion: esPromo }) && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {[1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3].map(kgVal => (
                              <button
                                key={kgVal}
                                onClick={() => agregarAlCarrito(prod, kgVal)}
                                style={{
                                  padding: '3px 7px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  background: 'rgba(15, 23, 42, 0.6)',
                                  color: '#94a3b8',
                                  cursor: 'pointer'
                                }}
                                title={`Agregar ${kgVal} Kg`}
                              >
                                +{kgVal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}k
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
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

            <div style={{ maxHeight: '45vh', overflowY: 'auto', marginBottom: '24px', paddingRight: '8px' }}>
              {carrito.map(item => {
                const itemSubtotal = Math.round(item.precio * item.cantidad_carrito);
                return (
                  <div key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ color: 'white', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{item.nombre}</h4>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                          ${item.precio.toLocaleString('es-AR')} c/u — Subtotal: <strong style={{ color: '#10b981' }}>${itemSubtotal.toLocaleString('es-AR')}</strong>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button onClick={() => modificarCantidad(item.id, -1)} style={{ background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer', padding: '4px' }}><Minus size={16} /></button>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', minWidth: '45px', textAlign: 'center' }}>
                          {formatCantidadLabel(item.cantidad_carrito, item.unidad_medida, item.es_promocion)}
                        </span>
                        <button onClick={() => modificarCantidad(item.id, 1)} style={{ background: 'none', color: '#10b981', border: 'none', cursor: 'pointer', padding: '4px' }}><Plus size={16} /></button>
                      </div>
                    </div>
                    {/* Chips de peso directo dentro del modal del carrito para cortes */}
                    {esProductoKg(item) && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {[1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3].map(kgVal => (
                          <button
                            key={kgVal}
                            onClick={() => fijarCantidadDirecta(item.id, kgVal)}
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              fontWeight: item.cantidad_carrito === kgVal ? 800 : 500,
                              borderRadius: '4px',
                              border: item.cantidad_carrito === kgVal ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                              background: item.cantidad_carrito === kgVal ? 'rgba(249, 115, 22, 0.3)' : 'rgba(0,0,0,0.2)',
                              color: item.cantidad_carrito === kgVal ? '#f97316' : '#94a3b8',
                              cursor: 'pointer'
                            }}
                          >
                            {kgVal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}k
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>Total</span>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>${totalCarrito.toLocaleString('es-AR')}</span>
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
        
        .category-tabs-wrapper::-webkit-scrollbar {
          height: 6px;
        }
        .category-tabs-wrapper::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 999px;
        }
        .category-tabs-wrapper::-webkit-scrollbar-thumb {
          background: #f97316;
          border-radius: 999px;
        }

        @media (max-width: 640px) {
          .category-tabs-wrapper button {
            padding: 8px 14px !important;
            font-size: 0.85rem !important;
          }
          .category-tabs-wrapper button span:last-child {
            font-size: 0.7rem !important;
            padding: 1px 6px !important;
          }
        }
      `}} />
    </div>
  );
}
