import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Sparkles, CheckCircle2, MessageCircle, LogOut, ExternalLink, Lock
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function PaywallScreen() {
  const navigate = useNavigate();
  const { user, trialEndsAt } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleIrAlCheckout = () => {
    // Redirige al link de pago o checkout del plan Pro de Argentum
    window.open('https://mpago.la/pos-argentum-pro', '_blank');
  };

  const handleContactarSoporte = () => {
    const text = encodeURIComponent(`Hola, mi periodo de prueba en Argentum finalizó y necesito activar la Licencia Pro para el correo: ${user?.email || ''}`);
    window.open(`https://wa.me/5491178270751?text=${text}`, '_blank');
  };

  const fechaVencimientoFormateada = trialEndsAt 
    ? new Date(trialEndsAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'recientemente';

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.08), transparent 50%), radial-gradient(circle at bottom left, rgba(197, 160, 89, 0.08), transparent 50%), #0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '40px 32px',
        textAlign: 'center',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        position: 'relative'
      }}>
        
        {/* Icono de Alerta de Expiración */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid var(--danger)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <ShieldAlert size={40} />
        </div>

        <h1 className="brand-title" style={{ fontSize: '2.2rem', marginBottom: '8px', color: '#ffffff' }}>
          Argentum
        </h1>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
          Tu Periodo de Prueba de 15 Días ha Finalizado
        </h2>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
          El periodo de prueba gratuita para la cuenta <strong style={{ color: '#f8fafc' }}>{user?.email}</strong> venció el {fechaVencimientoFormateada}. Para continuar operando tu comercio sin interrupciones, activa tu <strong>Licencia Pro</strong>.
        </p>

        {/* Card Beneficios del Plan Pro */}
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'left',
          marginBottom: '28px'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> Beneficios del Plan Pro Argentum:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--success)" /> Facturación Electrónica ARCA Ilimitada
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--success)" /> Terminal Punto de Venta (POS) & Mercado Pago Point
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--success)" /> Gestión de Inventario & Reportes de Inteligencia
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--success)" /> Resguardo de Comprobantes & Soporte Prioritario
            </div>
          </div>
        </div>

        {/* Acciones del Paywall */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <button 
            type="button" 
            onClick={handleIrAlCheckout} 
            className="btn btn-primary" 
            style={{ 
              padding: '14px 24px', 
              fontSize: '1.05rem', 
              fontWeight: 800, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              boxShadow: '0 4px 14px rgba(197, 160, 89, 0.4)'
            }}
          >
            <Sparkles size={20} />
            <span>Activar Licencia Pro (Checkout)</span>
            <ExternalLink size={18} />
          </button>

          <button 
            type="button" 
            onClick={handleContactarSoporte} 
            style={{ 
              padding: '12px 20px', 
              borderRadius: '8px',
              border: '1px solid #25D366',
              backgroundColor: 'rgba(37, 211, 102, 0.1)',
              color: '#25D366',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <MessageCircle size={18} />
            <span>Contactar con Soporte de Argentum (+5491178270751)</span>
          </button>

          <button 
            type="button" 
            onClick={handleSignOut} 
            style={{ 
              marginTop: '12px',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={16} /> Cerrar Sesión / Cambiar de Cuenta
          </button>

        </div>

      </div>
    </div>
  );
}
