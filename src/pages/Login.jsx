import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import OnboardingWizard from '../components/OnboardingWizard';

export default function Login() {
  const navigate = useNavigate();
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorAuth, setErrorAuth] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorAuth('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        let newRole = data.user.user_metadata?.role;
        const normalizedEmail = email.toLowerCase();

        if (normalizedEmail === 'admin@argentum.com' || normalizedEmail === 'juceiba22@gmail.com') {
          newRole = 'admin';
        } else if (normalizedEmail.includes('ventas')) {
          newRole = 'ventas';
        } else if (!newRole) {
          newRole = 'admin';
        }

        if (data.user.user_metadata?.role !== newRole) {
          await supabase.auth.updateUser({
            data: { role: newRole }
          }).catch(console.error);
        }

        navigate('/market');
      }
    } catch (error) {
      console.error(error);
      const msg = (error.message || '').toLowerCase();
      if (error.code === 'email_not_confirmed' || msg.includes('not confirmed')) {
        setErrorAuth('Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam) y hacé clic en el enlace de confirmación antes de iniciar sesión.');
      } else {
        setErrorAuth(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px',
      background: 'radial-gradient(circle at top right, rgba(197, 160, 89, 0.05), transparent 50%), radial-gradient(circle at bottom left, rgba(197, 160, 89, 0.05), transparent 50%)'
    }}>
      {modo === 'registro' ? (
        <OnboardingWizard onBackToLogin={() => setModo('login')} />
      ) : (
        <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 className="brand-title" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
              Argentum
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Plataforma POS y Facturación Electrónica</p>
          </div>

          {/* Selector de Modo (Iniciar Sesión vs Crear Cuenta) */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '28px' }}>
            <button
              type="button"
              onClick={() => setModo('login')}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                borderBottom: '2px solid var(--accent-primary)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogIn size={18} /> Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setModo('registro')}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                borderBottom: '2px solid transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <UserPlus size={18} /> Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="tuemail@ejemplo.com" 
                  style={{ paddingLeft: '42px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="••••••••" 
                  style={{ paddingLeft: '42px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {errorAuth && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(183, 65, 52, 0.05)', border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> 
                <span>{errorAuth}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px', fontSize: '1rem', fontWeight: 700 }} disabled={loading}>
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            ¿Comercio nuevo?{' '}
            <button 
              type="button" 
              onClick={() => setModo('registro')} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Dá de alta tu comercio en 4 pasos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
