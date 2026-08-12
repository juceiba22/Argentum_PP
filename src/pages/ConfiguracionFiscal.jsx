import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { getAuthHeaders } from '../services/authHeader';
import { useAuth } from '../context/AuthContext';
import DelegacionArcaWizard from '../components/DelegacionArcaWizard';
import { 
  ShieldCheck, Building2, Server, Save, Loader2, AlertCircle, 
  CheckCircle2, Info, ExternalLink, HelpCircle, RefreshCw, Clock, MessageCircle
} from 'lucide-react';

export default function ConfiguracionFiscal() {
  const { tenantId } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificando, setVerificando] = useState(false);
  
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [resultadoVerificacion, setResultadoVerificacion] = useState(null); // { success: boolean, message: string }
  const [showInstructivo, setShowInstructivo] = useState(false);

  const [formData, setFormData] = useState({
    afip_cuit_delegado: '',
    afip_punto_de_venta: 1,
    afip_env: 'development',
    afip_delegacion_verificada: false,
    afip_delegacion_verificada_at: null
  });

  const cargarDatosTenant = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('afip_cuit_delegado, afip_punto_de_venta, afip_env, afip_delegacion_verificada, afip_delegacion_verificada_at')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          afip_cuit_delegado: data.afip_cuit_delegado || '',
          afip_punto_de_venta: data.afip_punto_de_venta || 1,
          afip_env: data.afip_env || 'development',
          afip_delegacion_verificada: Boolean(data.afip_delegacion_verificada),
          afip_delegacion_verificada_at: data.afip_delegacion_verificada_at || null
        });
      }
    } catch (err) {
      console.error('Error al cargar datos del tenant:', err);
      setFeedback({
        type: 'error',
        message: 'No se pudieron cargar los datos fiscales: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    cargarDatosTenant();
  }, [cargarDatosTenant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId) {
      setFeedback({ type: 'error', message: 'No hay un tenant activo asociado a tu sesión.' });
      return;
    }

    // Validar CUIT delegado (debe ser numérico de 11 dígitos)
    const cuitLimpio = String(formData.afip_cuit_delegado || '').replace(/\D/g, '');
    if (cuitLimpio && cuitLimpio.length !== 11) {
      setFeedback({
        type: 'error',
        message: 'El CUIT Delegado debe contener exactamente 11 dígitos numéricos.'
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        afip_cuit_delegado: cuitLimpio || null,
        afip_punto_de_venta: parseInt(formData.afip_punto_de_venta, 10) || 1,
        afip_env: formData.afip_env
      };

      const { error } = await supabase
        .from('tenants')
        .update(payload)
        .eq('id', tenantId);

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        afip_cuit_delegado: cuitLimpio
      }));

      setFeedback({
        type: 'success',
        message: '¡Configuración fiscal de ARCA / AFIP guardada correctamente!'
      });
    } catch (err) {
      console.error('Error actualizando la configuración fiscal:', err);
      setFeedback({
        type: 'error',
        message: 'Error al guardar los datos fiscales: ' + (err.message || JSON.stringify(err))
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerificarDelegacion = async () => {
    if (!tenantId) {
      setFeedback({ type: 'error', message: 'No hay un tenant activo asociado a tu sesión.' });
      return;
    }

    const cuitLimpio = String(formData.afip_cuit_delegado || '').replace(/\D/g, '');
    if (!cuitLimpio || cuitLimpio.length !== 11) {
      setFeedback({
        type: 'error',
        message: 'Debes ingresar un CUIT Delegado válido de 11 dígitos y guardar los cambios antes de verificar.'
      });
      return;
    }

    setVerificando(true);
    setResultadoVerificacion(null);

    try {
      const res = await fetch('/api/arca/verificar-delegacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ tenantId })
      });

      const data = await res.json();

      if (data.success) {
        setResultadoVerificacion({
          success: true,
          message: '¡Delegación verificada y operativa en los servidores de AFIP / ARCA!'
        });
        setFormData(prev => ({
          ...prev,
          afip_delegacion_verificada: true,
          afip_delegacion_verificada_at: data.verifiedAt || new Date().toISOString()
        }));
      } else {
        setResultadoVerificacion({
          success: false,
          message: data.error || 'No se pudo verificar la delegación en AFIP / ARCA.'
        });
        setFormData(prev => ({
          ...prev,
          afip_delegacion_verificada: false
        }));
      }
    } catch (err) {
      console.error('Error al solicitar verificación:', err);
      setResultadoVerificacion({
        success: false,
        message: err.message || 'Ocurrió un error de red al intentar verificar la delegación.'
      });
    } finally {
      setVerificando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Cargando datos fiscales del comercio...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Encabezado con Badge de Estado */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={32} style={{ color: 'var(--accent-primary)' }} />
            Configuración Fiscal (ARCA / AFIP)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Gestiona el CUIT delegado, punto de venta y delegación de facturación electrónica.
          </p>
        </div>

        {/* Badge de Estado de Delegación */}
        <div style={{
          padding: '8px 16px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 700,
          backgroundColor: formData.afip_delegacion_verificada ? 'rgba(74, 124, 89, 0.12)' : 'rgba(210, 142, 61, 0.12)',
          border: `1px solid ${formData.afip_delegacion_verificada ? 'var(--success)' : 'var(--warning)'}`,
          color: formData.afip_delegacion_verificada ? 'var(--success)' : 'var(--warning)'
        }}>
          {formData.afip_delegacion_verificada ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          <span>
            {formData.afip_delegacion_verificada ? 'Delegación Verificada' : 'Pendiente de Verificar'}
          </span>
        </div>
      </div>

      {/* Banner de Feedback / Alerta */}
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

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '32px' }}>
        
        {/* Sección 1: Datos de Emisor */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
            Datos Identificatorios
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="afip_cuit_delegado">CUIT Delegado del Comercio</label>
              <input
                id="afip_cuit_delegado"
                name="afip_cuit_delegado"
                type="text"
                className="input-field"
                placeholder="Ej: 20123456789 (11 dígitos)"
                value={formData.afip_cuit_delegado}
                onChange={handleChange}
                maxLength={11}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CUIT de 11 dígitos sin guiones ni espacios.</span>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="afip_punto_de_venta">Punto de Venta ARCA</label>
              <input
                id="afip_punto_de_venta"
                name="afip_punto_de_venta"
                type="number"
                min="1"
                max="99999"
                className="input-field"
                placeholder="Ej: 1"
                value={formData.afip_punto_de_venta}
                onChange={handleChange}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Punto de venta asignado a Facturación Web Service.</span>
            </div>
          </div>
        </div>

        {/* Sección 2: Entorno de Ejecución */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <Server size={20} style={{ color: 'var(--accent-primary)' }} />
            Entorno de Ejecución (AFIP WS)
          </h3>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="afip_env">Servidor AFIP / ARCA</label>
            <select
              id="afip_env"
              name="afip_env"
              className="input-field"
              value={formData.afip_env}
              onChange={handleChange}
              style={{ cursor: 'pointer' }}
            >
              <option value="development">Desarrollo / Testing (Homologación)</option>
              <option value="production">Producción (Real / AFIP Oficial)</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.8rem', color: formData.afip_env === 'production' ? 'var(--danger)' : 'var(--warning)' }}>
              <Info size={14} />
              {formData.afip_env === 'production' 
                ? 'Modo Producción: Los comprobantes emitidos serán oficiales y validados ante AFIP.' 
                : 'Modo Homologación: Servidor de pruebas oficiales sin efectos fiscales de cobro real.'}
            </div>
          </div>
        </div>

        {/* Sección 3: Bloque de Delegación en ARCA */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--accent-primary)' }} />
            Delegación en ARCA / AFIP
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Para emitir facturas electrónicas a través de la plataforma, debes delegar el servicio de Facturación Electrónica desde el portal de clave fiscal de AFIP.
          </p>

          {/* Botones de Acción de Delegación */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <a
              href="https://auth.afip.gob.ar/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <ExternalLink size={16} /> Ir a ARCA a delegar
            </a>

            <button
              type="button"
              onClick={() => setShowInstructivo(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9rem',
                textDecoration: 'underline'
              }}
            >
              <HelpCircle size={16} /> Ver instructivo paso a paso
            </button>

            <button
              type="button"
              onClick={handleVerificarDelegacion}
              className="btn btn-secondary"
              disabled={verificando}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {verificando ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {verificando ? 'Verificando...' : 'Verificar delegación'}
            </button>
          </div>

          {/* Resultado de la Verificación */}
          {resultadoVerificacion && (
            <div style={{
              padding: '14px 20px',
              borderRadius: '8px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: resultadoVerificacion.success ? 'rgba(74, 124, 89, 0.12)' : 'rgba(183, 65, 52, 0.12)',
              border: `1px solid ${resultadoVerificacion.success ? 'var(--success)' : 'var(--danger)'}`,
              color: resultadoVerificacion.success ? 'var(--success)' : 'var(--danger)',
              fontWeight: 600
            }}>
              {resultadoVerificacion.success ? <span>✅</span> : <span>❌</span>}
              <span style={{ flex: 1 }}>{resultadoVerificacion.message}</span>
            </div>
          )}

          {formData.afip_delegacion_verificada_at && (
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Última verificación exitosa: {new Date(formData.afip_delegacion_verificada_at).toLocaleString()}
            </div>
          )}
        </div>

        {/* Botón Guardar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

      </form>

      {/* SECCIÓN SOPORTE DIRECTO */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
          ¿Necesitas ayuda con la delegación fiscal o tu punto de venta en ARCA?
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          Nuestro equipo de soporte técnico te guiará paso a paso para completar la configuración de tu comercio.
        </p>
        <a
          href="https://wa.me/5491178270751?text=Hola%20Soporte%20Argentum,%20necesito%20asistencia%20con%20la%20configuraci%C3%B3n%20fiscal%20de%20ARCA."
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justify: 'center',
            gap: '12px',
            backgroundColor: '#25D366',
            color: '#FFFFFF',
            padding: '14px 28px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '1.05rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
            transition: 'all 0.2s ease-in-out',
            maxWidth: '450px',
            width: '100%'
          }}
        >
          <MessageCircle size={24} /> Contactar con Soporte de Argentum
        </a>
      </div>

      {/* Modal Instructivo Paso a Paso */}
      {showInstructivo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <DelegacionArcaWizard onClose={() => setShowInstructivo(false)} />
        </div>
      )}
    </div>
  );
}
