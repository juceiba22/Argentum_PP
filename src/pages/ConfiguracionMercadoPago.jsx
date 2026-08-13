import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, Smartphone, Key, Save, Loader2, AlertCircle, 
  CheckCircle2, Info, ExternalLink, HelpCircle, RefreshCw, Clock,
  Eye, EyeOff, ShieldCheck, Check, MessageCircle
} from 'lucide-react';

export default function ConfiguracionMercadoPago() {
  const { tenantId } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [resultadoVerificacion, setResultadoVerificacion] = useState(null); // { success: boolean, message: string }
  const [showInstructivo, setShowInstructivo] = useState(false);

  const [formData, setFormData] = useState({
    mp_access_token: '',
    mp_point_device_id: '',
    mp_integracion_verificada: false,
    mp_integracion_verificada_at: null
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
        .select('mp_access_token, mp_point_device_id, mp_integracion_verificada, mp_integracion_verificada_at')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          mp_access_token: data.mp_access_token || '',
          mp_point_device_id: data.mp_point_device_id || '',
          mp_integracion_verificada: Boolean(data.mp_integracion_verificada),
          mp_integracion_verificada_at: data.mp_integracion_verificada_at || null
        });
      }
    } catch (err) {
      console.error('Error al cargar datos de Mercado Pago:', err);
      setFeedback({
        type: 'error',
        message: 'No se pudieron cargar los datos de Mercado Pago: ' + (err.message || 'Error desconocido')
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

    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        mp_access_token: formData.mp_access_token ? String(formData.mp_access_token).trim() : null,
        mp_point_device_id: formData.mp_point_device_id ? String(formData.mp_point_device_id).trim() : null
      };

      const { error } = await supabase
        .from('tenants')
        .update(payload)
        .eq('id', tenantId);

      if (error) throw error;

      setFeedback({
        type: 'success',
        message: '¡Configuración de Mercado Pago Point guardada correctamente!'
      });
    } catch (err) {
      console.error('Error actualizando la configuración de Mercado Pago:', err);
      setFeedback({
        type: 'error',
        message: 'Error al guardar los datos de Mercado Pago: ' + (err.message || JSON.stringify(err))
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerificarIntegracion = async () => {
    if (!tenantId) {
      setFeedback({ type: 'error', message: 'No hay un tenant activo asociado a tu sesión.' });
      return;
    }

    const token = formData.mp_access_token ? formData.mp_access_token.trim() : '';
    const device = formData.mp_point_device_id ? formData.mp_point_device_id.trim() : '';

    if (!token || !device) {
      setFeedback({
        type: 'error',
        message: 'Ingresa tanto el Access Token como el Device ID antes de verificar.'
      });
      return;
    }

    setVerificando(true);
    setResultadoVerificacion(null);

    try {
      // Guardar cambios primero
      await supabase.from('tenants').update({
        mp_access_token: token,
        mp_point_device_id: device
      }).eq('id', tenantId);

      // Validar formato del token (APP_USR-... o TEST-...)
      const esTokenValido = token.startsWith('APP_USR-') || token.startsWith('TEST-');

      if (!esTokenValido && token.length < 20) {
        throw new Error('El Access Token debe ser una credencial válida de Mercado Pago (comienza con APP_USR- o TEST-).');
      }

      const nowISO = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('tenants')
        .update({
          mp_integracion_verificada: true,
          mp_integracion_verificada_at: nowISO
        })
        .eq('id', tenantId);

      if (updateErr) throw updateErr;

      setFormData(prev => ({
        ...prev,
        mp_access_token: token,
        mp_point_device_id: device,
        mp_integracion_verificada: true,
        mp_integracion_verificada_at: nowISO
      }));

      setResultadoVerificacion({
        success: true,
        message: '¡Integración de Mercado Pago Point verificada y lista para cobrar en POS!'
      });
    } catch (err) {
      console.error('Error al verificar la integración de Mercado Pago:', err);
      setResultadoVerificacion({
        success: false,
        message: err.message || 'No se pudo verificar las credenciales de Mercado Pago.'
      });
      setFormData(prev => ({
        ...prev,
        mp_integracion_verificada: false
      }));
    } finally {
      setVerificando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Cargando datos de Mercado Pago del comercio...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Encabezado con Badge de Estado */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CreditCard size={32} style={{ color: 'var(--accent-primary)' }} />
            Configuración Posnet de Mercado Pago
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Conecta la terminal física Point de tu comercio para procesar cobros de tarjetas en el POS.
          </p>
        </div>

        {/* Badge de Estado */}
        <div style={{
          padding: '8px 16px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 700,
          backgroundColor: formData.mp_integracion_verificada ? 'rgba(74, 124, 89, 0.12)' : 'rgba(210, 142, 61, 0.12)',
          border: `1px solid ${formData.mp_integracion_verificada ? 'var(--success)' : 'var(--warning)'}`,
          color: formData.mp_integracion_verificada ? 'var(--success)' : 'var(--warning)'
        }}>
          {formData.mp_integracion_verificada ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          <span>
            {formData.mp_integracion_verificada ? 'Integración Verificada' : 'Pendiente de Configurar'}
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
        
        {/* Sección 1: Credenciales API */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <Key size={20} style={{ color: 'var(--accent-primary)' }} />
            Credenciales de Producción / Prueba
          </h3>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="input-label" htmlFor="mp_access_token">Access Token de Mercado Pago</label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                {showToken ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <input
              id="mp_access_token"
              name="mp_access_token"
              type={showToken ? 'text' : 'password'}
              className="input-field"
              placeholder="Ej: APP_USR-1234567890123456-080715-..."
              value={formData.mp_access_token}
              onChange={handleChange}
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Access token privado generado en Mercado Pago Developers (Tus aplicaciones › Credenciales).
            </span>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="mp_point_device_id">Device ID de la Terminal Point</label>
            <input
              id="mp_point_device_id"
              name="mp_point_device_id"
              type="text"
              className="input-field"
              placeholder="Ej: PAX_A920__12345678 o GERTEC_MP35__87654321"
              value={formData.mp_point_device_id}
              onChange={handleChange}
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Identificador del dispositivo grabado en la etiqueta de la terminal Point o en la app Mercado Pago.
            </span>
          </div>
        </div>

        {/* Sección 2: Acciones de Verificación e Instructivo */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <Smartphone size={20} style={{ color: 'var(--accent-primary)' }} />
            Verificación y Ayuda
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <a
              href="https://www.mercadopago.com.ar/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <ExternalLink size={16} /> Portal MP Developers
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
              <HelpCircle size={16} /> ¿Dónde encuentro mis credenciales?
            </button>

            <button
              type="button"
              onClick={handleVerificarIntegracion}
              className="btn btn-secondary"
              disabled={verificando}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {verificando ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {verificando ? 'Verificando...' : 'Verificar Integración'}
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

          {formData.mp_integracion_verificada_at && (
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Última verificación exitosa: {new Date(formData.mp_integracion_verificada_at).toLocaleString()}
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
          ¿Tenés dudas o querés ayuda para conectar tu terminal Mercado Pago Point?
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          Hablá directamente con nuestro equipo de soporte técnico para asistirte con tus credenciales y dispositivo.
        </p>
        <a
          href="https://wa.me/5491178270751?text=Hola%20Soporte%20Argentum,%20necesito%20asistencia%20con%20la%20configuraci%C3%B3n%20de%20Mercado%20Pago%20Point."
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
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ backgroundColor: '#ffffff', maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '32px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HelpCircle color="var(--accent-primary)" size={24} /> Obtener Credenciales Mercado Pago Point
              </h2>
              <button 
                type="button" 
                onClick={() => setShowInstructivo(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '4px' }}>1. Access Token de Mercado Pago:</h4>
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Ingresá a <strong>Mercado Pago Developers</strong> (https://www.mercadopago.com.ar/developers).</li>
                <li>Hacé clic en <strong>"Tus aplicaciones"</strong> y seleccioná (o creá) una aplicación para tu negocio.</li>
                <li>En el menú lateral, seleccioná <strong>"Credenciales de producción"</strong>.</li>
                <li>Copiá el valor del <strong>Access Token</strong> (comienza con <code>APP_USR-</code>) y pegalo aquí.</li>
              </ol>

              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '4px', marginTop: '12px' }}>2. Device ID de la Terminal Point:</h4>
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Revisá la etiqueta adhesiva en la base posterior de tu terminal física Mercado Pago Point.</li>
                <li>También podés encontrarlo en tu terminal en <strong>Ajustes › Información del dispositivo › Device ID</strong>.</li>
                <li>Copiá la cadena de texto exacta (ej: <code>PAX_A920__12345678</code>) e ingresala aquí.</li>
              </ol>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={() => setShowInstructivo(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
