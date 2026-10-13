import { useEffect, useState } from 'react';
import { KeyRound, Copy, Check, Ban, Loader2, AlertCircle } from 'lucide-react';
import {
  esAdminPlataforma,
  generarLicencias,
  listarLicencias,
  revocarLicencia,
  formatearCodigoLicencia
} from '../services/licenciasApi';

const fmtFecha = (fecha) => (fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—');
const ESTADOS = { disponible: 'Disponible', activada: 'Activada', revocada: 'Revocada' };

// Panel interno de Argentum: generar códigos para ventas manuales
// (transferencia, efectivo) y ver todas las licencias. El acceso real lo
// validan las funciones de la base (es_admin_plataforma).
export default function AdminLicencias() {
  const [autorizado, setAutorizado] = useState(null);
  const [licencias, setLicencias] = useState([]);
  const [version, setVersion] = useState(0);

  const [cantidad, setCantidad] = useState(1);
  const [meses, setMeses] = useState(12);
  const [notas, setNotas] = useState('');
  const [generando, setGenerando] = useState(false);
  const [nuevos, setNuevos] = useState([]);
  const [copiado, setCopiado] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    esAdminPlataforma().then(ok => {
      if (!vigente) return;
      setAutorizado(ok);
      if (ok) listarLicencias().then(setLicencias).catch(err => setError(err.message));
    });
    return () => { vigente = false; };
  }, [version]);

  const handleGenerar = async (e) => {
    e.preventDefault();
    setError('');
    setGenerando(true);
    try {
      setNuevos(await generarLicencias({ cantidad, meses, notas }));
      setNotas('');
      setVersion(v => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  };

  const handleRevocar = async (lic) => {
    const aviso = lic.estado === 'activada'
      ? `¿Revocar la licencia de ${lic.nombre_comercio || 'este comercio'}? Pierde el acceso pago que le daba este código.`
      : '¿Revocar este código? Ya no se va a poder activar.';
    if (!window.confirm(aviso)) return;
    try {
      await revocarLicencia(lic.id);
      setVersion(v => v + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const copiar = async (codigo) => {
    await navigator.clipboard.writeText(formatearCodigoLicencia(codigo));
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 1500);
  };

  if (autorizado === null) {
    return <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>;
  }
  if (!autorizado) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Acceso Denegado</h2>
        <p>Esta sección es solo para el equipo de Argentum.</p>
      </div>
    );
  }

  const visibles = licencias.filter(l => filtro === 'todas' || l.estado === filtro);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <KeyRound size={32} /> Licencias (Admin)
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Generá códigos de 16 dígitos para ventas por transferencia o efectivo. Las ventas por Mercado Pago generan y activan su código solas.</p>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid var(--danger)', color: 'var(--danger)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <form className="glass-panel" onSubmit={handleGenerar} style={{ padding: '24px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="input-group" style={{ marginBottom: 0, width: '110px' }}>
          <label className="input-label">Cantidad</label>
          <input type="number" min="1" max="50" className="input-field" value={cantidad} onChange={e => setCantidad(e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0, width: '130px' }}>
          <label className="input-label">Meses</label>
          <input type="number" min="1" max="36" className="input-field" value={meses} onChange={e => setMeses(e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0, flex: '1 1 240px' }}>
          <label className="input-label">Nota interna (cliente, forma de pago)</label>
          <input type="text" className="input-field" placeholder="Ej: Carnicería Don Pedro, transferencia 12/10" value={notas} onChange={e => setNotas(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={generando} style={{ height: '42px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {generando ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />} Generar
        </button>
      </form>

      {nuevos.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', borderColor: 'var(--accent-primary)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Códigos generados</h3>
          {nuevos.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <code style={{ fontSize: '1.2rem', letterSpacing: '0.06em' }}>{formatearCodigoLicencia(n.codigo)}</code>
              <button type="button" className="btn" onClick={() => copiar(n.codigo)} style={{ padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {copiado === n.codigo ? <Check size={16} /> : <Copy size={16} />} {copiado === n.codigo ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <div style={{ padding: '16px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['todas', 'disponible', 'activada', 'revocada'].map(f => (
            <button key={f} type="button" className={`btn ${filtro === f ? 'btn-primary' : ''}`} onClick={() => setFiltro(f)} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              {f === 'todas' ? 'Todas' : ESTADOS[f]} ({f === 'todas' ? licencias.length : licencias.filter(l => l.estado === f).length})
            </button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              {['Código', 'Estado', 'Origen', 'Carnicería', 'Vence', 'Nota', ''].map(h => <th key={h} style={{ padding: '10px 16px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibles.map(l => (
              <tr key={l.id} style={{ borderTop: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                <td style={{ padding: '10px 16px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatearCodigoLicencia(l.codigo)}
                  <button type="button" onClick={() => copiar(l.codigo)} title="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '6px', verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                    {copiado === l.codigo ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </td>
                <td style={{ padding: '10px 16px' }}>{ESTADOS[l.estado]}</td>
                <td style={{ padding: '10px 16px' }}>{l.origen === 'mercadopago' ? 'Mercado Pago' : 'Manual'}</td>
                <td style={{ padding: '10px 16px' }}>{l.nombre_comercio || '—'}</td>
                <td style={{ padding: '10px 16px' }}>{fmtFecha(l.valida_hasta)}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{l.notas || ''}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  {l.estado !== 'revocada' && (
                    <button type="button" onClick={() => handleRevocar(l)} title="Revocar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                      <Ban size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay licencias.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
