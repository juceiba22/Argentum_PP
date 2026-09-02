import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import OnboardingWizard from '../components/OnboardingWizard';

// Cuando Supabase no puede completar el login con Google (redirect URL no
// autorizada en el proveedor, cuenta ya existente sin auto-linking habilitado,
// usuario cancela el consentimiento, etc.) no lanza una excepción en
// signInWithOAuth: redirige de vuelta a la app con error/error_description en
// el hash o en la query string de la URL. Sin leer esto, el usuario cae de
// nuevo en la pantalla de login sin ningún mensaje -- lo único que percibe es
// "me autentiqué con Google y no pude entrar", sin pista de qué pasó.
function leerErrorOAuthDeUrl() {
  const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
  const search = window.location.search?.startsWith('?') ? window.location.search.slice(1) : '';
  const params = new URLSearchParams(hash || search);
  const errorDescription = params.get('error_description');
  const errorCode = params.get('error_code') || params.get('error');

  if (!errorDescription && !errorCode) return null;

  // Limpiamos la URL para no reprocesar el mismo error en cada render/recarga.
  window.history.replaceState(null, '', window.location.pathname);

  const descripcionLegible = (errorDescription || '').replace(/\+/g, ' ');

  if (errorCode === 'identity_already_registered' || /already registered|already exists/i.test(descripcionLegible)) {
    return 'Ese email ya tiene una cuenta creada con contraseña en Argentum. Iniciá sesión con tu email y contraseña, o contactá a soporte para vincular tu cuenta de Google.';
  }

  return descripcionLegible || 'No se pudo completar el inicio de sesión con Google. Intentá nuevamente.';
}

export default function Login() {
  const navigate = useNavigate();
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorAuth, setErrorAuth] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const oauthError = leerErrorOAuthDeUrl();
    if (oauthError) setErrorAuth(oauthError);
  }, []);

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

  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorAuth('');
    setLoadingGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setErrorAuth(err.message || 'Ocurrió un error al conectar con Google.');
      setLoadingGoogle(false);
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
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '24px' }}>
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

          {/* Botón de Google OAuth para Experiencia Rápida */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(0,0,0,0.15)',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
              marginBottom: '20px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {loadingGoogle ? 'Conectando con Google...' : 'Continuar con Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0 20px 0', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>o con email</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px', fontSize: '1rem', fontWeight: 700 }} disabled={loading || loadingGoogle}>
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
