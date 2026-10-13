import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KeyRound, CreditCard, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  activarLicencia,
  formatearCodigoLicencia,
  getPrecioLicencia,
  iniciarPagoLicencia
} from '../services/licenciasApi';
import { limpiarIntencionCompra } from '../utils/intencionCompra';

const fmtFecha = (fecha) => new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

// Estado de la licencia + activación por código + pago online. Se usa en la
// página "Mi Licencia" y en la pantalla de prueba vencida (PaywallScreen).
export default function LicenciaPanel() {
  const {
    user, tenantId, role, refetchTenantInfo,
    isLicenseActive, licenciaValidaHasta, isTrialActive, daysRemainingTrial
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [codigo, setCodigo] = useState('');
  const [activando, setActivando] = useState(false);
  const [precio, setPrecio] = useState(null);
  const [pagando, setPagando] = useState(false);
  const [mensaje, setMensaje] = useState(() => {
    const pago = searchParams.get('pago');
    if (pago === 'pendiente') return { tipo: 'info', texto: 'Tu pago quedó pendiente de acreditación. Cuando Mercado Pago lo apruebe, la licencia se activa sola.' };
    if (pago === 'rechazado') return { tipo: 'error', texto: 'El pago no se completó. Podés intentarlo de nuevo.' };
    return null;
  });
  // Vuelta desde Mercado Pago: esperamos a que el webhook emita la licencia.
  const [esperandoPago, setEsperandoPago] = useState(searchParams.get('pago') === 'aprobado');
  const licenciaAlVolver = useRef(licenciaValidaHasta?.getTime() || 0);
  // refetchTenantInfo cambia en cada render del contexto: lo leemos de un ref
  // para que el polling no se reinicie con cada refetch.
  const refetchRef = useRef(refetchTenantInfo);
  useEffect(() => { refetchRef.current = refetchTenantInfo; });

  const esVendedor = role === 'ventas';
  // Llegó desde "Comprar la licencia" de la landing (ver App.jsx).
  const [vieneAComprar] = useState(searchParams.get('comprar') === '1');

  useEffect(() => {
    if (vieneAComprar) limpiarIntencionCompra(user);
  }, [vieneAComprar, user]);

  useEffect(() => {
    getPrecioLicencia().then(setPrecio).catch(() => setPrecio(null));
  }, []);

  // Pendiente/rechazado: el mensaje sale del parámetro de vuelta de MP y se
  // limpia la URL para que no reaparezca al recargar.
  useEffect(() => {
    const pago = searchParams.get('pago');
    if ((pago && pago !== 'aprobado') || searchParams.get('comprar')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Mientras esperamos el webhook, releemos la licencia cada 3 s (hasta 1 min).
  useEffect(() => {
    if (!esperandoPago) return;
    let intentos = 0;
    const timer = setInterval(() => {
      intentos += 1;
      refetchRef.current();
      if (intentos >= 20) {
        clearInterval(timer);
        setEsperandoPago(false);
        setSearchParams({}, { replace: true });
        setMensaje({ tipo: 'info', texto: 'Recibimos tu pago pero la licencia todavía no se activó. Puede demorar unos minutos; si no aparece, escribinos.' });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [esperandoPago, setSearchParams]);

  useEffect(() => {
    if (esperandoPago && licenciaValidaHasta && licenciaValidaHasta.getTime() > licenciaAlVolver.current) {
      setEsperandoPago(false);
      setSearchParams({}, { replace: true });
      setMensaje({ tipo: 'ok', texto: `¡Pago confirmado! Tu licencia está activa hasta el ${fmtFecha(licenciaValidaHasta)}. Te mandamos el código por mail.` });
    }
  }, [esperandoPago, licenciaValidaHasta, setSearchParams]);

  const handleActivar = async (e) => {
    e.preventDefault();
    setMensaje(null);
    if (codigo.replace(/\D/g, '').length !== 16) {
      setMensaje({ tipo: 'error', texto: 'El código tiene 16 dígitos.' });
      return;
    }
    setActivando(true);
    try {
      const r = await activarLicencia(codigo);
      if (!r?.ok) {
        setMensaje({ tipo: 'error', texto: r?.error || 'No se pudo activar el código.' });
        return;
      }
      setCodigo('');
      setMensaje({ tipo: 'ok', texto: `¡Licencia activada! Vale hasta el ${fmtFecha(r.valida_hasta)}.` });
      await refetchTenantInfo();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo activar el código.' });
    } finally {
      setActivando(false);
    }
  };

  const handlePagar = async () => {
    setMensaje(null);
    setPagando(true);
    try {
      window.location.href = await iniciarPagoLicencia(tenantId);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
      setPagando(false);
    }
  };

  const colorMensaje = { ok: 'var(--success)', error: 'var(--danger)', info: 'var(--text-secondary)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        {isLicenseActive ? <CheckCircle2 size={28} color="var(--success)" /> : <Clock size={28} color="var(--accent-primary)" />}
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            {isLicenseActive
              ? (licenciaValidaHasta ? `Licencia anual activa hasta el ${fmtFecha(licenciaValidaHasta)}` : 'Licencia activa')
              : isTrialActive
                ? `Período de prueba: ${daysRemainingTrial} ${daysRemainingTrial === 1 ? 'día restante' : 'días restantes'}`
                : 'Tu período de prueba terminó'}
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {isLicenseActive
              ? 'Si activás o pagás otra licencia ahora, se suma a continuación de la vigente.'
              : 'Activá tu licencia anual para seguir usando Argentum sin interrupciones.'}
          </div>
        </div>
      </div>

      {vieneAComprar && !isLicenseActive && (
        <div className="glass-panel" style={{ padding: '18px 22px', borderColor: 'var(--accent-primary)' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>¡Tu carnicería ya está creada!</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Completá el pago con Mercado Pago para activar tu licencia anual. Mientras tanto ya podés usar el sistema con la prueba gratuita.
          </div>
        </div>
      )}

      {esperandoPago && (
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Loader2 className="animate-spin" size={20} /> Confirmando tu pago con Mercado Pago...
        </div>
      )}

      {mensaje && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', border: `1px solid ${colorMensaje[mensaje.tipo]}`, color: colorMensaje[mensaje.tipo], display: 'flex', gap: '8px', alignItems: 'center' }}>
          {mensaje.tipo === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {esVendedor ? (
        <p style={{ color: 'var(--text-secondary)' }}>Pedile al dueño de la carnicería que active la licencia desde su cuenta.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} /> Pagar online
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Pagá con Mercado Pago (tarjeta, dinero en cuenta o efectivo). La licencia se activa sola al aprobarse el pago.
            </p>
            {precio && (
              <p style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px', fontVariantNumeric: 'tabular-nums' }}>
                ${Number(precio.precio).toLocaleString('es-AR')}
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}> / {precio.meses} meses</span>
              </p>
            )}
            <button type="button" className="btn btn-primary" onClick={handlePagar} disabled={pagando || esperandoPago} style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {pagando ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
              {pagando ? 'Abriendo Mercado Pago...' : 'Pagar con Mercado Pago'}
            </button>
          </div>

          <form className="glass-panel" onSubmit={handleActivar} style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={20} /> Tengo un código
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Si pagaste por transferencia o en efectivo, ingresá el código de 16 dígitos que te enviamos.
            </p>
            <input
              className="input-field"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000-0000-0000-0000"
              value={codigo}
              onChange={e => setCodigo(formatearCodigoLicencia(e.target.value))}
              style={{ fontSize: '1.15rem', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums', textAlign: 'center', marginBottom: '16px' }}
            />
            <button type="submit" className="btn btn-primary" disabled={activando} style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {activando ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
              {activando ? 'Activando...' : 'Activar licencia'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
