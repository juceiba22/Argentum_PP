import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Fake login
    if (email && password) {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.15), transparent 40%)'
    }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
            Argentum
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="email" 
                className="input-field" 
                placeholder="admin@argentum.com" 
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px' }}>
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
