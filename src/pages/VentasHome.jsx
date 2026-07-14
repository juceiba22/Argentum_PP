import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Store, LockOpen, Lock, Activity, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCajaAbierta, abrirCaja, cerrarCaja } from '../services/cajasApi';

export default function VentasHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const cargarCaja = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cajaAbierta = await getCajaAbierta(user.email);
      setCaja(cajaAbierta);
    } catch (error) {
      console.error('Error al cargar caja:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCaja();
  }, [user]);

  const handleAbrirCaja = async () => {
    if (!window.confirm('¿Deseas abrir la caja para iniciar la jornada de ventas?')) return;
    setProcesando(true);
    try {
      const nuevaCaja = await abrirCaja(user.email, 0);
      setCaja(nuevaCaja);
    } catch (error) {
      alert('Error al abrir la caja: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleCerrarCaja = async () => {
    if (!window.confirm('¿Estás seguro que deseas CERRAR la caja? No podrás registrar más ventas hasta abrirla de nuevo.')) return;
    setProcesando(true);
    try {
      await cerrarCaja(caja.id);
      setCaja(null);
    } catch (error) {
      alert('Error al cerrar la caja: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Loader className="spin" size={48} color="var(--accent-primary)" style={{ animation: 'spin 2s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '8px' }}>Portal de Ventas</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
          {caja ? 'Caja Abierta - Lista para operar' : 'Caja Cerrada - Debes abrir la caja para vender'}
        </p>
      </header>

      {/* BOTONES PRINCIPALES */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '60px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => navigate('/market?view=promociones')}
          className="glass-panel hover-scale"
          style={{ flex: '1 1 300px', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', cursor: 'pointer', border: '2px solid var(--accent-primary)', background: 'rgba(236, 72, 153, 0.05)' }}
        >
          <Megaphone size={80} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '2rem', margin: 0 }}>Promociones</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Vender ofertas y combos</p>
        </button>

        <button 
          onClick={() => navigate('/market?view=productos')}
          className="glass-panel hover-scale"
          style={{ flex: '1 1 300px', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
        >
          <Store size={80} color="var(--text-primary)" />
          <h2 style={{ fontSize: '2rem', margin: 0 }}>Ventas</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Catálogo general de carnicería</p>
        </button>
      </div>

      {/* CONTROL DE CAJA */}
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', border: caja ? '1px solid var(--success)' : '1px solid var(--danger)' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Activity size={28} />
          Control de Caja
        </h3>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!caja ? (
            <button 
              onClick={handleAbrirCaja}
              disabled={procesando}
              className="btn hover-scale"
              style={{ background: 'rgba(16, 185, 129, 0.1)', border: '2px solid var(--success)', color: 'var(--success)', padding: '20px 40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold' }}
            >
              <LockOpen size={24} />
              {procesando ? 'Procesando...' : 'ABRIR CAJA'}
            </button>
          ) : (
            <button 
              onClick={handleCerrarCaja}
              disabled={procesando}
              className="btn hover-scale"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '2px solid var(--danger)', color: 'var(--danger)', padding: '20px 40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold' }}
            >
              <Lock size={24} />
              {procesando ? 'Procesando...' : 'CERRAR CAJA'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
