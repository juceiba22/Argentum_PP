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
  
  const [confirmAbrirCaja, setConfirmAbrirCaja] = useState(false);
  const [confirmCerrarCaja, setConfirmCerrarCaja] = useState(false);

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
    setProcesando(true);
    try {
      const nuevaCaja = await abrirCaja(user.email, 0);
      setCaja(nuevaCaja);
      setConfirmAbrirCaja(false);
    } catch (error) {
      alert('Error al abrir la caja: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleCerrarCaja = async () => {
    setProcesando(true);
    try {
      await cerrarCaja(caja.id);
      setCaja(null);
      setConfirmCerrarCaja(false);
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
              onClick={() => setConfirmAbrirCaja(true)}
              className="btn hover-scale"
              style={{ background: 'rgba(16, 185, 129, 0.1)', border: '2px solid var(--success)', color: 'var(--success)', padding: '20px 40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold' }}
            >
              <LockOpen size={24} />
              ABRIR CAJA
            </button>
          ) : (
            <button 
              onClick={() => setConfirmCerrarCaja(true)}
              className="btn hover-scale"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '2px solid var(--danger)', color: 'var(--danger)', padding: '20px 40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold' }}
            >
              <Lock size={24} />
              CERRAR CAJA
            </button>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMAR ABRIR CAJA */}
      {confirmAbrirCaja && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
            <LockOpen size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Abrir Caja</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              ¿Deseas abrir la caja para iniciar la jornada de ventas?
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setConfirmAbrirCaja(false)} className="btn" style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                Cancelar
              </button>
              <button onClick={handleAbrirCaja} disabled={procesando} className="btn" style={{ flex: 1, padding: '12px', background: 'var(--success)', color: 'white', border: 'none' }}>
                {procesando ? 'Abriendo...' : 'Sí, Abrir Caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR CERRAR CAJA */}
      {confirmCerrarCaja && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
            <Lock size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Cerrar Caja</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              ¿Estás seguro que deseas CERRAR la caja? No podrás registrar más ventas hasta abrirla de nuevo.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setConfirmCerrarCaja(false)} className="btn" style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                Cancelar
              </button>
              <button onClick={handleCerrarCaja} disabled={procesando} className="btn" style={{ flex: 1, padding: '12px', background: 'var(--danger)', color: 'white', border: 'none' }}>
                {procesando ? 'Cerrando...' : 'Sí, Cerrar Caja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
