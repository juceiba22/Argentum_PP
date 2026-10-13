import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LicenciaPanel from '../components/LicenciaPanel';
import { getLicenciasDelComercio } from '../services/licenciasApi';

const fmtFecha = (fecha) => (fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—');
const ultimos4 = (codigo) => `••••-••••-••••-${String(codigo).slice(-4)}`;

export default function MiLicencia() {
  const { tenantId, licenciaValidaHasta } = useAuth();
  const [licencias, setLicencias] = useState([]);

  // Se relee cuando cambia la vigencia (activación por código o pago online).
  const vigenciaKey = licenciaValidaHasta?.getTime() || 0;
  useEffect(() => {
    let vigente = true;
    getLicenciasDelComercio(tenantId)
      .then(data => { if (vigente) setLicencias(data); })
      .catch(err => console.error('Error al cargar licencias:', err));
    return () => { vigente = false; };
  }, [tenantId, vigenciaKey]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '960px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BadgeCheck size={32} /> Mi Licencia
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Estado de tu licencia anual de Argentum, pago y activación.</p>
      </div>

      <LicenciaPanel />

      {licencias.length > 0 && (
        <div className="glass-panel" style={{ marginTop: '24px', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.05rem', padding: '18px 20px 0' }}>Historial</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 20px' }}>Código</th>
                <th style={{ padding: '12px 20px' }}>Origen</th>
                <th style={{ padding: '12px 20px' }}>Desde</th>
                <th style={{ padding: '12px 20px' }}>Hasta</th>
              </tr>
            </thead>
            <tbody>
              {licencias.map(l => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--glass-border)', opacity: l.estado === 'revocada' ? 0.5 : 1 }}>
                  <td style={{ padding: '12px 20px', fontVariantNumeric: 'tabular-nums' }}>{ultimos4(l.codigo)}</td>
                  <td style={{ padding: '12px 20px' }}>{l.origen === 'mercadopago' ? 'Mercado Pago' : 'Código'}{l.estado === 'revocada' ? ' (revocada)' : ''}</td>
                  <td style={{ padding: '12px 20px' }}>{fmtFecha(l.valida_desde)}</td>
                  <td style={{ padding: '12px 20px' }}>{fmtFecha(l.valida_hasta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
