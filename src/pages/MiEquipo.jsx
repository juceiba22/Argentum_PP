import { useEffect, useState } from 'react';
import { Users, UserPlus, Mail, Loader2, AlertCircle, CheckCircle2, Copy, Check, X, UserMinus, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  invitarVendedor,
  listarEquipo,
  cancelarInvitacion,
  quitarVendedor,
  notificarInvitacion,
  linkInvitacion
} from '../services/equipoApi';

const fmtFecha = (fecha) => new Date(fecha).toLocaleDateString('es-AR');

export default function MiEquipo() {
  const { tenantId, tenantInfo } = useAuth();
  const [equipo, setEquipo] = useState({ miembros: [], invitaciones: [] });
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const recargar = () => setVersion(v => v + 1);

  const [email, setEmail] = useState('');
  const [invitando, setInvitando] = useState(false);
  const [error, setError] = useState('');
  // Última invitación creada: se muestra el link para compartir.
  const [ultima, setUltima] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarEquipo()
      .then(data => { if (vigente) setEquipo(data); })
      .catch(err => { if (vigente) setError(err.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [version]);

  const handleInvitar = async (e) => {
    e.preventDefault();
    setError('');
    setUltima(null);
    setInvitando(true);
    try {
      const r = await invitarVendedor(email);
      if (!r?.ok) {
        setError(r?.error || 'No se pudo crear la invitación.');
        return;
      }
      const { enviado } = await notificarInvitacion(tenantId, r.id);
      setUltima({ id: r.id, email: r.email, enviado });
      setEmail('');
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setInvitando(false);
    }
  };

  const handleCancelar = async (inv) => {
    if (!window.confirm(`¿Cancelar la invitación a ${inv.email}?`)) return;
    try {
      await cancelarInvitacion(inv.id);
      if (ultima?.id === inv.id) setUltima(null);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuitar = async (m) => {
    if (!window.confirm(`¿Quitar a ${m.email} del equipo? Ya no va a poder entrar a tu carnicería.`)) return;
    try {
      await quitarVendedor(m.user_id);
      recargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const copiarLink = async (id) => {
    await navigator.clipboard.writeText(linkInvitacion(id));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const compartirWhatsApp = (inv) => {
    const comercio = tenantInfo?.nombre_comercio || 'la carnicería';
    const texto = `Te sumé como vendedor en ${comercio} en Argentum. Entrá desde este link con tu email ${inv.email}: ${linkInvitacion(inv.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '920px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={32} /> Mi Equipo
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Invitá a tus vendedores. Entran con su propio usuario y solo ven el mostrador, la caja y las promociones: no ven tus compras, gastos ni estadísticas.
        </p>
      </div>

      <form className="glass-panel" onSubmit={handleInvitar} style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={20} /> Invitar un vendedor
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: '1 1 260px', marginBottom: 0 }}>
            <label className="input-label">Email del vendedor</label>
            <input type="email" required className="input-field" placeholder="vendedor@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={invitando}>
            {invitando ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
            {invitando ? 'Invitando...' : 'Invitar'}
          </button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          Tiene que entrar con ese mismo email (con Google o creando una contraseña). Si ya usa Argentum con su propia carnicería, va a necesitar otro email.
        </p>
      </form>

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid var(--danger)', color: 'var(--danger)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {ultima && (
        <div className="glass-panel" style={{ padding: '18px 22px', marginBottom: '20px', borderColor: 'var(--accent-primary)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700, marginBottom: '6px' }}>
            <CheckCircle2 size={18} color="var(--success)" /> Invitación creada para {ultima.email}
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {ultima.enviado
              ? 'Le mandamos un mail con el link. También podés pasárselo por WhatsApp.'
              : 'Pasale este link por WhatsApp para que entre (el envío por mail no está configurado).'}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => compartirWhatsApp(ultima)}>
              <MessageCircle size={16} /> Enviar por WhatsApp
            </button>
            <button type="button" className="btn" onClick={() => copiarLink(ultima.id)}>
              {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <h2 style={{ fontSize: '1.05rem', padding: '18px 20px 6px' }}>Equipo</h2>
        {cargando ? (
          <p style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>Cargando...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
            <tbody>
              {equipo.miembros.map(m => (
                <tr key={m.user_id}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600 }}>{m.nombre || m.email}{m.soy_yo ? ' (vos)' : ''}</div>
                    {m.nombre && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.email}</div>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-pagado">{m.rol === 'ventas' ? 'Vendedor' : 'Dueño'}</span>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Desde {fmtFecha(m.desde)}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {m.rol === 'ventas' && (
                      <button type="button" className="btn" onClick={() => handleQuitar(m)} style={{ color: 'var(--danger)' }}>
                        <UserMinus size={16} /> Quitar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {equipo.invitaciones.map(inv => (
                <tr key={inv.id}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600 }}>{inv.email}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Invitado el {fmtFecha(inv.created_at)}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-pendiente">Pendiente</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <button type="button" className="btn" onClick={() => compartirWhatsApp(inv)} title="Reenviar por WhatsApp">
                      <MessageCircle size={16} /> Reenviar
                    </button>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button type="button" className="btn" onClick={() => handleCancelar(inv)}>
                      <X size={16} /> Cancelar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
