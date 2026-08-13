import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Store, Hash, MapPin, Calendar, CheckCircle2, Clock,
  ShieldCheck, CreditCard, Loader2, XCircle
} from 'lucide-react';

const Badge = ({ ok, textOk, textNo }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700,
    backgroundColor: ok ? 'rgba(74, 124, 89, 0.12)' : 'rgba(210, 142, 61, 0.12)',
    border: `1px solid ${ok ? 'var(--success)' : 'var(--warning)'}`,
    color: ok ? 'var(--success)' : 'var(--warning)'
  }}>
    {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
    {ok ? textOk : textNo}
  </div>
);

const Field = ({ icon, label, value }) => (
  <div style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
    <div style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: '0.98rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{value || '—'}</div>
    </div>
  </div>
);

// Tarjeta de identificación del comercio: muestra de un vistazo los datos
// cargados en el onboarding (incluido el rubro, que hasta ahora no se veía
// en ningún lado de la app) y el estado de trial/licencia, AFIP y MP Point.
// Solo lectura -- para editar cada cosa están las pantallas dedicadas.
export default function PerfilComercio() {
  const {
    loading,
    tenantInfo,
    isTrialActive,
    isLicenseActive,
    hasValidAccess,
    daysRemainingTrial,
    trialEndsAt
  } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Cargando perfil del comercio...</p>
      </div>
    );
  }

  if (!tenantInfo) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No se encontraron datos del comercio para esta cuenta.</p>
      </div>
    );
  }

  const domicilioCompleto = [
    tenantInfo.domicilio_fiscal,
    tenantInfo.localidad,
    tenantInfo.provincia,
    tenantInfo.codigo_postal
  ].filter(Boolean).join(', ');

  const fechaAlta = tenantInfo.created_at
    ? new Date(tenantInfo.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building2 size={32} style={{ color: 'var(--accent-primary)' }} />
          Perfil del Comercio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Datos cargados en el registro de tu comercio.
        </p>
      </div>

      {/* Estado general */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {hasValidAccess === false && <Badge ok={false} textNo="Sin acceso vigente" />}
        {isLicenseActive && <Badge ok textOk="Licencia activa" />}
        {!isLicenseActive && isTrialActive && (
          <Badge ok textOk={`Prueba: ${daysRemainingTrial} días restantes`} />
        )}
        {!isLicenseActive && !isTrialActive && hasValidAccess !== false && (
          <Badge ok={false} textNo="Sin licencia ni prueba activa" />
        )}
        <Badge ok={Boolean(tenantInfo.afip_delegacion_verificada)} textOk="AFIP delegado" textNo="AFIP sin delegar" />
        <Badge ok={Boolean(tenantInfo.mp_integracion_verificada)} textOk="MP Point verificado" textNo="MP Point sin verificar" />
      </div>

      {/* Datos del comercio */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <Field icon={<Store size={20} />} label="Nombre comercial" value={tenantInfo.nombre_comercio} />
        <Field icon={<Building2 size={20} />} label="Razón social" value={tenantInfo.razon_social} />
        <Field icon={<Store size={20} />} label="Rubro" value={tenantInfo.rubro} />
        <Field icon={<Hash size={20} />} label="CUIT" value={tenantInfo.cuit} />
        <Field icon={<Hash size={20} />} label="Condición fiscal" value={tenantInfo.condicion_fiscal} />
        <Field icon={<MapPin size={20} />} label="Domicilio fiscal" value={domicilioCompleto} />
        <Field icon={<Calendar size={20} />} label="Fecha de alta" value={fechaAlta} />
        {trialEndsAt && (
          <Field icon={<Clock size={20} />} label="Vencimiento de prueba" value={new Date(trialEndsAt).toLocaleDateString('es-AR')} />
        )}
      </div>

      {/* Accesos rápidos a configuración */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
        <Link to="/configuracion-fiscal" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} /> Configuración Fiscal (ARCA)
        </Link>
        <Link to="/configuracion-mercadopago" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={16} /> Configuración Mercado Pago
        </Link>
      </div>
    </div>
  );
}
