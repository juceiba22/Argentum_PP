import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
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
        
        // 1. Inyección de roles duros según el correo
        if (normalizedEmail === 'admin@argentum.com' || normalizedEmail === 'juceiba22@gmail.com') newRole = 'admin';
        else if (!newRole) newRole = 'admin';

        // 2. Guardar en Supabase permanentemente si es diferente al actual
        if (data.user.user_metadata?.role !== newRole) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: { role: newRole }
          });
          if (updateError) {
            console.error("Error asignando rol:", updateError);
          }
        }

        // 3. Redirección basada en el nuevo rol asignado
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
      setErrorAuth(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: 'radial-gradient(circle at top right, rgba(197, 160, 89, 0.05), transparent 50%), radial-gradient(circle at bottom left, rgba(197, 160, 89, 0.05), transparent 50%)'
    }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="brand-title" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
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

          {errorAuth && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(183, 65, 52, 0.05)', border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} /> 
              <span>{errorAuth}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px' }} disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
