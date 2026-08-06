import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, Key, Building2, Server, Save, Loader2, AlertCircle, 
  CheckCircle2, Upload, Eye, EyeOff, ShieldCheck, Info
} from 'lucide-react';

export default function ConfiguracionFiscal() {
  const { tenantId } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  const [formData, setFormData] = useState({
    afip_cuit: '',
    afip_punto_de_venta: 1,
    afip_env: 'development',
    afip_cert: '',
    afip_private_key: ''
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
        .select('afip_cuit, afip_punto_de_venta, afip_env, afip_cert, afip_private_key')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          afip_cuit: data.afip_cuit || '',
          afip_punto_de_venta: data.afip_punto_de_venta || 1,
          afip_env: data.afip_env || 'development',
          afip_cert: data.afip_cert || '',
          afip_private_key: data.afip_private_key || ''
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

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setFormData(prev => ({
          ...prev,
          [fieldName]: content
        }));
        setFeedback({
          type: 'success',
          message: `Archivo "${file.name}" cargado exitosamente en ${fieldName === 'afip_cert' ? 'Certificado Digital' : 'Clave Privada'}.`
        });
      }
    };
    reader.onerror = () => {
      setFeedback({
        type: 'error',
        message: `Error al leer el archivo ${file.name}`
      });
    };
    reader.readAsText(file);
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
        afip_cuit: formData.afip_cuit ? String(formData.afip_cuit).trim() : null,
        afip_punto_de_venta: parseInt(formData.afip_punto_de_venta, 10) || 1,
        afip_env: formData.afip_env,
        afip_cert: formData.afip_cert || null,
        afip_private_key: formData.afip_private_key || null
      };

      const { error } = await supabase
        .from('tenants')
        .update(payload)
        .eq('id', tenantId);

      if (error) throw error;

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
      {/* Encabezado */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={32} style={{ color: 'var(--accent-primary)' }} />
            Configuración Fiscal (ARCA / AFIP)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Gestiona la facturación electrónica, CUIT, entorno y certificados digitales de tu comercio.
          </p>
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
              <label className="input-label" htmlFor="afip_cuit">CUIT del Comercio</label>
              <input
                id="afip_cuit"
                name="afip_cuit"
                type="text"
                className="input-field"
                placeholder="Ej: 20123456789 (Sin guiones)"
                value={formData.afip_cuit}
                onChange={handleChange}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ingresa los 11 dígitos sin guiones ni espacios.</span>
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Punto de venta habilitado para Factura Electrónica Web Service.</span>
            </div>
          </div>
        </div>

        {/* Sección 2: Entorno */}
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
                ? 'Atención: En modo Producción se emitirán comprobantes reales validados por AFIP.' 
                : 'Modo de prueba (Homologación). Las facturas emitidas en este entorno no tienen validez fiscal.'}
            </div>
          </div>
        </div>

        {/* Sección 3: Certificados Digitales */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
            <Key size={20} style={{ color: 'var(--accent-primary)' }} />
            Certificado Digital y Clave Privada
          </h3>

          {/* Certificado CRT */}
          <div className="input-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="input-label" htmlFor="afip_cert">Certificado Digital (.crt / PEM)</label>
              <label 
                htmlFor="upload-cert" 
                style={{ 
                  cursor: 'pointer', 
                  fontSize: '0.8rem', 
                  color: 'var(--accent-primary)', 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                <Upload size={14} /> Subir archivo .crt
              </label>
              <input 
                id="upload-cert" 
                type="file" 
                accept=".crt,.pem,.txt" 
                style={{ display: 'none' }} 
                onChange={(e) => handleFileUpload(e, 'afip_cert')} 
              />
            </div>
            <textarea
              id="afip_cert"
              name="afip_cert"
              rows={4}
              className="input-field"
              placeholder="-----BEGIN CERTIFICATE----- &#10;... &#10;-----END CERTIFICATE-----"
              value={formData.afip_cert}
              onChange={handleChange}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          {/* Clave Privada KEY */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="input-label" htmlFor="afip_private_key">Clave Privada (.key / PEM)</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
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
                  {showPrivateKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showPrivateKey ? 'Ocultar' : 'Mostrar'}
                </button>
                <label 
                  htmlFor="upload-key" 
                  style={{ 
                    cursor: 'pointer', 
                    fontSize: '0.8rem', 
                    color: 'var(--accent-primary)', 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px' 
                  }}
                >
                  <Upload size={14} /> Subir archivo .key
                </label>
                <input 
                  id="upload-key" 
                  type="file" 
                  accept=".key,.pem,.txt" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileUpload(e, 'afip_private_key')} 
                />
              </div>
            </div>
            <textarea
              id="afip_private_key"
              name="afip_private_key"
              rows={4}
              className="input-field"
              placeholder="-----BEGIN PRIVATE KEY----- &#10;... &#10;-----END PRIVATE KEY-----"
              value={formData.afip_private_key}
              onChange={handleChange}
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '0.85rem',
                WebkitTextSecurity: showPrivateKey ? 'none' : 'disc'
              }}
            />
          </div>
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
    </div>
  );
}
