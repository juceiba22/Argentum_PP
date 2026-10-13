import { useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle, MailCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// Alta simple para un vendedor invitado: no crea carnicería, así que no pide
// datos fiscales como OnboardingWizard. Al confirmar el email y entrar,
// provision_tenant_for_current_user lo suma a la carnicería que lo invitó.
export default function RegistroVendedor({ invitacion, onBackToLogin }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', password: '', confirmar: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  const cambiar = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: invitacion.email,
        password: form.password,
        options: { data: { role: 'ventas', nombre: form.nombre, apellido: form.apellido } }
      });
      if (authError) throw authError;
      setListo(true);
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '440px' }}>
      <button type="button" onClick={onBackToLogin} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px', padding: 0 }}>
        <ArrowLeft size={16} /> Ya tengo cuenta
      </button>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 className="brand-title" style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Argentum</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Creá tu usuario para entrar a <strong>{invitacion.nombre_comercio}</strong>
        </p>
      </div>

      {listo ? (
        <div style={{ textAlign: 'center' }}>
          <MailCheck size={40} color="var(--success)" style={{ marginBottom: '12px' }} />
          <p style={{ marginBottom: '8px', fontWeight: 600 }}>Revisá tu email</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Te mandamos un mail a <strong>{invitacion.email}</strong>. Confirmalo (revisá también spam) y después entrá con tu email y contraseña.
          </p>
          <button type="button" className="btn btn-primary" onClick={onBackToLogin} style={{ marginTop: '20px', width: '100%' }}>
            Ir a iniciar sesión
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Nombre *</label>
              <input name="nombre" required className="input-field" value={form.nombre} onChange={cambiar} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Apellido</label>
              <input name="apellido" className="input-field" value={form.apellido} onChange={cambiar} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input-field" value={invitacion.email} readOnly style={{ background: 'var(--surface-muted)' }} />
          </div>
          <div className="input-group">
            <label className="input-label">Contraseña *</label>
            <input name="password" type="password" required className="input-field" value={form.password} onChange={cambiar} />
          </div>
          <div className="input-group">
            <label className="input-label">Repetir contraseña *</label>
            <input name="confirmar" type="password" required className="input-field" value={form.confirmar} onChange={cambiar} />
          </div>
          {error && (
            <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid var(--danger)', color: 'var(--danger)', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            {loading ? 'Creando usuario...' : 'Crear mi usuario'}
          </button>
        </form>
      )}
    </div>
  );
}
