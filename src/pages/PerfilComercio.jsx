import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
  Building2, Store, Hash, MapPin, Calendar, CheckCircle2, Clock,
  ShieldCheck, CreditCard, Loader2, XCircle, Save, User, Mail, Phone,
  AlertCircle, Sparkles, Receipt
} from 'lucide-react';

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

const Badge = ({ ok, textOk, textNo }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700,
    backgroundColor: ok ? 'rgba(74, 124, 89, 0.12)' : 'rgba(210, 142, 61, 0.12)',
    border: `1px solid ${ok ? 'var(--success)' : 'var(--warning)'}`,
    color: ok ? 'var(--success)' : 'var(--warning)'
  }}>
    {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
    {ok ? textOk : textNo}
  </div>
);

export default function PerfilComercio() {
  const {
    user,
    tenantId,
    loading,
    tenantInfo,
    isTrialActive,
    isLicenseActive,
    hasValidAccess,
    daysRemainingTrial,
    trialEndsAt,
    refetchTenantInfo
  } = useAuth();

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Form State para la edición completa del comercio y usuario
  const [formData, setFormData] = useState({
    // Datos del Usuario
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',

    // Datos del Comercio
    nombre_comercio: '',
    razon_social: '',
    rubro: 'Carnicería',
    cuit: '',
    condicion_fiscal: 'Monotributista',

    // Domicilio Fiscal
    domicilio_fiscal: '',
    provincia: 'Buenos Aires',
    localidad: '',
    codigo_postal: '',

    // Facturación
    afip_punto_de_venta: 1
  });

  // Cargar valores iniciales desde tenantInfo y user
  useEffect(() => {
    if (tenantInfo || user) {
      const meta = user?.user_metadata || {};
      setFormData({
        nombre: meta.nombre || user?.email?.split('@')[0] || '',
        apellido: meta.apellido || '',
        telefono: meta.telefono || '',
        email: user?.email || '',

        nombre_comercio: tenantInfo?.nombre_comercio || meta.nombre_comercio || '',
        razon_social: tenantInfo?.razon_social || '',
        rubro: tenantInfo?.rubro || meta.rubro || 'Carnicería',
        cuit: tenantInfo?.cuit || meta.cuit || '',
        condicion_fiscal: tenantInfo?.condicion_fiscal || 'Monotributista',

        domicilio_fiscal: tenantInfo?.domicilio_fiscal || '',
        provincia: tenantInfo?.provincia || 'Buenos Aires',
        localidad: tenantInfo?.localidad || '',
        codigo_postal: tenantInfo?.codigo_postal || '',

        afip_punto_de_venta: tenantInfo?.afip_punto_de_venta || 1
      });
    }
  }, [tenantInfo, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!tenantId) {
      setFeedback({ type: 'error', message: 'No hay un comercio activo asociado a tu sesión.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      // 1. Actualizar tabla 'tenants' en Supabase
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({
          nombre_comercio: formData.nombre_comercio,
          razon_social: formData.razon_social || formData.nombre_comercio,
          rubro: formData.rubro,
          cuit: formData.cuit,
          afip_cuit_delegado: formData.cuit,
          condicion_fiscal: formData.condicion_fiscal,
          domicilio_fiscal: formData.domicilio_fiscal,
          provincia: formData.provincia,
          localidad: formData.localidad,
          codigo_postal: formData.codigo_postal,
          afip_punto_de_venta: Number(formData.afip_punto_de_venta || 1),
          onboarding_completado: true
        })
        .eq('id', tenantId);

      if (tenantErr) throw tenantErr;

      // 2. Actualizar vínculo en 'tenant_users'
      if (user?.id) {
        await supabase
          .from('tenant_users')
          .update({
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono
          })
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId)
          .catch(() => {});
      }

      // 3. Actualizar metadata del usuario en Supabase Auth
      await supabase.auth.updateUser({
        data: {
          nombre: formData.nombre,
          apellido: formData.apellido,
          nombre_comercio: formData.nombre_comercio
        }
      }).catch(() => {});

      // 4. Refrescar el estado de tenantInfo en la aplicación
      if (refetchTenantInfo) {
        await refetchTenantInfo();
      }

      setFeedback({
        type: 'success',
        message: '¡Perfil y datos del comercio actualizados correctamente!'
      });
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      setFeedback({
        type: 'error',
        message: 'Ocurrió un error al guardar los cambios: ' + (err.message || 'Error de red')
      });
    } finally {
      setSaving(false);
    }
  };

  const isGoogleUser = user?.app_metadata?.provider === 'google' || user?.identities?.some(id => id.provider === 'google');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Cargando perfil del comercio...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Encabezado */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building2 size={32} style={{ color: 'var(--accent-primary)' }} />
          Perfil y Datos del Comercio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Completa o actualiza la información de tu negocio para la Facturación Electrónica y tickets de venta.
        </p>
      </div>

      {/* Banner Informativo si se registró con Google */}
      {isGoogleUser && (
        <div style={{
          backgroundColor: 'rgba(66, 133, 244, 0.08)',
          border: '1px solid rgba(66, 133, 244, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: '#ffffff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
              Acceso Rápido con Google Activo
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
              Tu periodo de prueba gratuita de 15 días ya está listo. Completa el CUIT y nombre de tu comercio en este formulario para emitir facturas ARCA y personalizar tus tickets.
            </p>
          </div>
        </div>
      )}

      {/* Estado General de la Cuenta */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {hasValidAccess === false && <Badge ok={false} textNo="Sin acceso vigente" />}
        {isLicenseActive && <Badge ok textOk="Licencia activa" />}
        {!isLicenseActive && isTrialActive && (
          <Badge ok textOk={`Prueba: ${daysRemainingTrial} días restantes`} />
        )}
        {!isLicenseActive && !isTrialActive && hasValidAccess !== false && (
          <Badge ok={false} textNo="Sin licencia ni prueba activa" />
        )}
        <Badge ok={Boolean(tenantInfo?.afip_delegacion_verificada)} textOk="AFIP delegado" textNo="AFIP sin delegar" />
        <Badge ok={Boolean(tenantInfo?.mp_integracion_verificada)} textOk="MP Point verificado" textNo="MP Point sin verificar" />
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: feedback.type === 'success' ? 'rgba(74, 124, 89, 0.12)' : 'rgba(183, 65, 52, 0.12)',
          border: `1px solid ${feedback.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
          fontWeight: 600
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulario Editable */}
      <form onSubmit={handleSaveProfile} className="glass-panel" style={{ padding: '32px' }}>

        {/* SECCIÓN 1: DATOS DEL COMERCIO */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <Store size={22} style={{ color: 'var(--accent-primary)' }} />
            Datos Identificatorios del Comercio
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Nombre Comercial *</label>
              <input 
                type="text" 
                name="nombre_comercio" 
                className="input-field" 
                placeholder="Ej: Don Pedro" 
                value={formData.nombre_comercio} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Razón Social</label>
              <input 
                type="text" 
                name="razon_social" 
                className="input-field" 
                placeholder="Ej: Don Pedro S.R.L." 
                value={formData.razon_social} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
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
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">CUIT del Comercio *</label>
              <input 
                type="text" 
                name="cuit" 
                className="input-field" 
                placeholder="20-34567890-9" 
                value={formData.cuit} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '16px', marginBottom: 0 }}>
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Condición Fiscal *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {['Responsable Inscripto', 'Monotributista', 'Exento'].map(cond => (
                <label key={cond} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px',
                  border: `1px solid ${formData.condicion_fiscal === cond ? 'var(--accent-primary)' : 'rgba(0,0,0,0.1)'}`,
                  backgroundColor: formData.condicion_fiscal === cond ? 'rgba(197, 160, 89, 0.08)' : 'var(--card-bg)',
                  cursor: 'pointer', flex: 1, minWidth: '160px'
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
        </div>

        {/* SECCIÓN 2: DOMICILIO FISCAL & FACTURACIÓN */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <MapPin size={22} style={{ color: 'var(--accent-primary)' }} />
            Domicilio Fiscal & ARCA
          </h2>

          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="input-label">Domicilio Fiscal</label>
            <input 
              type="text" 
              name="domicilio_fiscal" 
              className="input-field" 
              placeholder="Av. San Martín 1234" 
              value={formData.domicilio_fiscal} 
              onChange={handleChange} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Provincia</label>
              <input 
                type="text" 
                name="provincia" 
                className="input-field" 
                placeholder="Buenos Aires" 
                value={formData.provincia} 
                onChange={handleChange} 
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Localidad</label>
              <input 
                type="text" 
                name="localidad" 
                className="input-field" 
                placeholder="La Plata" 
                value={formData.localidad} 
                onChange={handleChange} 
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Código Postal</label>
              <input 
                type="text" 
                name="codigo_postal" 
                className="input-field" 
                placeholder="1900" 
                value={formData.codigo_postal} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '16px', marginBottom: 0 }}>
            <label className="input-label">Punto de Venta ARCA (Web Service)</label>
            <input 
              type="number" 
              name="afip_punto_de_venta" 
              className="input-field" 
              placeholder="1" 
              value={formData.afip_punto_de_venta} 
              onChange={handleChange} 
              style={{ maxWidth: '180px' }}
            />
          </div>
        </div>

        {/* SECCIÓN 3: DATOS DEL TITULAR */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <User size={22} style={{ color: 'var(--accent-primary)' }} />
            Datos del Titular / Usuario
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Nombre del Titular</label>
              <input 
                type="text" 
                name="nombre" 
                className="input-field" 
                placeholder="Juan" 
                value={formData.nombre} 
                onChange={handleChange} 
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Apellido</label>
              <input 
                type="text" 
                name="apellido" 
                className="input-field" 
                placeholder="Pérez" 
                value={formData.apellido} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Teléfono de contacto</label>
              <input 
                type="tel" 
                name="telefono" 
                className="input-field" 
                placeholder="+54 9 11 1234-5678" 
                value={formData.telefono} 
                onChange={handleChange} 
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email de Cuenta</label>
              <input 
                type="email" 
                name="email" 
                className="input-field" 
                value={formData.email} 
                readOnly 
                style={{ opacity: 0.7, backgroundColor: 'rgba(0,0,0,0.03)', cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </div>

        {/* Botón de Guardar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving} 
            style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </form>

      {/* Acceso a Configuraciones avanzadas */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
        <Link to="/configuracion-fiscal" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} /> Configuración Fiscal (ARCA)
        </Link>
        <Link to="/configuracion-mercadopago" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={16} /> Configuración Mercado Pago Point
        </Link>
      </div>

    </div>
  );
}
