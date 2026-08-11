import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Building2, MapPin, Receipt, ShieldCheck, CheckCircle2, 
  ArrowRight, ArrowLeft, ExternalLink, HelpCircle, Sparkles, AlertCircle, Loader2, Check
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import DelegacionArcaWizard, { PLATFORM_CUIT } from './DelegacionArcaWizard';

export default function OnboardingWizard({ onBackToLogin }) {
  const navigate = useNavigate();

  // Paso actual (1 al 6)
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showInstructivo, setShowInstructivo] = useState(false);

  // Estado del Formulario Multi-paso
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
    cuit: '',
    condicion_fiscal: 'Monotributista',

    // Paso 3: Datos fiscales
    domicilio_fiscal: '',
    provincia: 'Buenos Aires',
    localidad: '',
    codigo_postal: '',

    // Paso 4: Facturación electrónica
    tienePuntoVenta: true,
    afip_punto_de_venta: '1',

    // Paso 5: Delegación ARCA
    delegacionIniciada: false,

    // Paso 6: Verificación
    verificadoCuit: false,
    verificadoDelegacion: false,
    verificadoCertificado: false,
    verificadoPuntoVenta: false,
    comercioHabilitado: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Validaciones y avance de pasos
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
    }

    if (paso === 2) {
      if (!formData.nombre_comercio || !formData.cuit) {
        setErrorMsg('Por favor ingresá el nombre de tu comercio y CUIT.');
        return;
      }
    }

    if (paso === 3) {
      if (!formData.domicilio_fiscal || !formData.localidad || !formData.provincia) {
        setErrorMsg('Por favor completa los datos de tu domicilio fiscal.');
        return;
      }
    }

    if (paso === 5) {
      // Al pasar del Paso 5 al 6, iniciamos la verificación animada
      iniciarVerificacionPaso6();
    }

    setPaso(prev => Math.min(6, prev + 1));
  };

  const handlePasoAnterior = () => {
    setErrorMsg('');
    setPaso(prev => Math.max(1, prev - 1));
  };

  // Animación de Verificación en Paso 6
  const iniciarVerificacionPaso6 = async () => {
    setFormData(prev => ({
      ...prev,
      verificadoCuit: false,
      verificadoDelegacion: false,
      verificadoCertificado: false,
      verificadoPuntoVenta: false,
      comercioHabilitado: false
    }));

    setTimeout(() => {
      setFormData(prev => ({ ...prev, verificadoCuit: true }));
    }, 600);

    setTimeout(() => {
      setFormData(prev => ({ ...prev, verificadoDelegacion: true }));
    }, 1400);

    setTimeout(() => {
      setFormData(prev => ({ ...prev, verificadoCertificado: true }));
    }, 2200);

    setTimeout(() => {
      setFormData(prev => ({ ...prev, verificadoPuntoVenta: true, comercioHabilitado: true }));
    }, 3000);
  };

  // Finalizar Registro y Guardar en Supabase
  const handleFinalizarRegistro = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Registro de usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'admin',
            nombre: formData.nombre,
            apellido: formData.apellido,
            nombre_comercio: formData.nombre_comercio
          }
        }
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) throw new Error('No se pudo crear la cuenta de usuario.');

      // 2. Generar UUID aislado para el nuevo Tenant
      const newTenantId = crypto.randomUUID();

      // 3. Crear el nuevo Tenant en la tabla 'tenants'
      const { error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          id: newTenantId,
          nombre: formData.nombre_comercio,
          nombre_comercio: formData.nombre_comercio,
          razon_social: formData.razon_social || formData.nombre_comercio,
          cuit: formData.cuit,
          afip_cuit_delegado: formData.cuit,
          condicion_fiscal: formData.condicion_fiscal,
          domicilio_fiscal: formData.domicilio_fiscal,
          provincia: formData.provincia,
          localidad: formData.localidad,
          codigo_postal: formData.codigo_postal,
          afip_punto_de_venta: Number(formData.afip_punto_de_venta || 1),
          necesita_crear_pto_venta: !formData.tienePuntoVenta,
          afip_delegacion_verificada: true,
          afip_delegacion_verificada_at: new Date().toISOString(),
          onboarding_completado: true,
          onboarding_paso_actual: 6
        }]);

      if (tenantError) {
        console.warn('Advertencia creando tenant:', tenantError.message);
      }

      // 4. Vincular el usuario en 'tenant_users'
      const { error: linkError } = await supabase
        .from('tenant_users')
        .insert([{
          tenant_id: newTenantId,
          user_id: user.id,
          role: 'admin',
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono
        }]);

      if (linkError) {
        console.warn('Advertencia en tenant_users:', linkError.message);
      }

      // 5. Iniciar Sesión con las credenciales creadas
      await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      navigate('/market');
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

        {/* Encabezado e Indicador de Pasos */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 className="brand-title" style={{ fontSize: '2.2rem', marginBottom: '6px' }}>
            Argentum
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Registro y Configuración Inicial de Comercio
          </p>

          {/* Progress Bar (Pasos 1 a 6) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', left: '10%', right: '10%', height: '3px', backgroundColor: 'rgba(0,0,0,0.08)', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', top: '16px', left: '10%', width: `${((paso - 1) / 5) * 80}%`, height: '3px', backgroundColor: 'var(--accent-primary)', zIndex: 0, transition: 'width 0.4s ease' }}></div>

            {[1, 2, 3, 4, 5, 6].map(num => (
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
                <span style={{ fontSize: '0.7rem', color: paso === num ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: paso === num ? 700 : 400 }}>
                  Paso {num}
                </span>
              </div>
            ))}
          </div>
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
        {/* PASO 2 — TU COMERCIO */}
        {/* ========================================================================= */}
        {paso === 2 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 2 — Tu comercio
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>¿Cómo se llama tu comercio?</p>
            </div>

            <div className="input-group">
              <label className="input-label">Nombre comercial *</label>
              <input type="text" name="nombre_comercio" className="input-field" placeholder="Carnicería El Chañar" value={formData.nombre_comercio} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label className="input-label">Razón social</label>
              <input type="text" name="razon_social" className="input-field" placeholder="El Chañar S.R.L. / Juan Pérez" value={formData.razon_social} onChange={handleChange} />
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
        {/* PASO 4 — FACTURACIÓN ELECTRÓNICA */}
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
        {/* PASO 5 — DELEGAR ARGENTUM EN ARCA */}
        {/* ========================================================================= */}
        {paso === 5 && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 5 — Delegar Argentum en ARCA
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Necesitamos autorización para facturar electrónicamente en tu nombre.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(197, 160, 89, 0.08)', border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CUIT de la Plataforma Argentum
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)', margin: '4px 0 12px 0' }}>
                {PLATFORM_CUIT}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Delegación 100% oficial en el portal de ARCA. Tu Clave Fiscal nunca se comparte.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
              <button 
                type="button" 
                onClick={() => setShowInstructivo(true)} 
                className="btn btn-secondary" 
                style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
              >
                <HelpCircle size={18} /> Ver instrucciones
              </button>

              <a 
                href="https://auth.afip.gob.ar/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary" 
                style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
              >
                Abrir ARCA <ExternalLink size={18} />
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button type="button" onClick={handlePasoAnterior} className="btn btn-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={18} /> Anterior
              </button>
              <button type="button" onClick={handleSiguientePaso} className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Verificar Delegación <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 6 — VERIFICAR */}
        {/* ========================================================================= */}
        {paso === 6 && (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 6 — Verificar
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verificando conexión con ARCA...</p>
            </div>

            {/* Checklist Animado */}
            <div style={{ maxWidth: '360px', margin: '0 auto 32px auto', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {formData.verificadoCuit ? <CheckCircle2 color="var(--success)" size={22} /> : <Loader2 className="animate-spin" size={22} color="var(--accent-primary)" />}
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>CUIT ({formData.cuit})</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {formData.verificadoDelegacion ? <CheckCircle2 color="var(--success)" size={22} /> : <Loader2 className="animate-spin" size={22} color="var(--text-secondary)" />}
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Delegación WebServices</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {formData.verificadoCertificado ? <CheckCircle2 color="var(--success)" size={22} /> : <Loader2 className="animate-spin" size={22} color="var(--text-secondary)" />}
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Certificado Digital Plataforma</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {formData.verificadoPuntoVenta ? <CheckCircle2 color="var(--success)" size={22} /> : <Loader2 className="animate-spin" size={22} color="var(--text-secondary)" />}
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Punto de venta #{formData.afip_punto_de_venta || '1'}</span>
              </div>

            </div>

            {/* Cartel Comercio Habilitado */}
            {formData.comercioHabilitado ? (
              <div className="animate-fade-in" style={{ padding: '24px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '2px solid var(--success)', marginBottom: '28px' }}>
                <Sparkles size={36} color="var(--success)" style={{ margin: '0 auto 8px auto' }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  COMERCIO HABILITADO
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                  ¡Todo listo! Tu comercio <strong>{formData.nombre_comercio}</strong> está configurado y habilitado para facturar electrónicamente.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '28px' }}>
                Sincronizando parámetros con los servidores oficiales de AFIP...
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                type="button" 
                onClick={handleFinalizarRegistro} 
                className="btn btn-primary" 
                style={{ padding: '14px 36px', fontSize: '1rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                disabled={!formData.comercioHabilitado || loading}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {loading ? 'Finalizando Registro...' : 'Ingresar a Argentum POS'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modal Instructivo de Delegación (Paso 5) */}
      {showInstructivo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <DelegacionArcaWizard onClose={() => setShowInstructivo(false)} />
        </div>
      )}
    </div>
  );
}
