import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Building2, MapPin, Receipt, ShieldCheck, CheckCircle2, 
  ArrowRight, ArrowLeft, AlertCircle, Loader2, Check, Store, Mail
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const RUBROS_CATALOGO = [
  { value: 'Carnicería', label: '🥩 Carnicería' },
  { value: 'Petshop', label: '🐶 Petshop' },
  { value: 'Minimercado', label: '🛒 Minimercado' },
  { value: 'Librería', label: '📚 Librería' },
  { value: 'Dietética', label: '🌿 Dietética' },
  { value: 'Fiambrería', label: '🧀 Fiambrería' },
  { value: 'Verdulería', label: '🍎 Verdulería' },
  { value: 'Ferretería', label: '🔧 Ferretería' },
  { value: 'Cervecería', label: '🍺 Cervecería' },
  { value: 'Cafetería', label: '☕ Cafetería' },
  { value: 'Artículos de Limpieza', label: '🧼 Artículos de Limpieza' },
  { value: 'General / Otro', label: '🏪 General / Otro' }
];

export default function OnboardingWizard({ onBackToLogin }) {
  const navigate = useNavigate();

  // Paso actual (1 al 4, o 5 para Pantalla de Éxito)
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registroExitoso, setRegistroExitoso] = useState(false);

  // Estado del Formulario Multi-paso (4 Pasos)
  const [formData, setFormData] = useState({
    // Paso 1: Tu cuenta
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',

    // Paso 2: Tu comercio
    nombre_comercio: '',
    razon_social: '',
    rubro: 'Carnicería',
    cuit: '',
    condicion_fiscal: 'Monotributista',

    // Paso 3: Datos fiscales
    domicilio_fiscal: '',
    provincia: 'Buenos Aires',
    localidad: '',
    codigo_postal: '',

    // Paso 4: Facturación electrónica
    tienePuntoVenta: true,
    afip_punto_de_venta: '1'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Validaciones y avance de pasos (1 -> 2 -> 3 -> 4 -> Registro)
  const handleSiguientePaso = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (paso === 1) {
      if (!formData.nombre || !formData.apellido || !formData.email || !formData.password) {
        setErrorMsg('Por favor completa todos los campos obligatorios.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.');
        return;
      }
      if (formData.password.length < 6) {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      setPaso(2);
      return;
    }

    if (paso === 2) {
      if (!formData.nombre_comercio || !formData.cuit || !formData.rubro) {
        setErrorMsg('Por favor ingresá el nombre de tu comercio, CUIT y rubro.');
        return;
      }
      setPaso(3);
      return;
    }

    if (paso === 3) {
      if (!formData.domicilio_fiscal || !formData.localidad || !formData.provincia) {
        setErrorMsg('Por favor completa los datos de tu domicilio fiscal.');
        return;
      }
      setPaso(4);
      return;
    }

    if (paso === 4) {
      handleFinalizarRegistro();
    }
  };

  const handlePasoAnterior = () => {
    setErrorMsg('');
    setPaso(prev => Math.max(1, prev - 1));
  };

  // Finalizar Registro: crear el usuario en Supabase Auth. El resto (tenant,
  // vínculo en tenant_users, productos iniciales) se crea recién en el primer
  // login real, una vez que confirme el email -- ver fetchTenantAndRole en
  // AuthContext.jsx. Guardamos todos los datos del wizard en user_metadata
  // porque es la única forma de que ese primer login sepa qué eligió el
  // usuario acá (rubro, CUIT, domicilio, etc.).
  const handleFinalizarRegistro = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'admin',
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono,
            nombre_comercio: formData.nombre_comercio,
            razon_social: formData.razon_social || formData.nombre_comercio,
            rubro: formData.rubro,
            cuit: formData.cuit,
            condicion_fiscal: formData.condicion_fiscal,
            domicilio_fiscal: formData.domicilio_fiscal,
            provincia: formData.provincia,
            localidad: formData.localidad,
            codigo_postal: formData.codigo_postal,
            afip_punto_de_venta: formData.afip_punto_de_venta,
            necesita_crear_pto_venta: !formData.tienePuntoVenta
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear la cuenta de usuario.');

      setRegistroExitoso(true);
      setPaso(5); // Pantalla de "revisá tu email"
    } catch (err) {
      console.error('Error durante el registro:', err);
      setErrorMsg(err.message || 'Ocurrió un error al registrar el comercio. Por favor intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '36px', position: 'relative' }}>

        {/* Encabezado e Indicador de Pasos (1 al 4) */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 className="brand-title" style={{ fontSize: '2.2rem', marginBottom: '6px' }}>
            Argentum
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Registro y Configuración Inicial de Comercio
          </p>

          {/* Progress Bar (Pasos 1 a 4) */}
          {!registroExitoso && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', position: 'relative', maxWidth: '480px', margin: '24px auto 0 auto' }}>
              <div style={{ position: 'absolute', top: '16px', left: '12%', right: '12%', height: '3px', backgroundColor: 'rgba(0,0,0,0.08)', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', top: '16px', left: '12%', width: `${((paso - 1) / 3) * 76}%`, height: '3px', backgroundColor: 'var(--accent-primary)', zIndex: 0, transition: 'width 0.4s ease' }}></div>

              {[1, 2, 3, 4].map(num => (
                <div key={num} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: paso >= num ? 'var(--accent-primary)' : 'var(--card-bg)',
                    color: paso >= num ? '#FFFFFF' : 'var(--text-secondary)',
                    border: `2px solid ${paso >= num ? 'var(--accent-primary)' : 'rgba(0,0,0,0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    transition: 'all 0.3s ease'
                  }}>
                    {paso > num ? <Check size={18} /> : num}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: paso === num ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: paso === num ? 700 : 400 }}>
                    Paso {num}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(183, 65, 52, 0.08)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 1 — TU CUENTA */}
        {/* ========================================================================= */}
        {paso === 1 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 1 — Tu cuenta
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>¡Bienvenido a Argentum! Creá tus credenciales de acceso.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Nombre *</label>
                <input type="text" name="nombre" className="input-field" placeholder="Juan" value={formData.nombre} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label className="input-label">Apellido *</label>
                <input type="text" name="apellido" className="input-field" placeholder="Pérez" value={formData.apellido} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Email *</label>
                <input type="email" name="email" className="input-field" placeholder="juan@ejemplo.com" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label className="input-label">Teléfono</label>
                <input type="tel" name="telefono" className="input-field" placeholder="+54 9 11 1234-5678" value={formData.telefono} onChange={handleChange} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Contraseña *</label>
                <input type="password" name="password" className="input-field" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label className="input-label">Confirmar Contraseña *</label>
                <input type="password" name="confirmPassword" className="input-field" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', alignItems: 'center' }}>
              {onBackToLogin ? (
                <button type="button" onClick={onBackToLogin} className="btn btn-secondary" style={{ padding: '10px 18px' }}>
                  Volver al Login
                </button>
              ) : <div></div>}

              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Siguiente Paso <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 2 — TU COMERCIO Y RUBRO */}
        {/* ========================================================================= */}
        {paso === 2 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 2 — Tu comercio
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>¿Cómo se llama tu comercio y a qué rubro pertenece?</p>
            </div>

            <div className="input-group">
              <label className="input-label">Nombre comercial *</label>
              <input type="text" name="nombre_comercio" className="input-field" placeholder="Ej: Don Pedro" value={formData.nombre_comercio} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label className="input-label">Rubro del Comercio *</label>
              <select 
                name="rubro" 
                className="input-field" 
                value={formData.rubro} 
                onChange={handleChange}
                style={{ cursor: 'pointer', fontWeight: 600 }}
              >
                {RUBROS_CATALOGO.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Cargaremos automáticamente un catálogo inicial de 15 productos de {formData.rubro} para que pruebes el sistema de inmediato.
              </span>
            </div>

            <div className="input-group">
              <label className="input-label">Razón social</label>
              <input type="text" name="razon_social" className="input-field" placeholder="Don Pedro S.R.L. / Juan Pérez" value={formData.razon_social} onChange={handleChange} />
            </div>

            <div className="input-group">
              <label className="input-label">CUIT *</label>
              <input type="text" name="cuit" className="input-field" placeholder="20-34567890-9" value={formData.cuit} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Condición fiscal *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Responsable Inscripto', 'Monotributista', 'Exento'].map(cond => (
                  <label key={cond} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px',
                    border: `1px solid ${formData.condicion_fiscal === cond ? 'var(--accent-primary)' : 'rgba(0,0,0,0.1)'}`,
                    backgroundColor: formData.condicion_fiscal === cond ? 'rgba(197, 160, 89, 0.08)' : 'var(--card-bg)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="condicion_fiscal" 
                      value={cond} 
                      checked={formData.condicion_fiscal === cond} 
                      onChange={handleChange} 
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cond}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button type="button" onClick={handlePasoAnterior} className="btn btn-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={18} /> Anterior
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Siguiente Paso <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 3 — DATOS FISCALES */}
        {/* ========================================================================= */}
        {paso === 3 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 3 — Datos fiscales
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Domicilio legal registrado en ARCA</p>
            </div>

            <div className="input-group">
              <label className="input-label">Domicilio fiscal *</label>
              <input type="text" name="domicilio_fiscal" className="input-field" placeholder="Av. San Martín 1234" value={formData.domicilio_fiscal} onChange={handleChange} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Provincia *</label>
                <input type="text" name="provincia" className="input-field" placeholder="Buenos Aires" value={formData.provincia} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label className="input-label">Localidad *</label>
                <input type="text" name="localidad" className="input-field" placeholder="La Plata" value={formData.localidad} onChange={handleChange} required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Código postal</label>
              <input type="text" name="codigo_postal" className="input-field" placeholder="1900" value={formData.codigo_postal} onChange={handleChange} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button type="button" onClick={handlePasoAnterior} className="btn btn-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={18} /> Anterior
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Siguiente Paso <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 4 — FACTURACIÓN ELECTRÓNICA (PASO FINAL DE ALTA) */}
        {/* ========================================================================= */}
        {paso === 4 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 4 — Facturación electrónica
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configuración de ARCA (AFIP)</p>
            </div>

            <div className="input-group">
              <label className="input-label">CUIT registrado</label>
              <input type="text" name="cuit" className="input-field" value={formData.cuit} readOnly style={{ opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.03)' }} />
            </div>

            <div className="input-group" style={{ marginTop: '20px' }}>
              <label className="input-label" style={{ marginBottom: '10px', display: 'block' }}>Punto de Venta</label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tienePuntoVenta" 
                    checked={formData.tienePuntoVenta} 
                    onChange={() => setFormData(prev => ({ ...prev, tienePuntoVenta: true }))} 
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ya tengo punto de venta para Facturación Electrónica</span>
                </label>

                {formData.tienePuntoVenta && (
                  <div style={{ marginLeft: '28px', marginTop: '-4px' }}>
                    <input 
                      type="number" 
                      name="afip_punto_de_venta" 
                      className="input-field" 
                      placeholder="Ej: 1" 
                      value={formData.afip_punto_de_venta} 
                      onChange={handleChange} 
                      style={{ maxWidth: '180px' }}
                    />
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tienePuntoVenta" 
                    checked={!formData.tienePuntoVenta} 
                    onChange={() => setFormData(prev => ({ ...prev, tienePuntoVenta: false, afip_punto_de_venta: '1' }))} 
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Necesito crear uno nuevo en ARCA</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button type="button" onClick={handlePasoAnterior} className="btn btn-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={loading}>
                <ArrowLeft size={18} /> Anterior
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {loading ? 'Dando de Alta...' : 'Finalizar Registro'}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PANTALLA FINAL — REVISÁ TU EMAIL */}
        {/* ========================================================================= */}
        {registroExitoso && paso === 5 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ 
              padding: '32px 24px', borderRadius: '16px', 
              backgroundColor: 'rgba(37, 99, 235, 0.08)', 
              border: '2px solid var(--accent-primary)', 
              marginBottom: '28px' 
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <Mail size={36} />
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Revisá tu email
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Casi listo, {formData.nombre || 'bienvenido/a'}
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0 auto' }}>
                Te mandamos un email de confirmación a <strong>{formData.email}</strong>. Hacé clic en el enlace (revisá también spam) para activar tu cuenta. Una vez que confirmes e inicies sesión por primera vez, vamos a crear automáticamente tu comercio <strong>{formData.nombre_comercio}</strong> (Rubro: <strong>{formData.rubro}</strong>) con 15 productos iniciales cargados.
              </p>
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(210, 142, 61, 0.1)', borderRadius: '8px', border: '1px solid rgba(210, 142, 61, 0.3)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  <strong>¿No te llega el email?</strong> Si intentaste registrarte con Google anteriormente, tu email ya está verificado en el sistema y no recibirás este correo. Volvé a la pantalla principal e intentá hacer clic en <strong>"Continuar con Google"</strong>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => (onBackToLogin ? onBackToLogin() : navigate('/'))} 
                className="btn btn-primary" 
                style={{ padding: '14px 40px', fontSize: '1.05rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '10px' }}
              >
                <span>Ya confirmé, iniciar sesión</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
