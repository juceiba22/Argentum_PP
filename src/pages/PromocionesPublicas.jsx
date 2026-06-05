import React, { useEffect, useState } from 'react';
import { getPromocionesActivas } from '../services/promocionesApi';
import { Tag, Send } from 'lucide-react';

export default function PromocionesPublicas() {
  const [promociones, setPromociones] = useState([]);
  const [loading, setLoading] = useState(true);

  const WHATSAPP_NUMBER = "5491167977335";

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

  const handlePedirPorWhatsApp = (promo) => {
    const mensaje = `¡Hola! Me interesa la promoción de *${promo.nombre_producto}* (${promo.cantidad_kg} Kg) por $${Number(promo.precio_promocional).toLocaleString()}.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '16px', background: 'linear-gradient(to right, #f87171, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Carnicería Argentum
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
            {promociones.map(promo => (
              <div 
                key={promo.id} 
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'pointer'
                }}
                className="hover-scale"
                onClick={() => handlePedirPorWhatsApp(promo)}
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
                  {/* Etiqueta flotante de Oferta */}
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

                  <button 
                    style={{
                      width: '100%',
                      marginTop: '24px',
                      background: '#25D366', // WhatsApp color
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
                    onMouseOver={e => e.currentTarget.style.background = '#128C7E'}
                    onMouseOut={e => e.currentTarget.style.background = '#25D366'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePedirPorWhatsApp(promo);
                    }}
                  >
                    <Send size={20} /> Pedir por WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
