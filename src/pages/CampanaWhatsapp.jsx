import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, QrCode, CheckCircle2, AlertTriangle, RefreshCw, LogOut, 
  Send, Users, Image as ImageIcon, Trash2, Sparkles, Clock, Loader2, X, Info 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllClientes } from '../services/clientesApi';
import { uploadImage } from '../services/inventarioApi';
import { getWhatsAppStatus, logoutWhatsApp, enviarCampanaWhatsApp } from '../services/whatsappApi';

export default function CampanaWhatsapp() {
  const { tenantId } = useAuth();

  // Estados de WhatsApp
  const [waStatus, setWaStatus] = useState('CHECKING'); // 'CHECKING' | 'CONNECTED' | 'QR_READY' | 'DISCONNECTED' | 'OFFLINE'
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Estados de Clientes
  const [clientesCount, setClientesCount] = useState(0);
  const [loadingClientes, setLoadingClientes] = useState(true);

  // Estados de Formulario de Campaña
  const [mensaje, setMensaje] = useState(
    '¡Hola {nombre}! Ya subimos los cortes de esta semana. Mirá las promos acá: https://argentum-pp.vercel.app/promociones'
  );
  const [flyerFile, setFlyerFile] = useState(null);
  const [flyerPreview, setFlyerPreview] = useState(null);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [flyerPublicUrl, setFlyerPublicUrl] = useState('');

  // Modal de Confirmación y Disparo
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignResult, setCampaignResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Consultar estado del microservicio de WhatsApp con polling automático
  const checkStatus = async () => {
    try {
      const res = await getWhatsAppStatus();
      if (res.status === 'OFFLINE') {
        setWaStatus('OFFLINE');
        setQrCodeUrl(null);
      } else {
        setWaStatus(res.status);
        setQrCodeUrl(res.qrCodeUrl || null);
      }
    } catch (err) {
      setWaStatus('OFFLINE');
      setQrCodeUrl(null);
    }
  };

  useEffect(() => {
    checkStatus();
    // Polling cada 3 segundos para detectar cuando el usuario escanea el QR o se conecta
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Cargar total de clientes del tenant
  useEffect(() => {
    const fetchClientes = async () => {
      if (!tenantId) return;
      setLoadingClientes(true);
      try {
        const data = await getAllClientes(tenantId);
        // Filtrar clientes que tengan teléfono válido
        const conTelefono = (data || []).filter(c => c.telefono && String(c.telefono).trim());
        setClientesCount(conTelefono.length);
      } catch (err) {
        console.error('Error al cargar clientes:', err);
      } finally {
        setLoadingClientes(false);
      }
    };
    fetchClientes();
  }, [tenantId]);

  // Cierre de Sesión de WhatsApp
  const handleLogout = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cerrar la sesión de WhatsApp Web? Deberás volver a escanear el código QR.')) {
      return;
    }
    setLoggingOut(true);
    setErrorMsg('');
    try {
      await logoutWhatsApp();
      await checkStatus();
      setCampaignResult(null);
    } catch (err) {
      setErrorMsg(err.message || 'Error al cerrar sesión de WhatsApp.');
    } finally {
      setLoggingOut(false);
    }
  };

  // Manejo de carga de Flyer
  const handleFlyerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
    setUploadingFlyer(true);
    setErrorMsg('');

    try {
      const publicUrl = await uploadImage(file, tenantId);
      setFlyerPublicUrl(publicUrl);
    } catch (err) {
      console.error('Error al subir flyer:', err);
      setErrorMsg('No se pudo subir la imagen del flyer.');
    } finally {
      setUploadingFlyer(false);
    }
  };

  const handleRemoveFlyer = () => {
    setFlyerFile(null);
    setFlyerPreview(null);
    setFlyerPublicUrl('');
  };

  const insertVariable = (variable) => {
    setMensaje(prev => `${prev} ${variable}`);
  };

  // Abrir Modal de Confirmación
  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (waStatus !== 'CONNECTED') {
      setErrorMsg('Debes conectar tu sesión de WhatsApp antes de disparar la campaña.');
      return;
    }

    if (!mensaje.trim()) {
      setErrorMsg('El mensaje de la campaña no puede estar vacío.');
      return;
    }

    if (clientesCount === 0) {
      setErrorMsg('No tienes clientes con teléfono registrado en este local.');
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Confirmar y Disparar Campaña
  const handleDispararCampana = async () => {
    setSendingCampaign(true);
    setErrorMsg('');
    setCampaignResult(null);

    try {
      const result = await enviarCampanaWhatsApp({
        tenantId,
        mensaje,
        flyerUrl: flyerPublicUrl || undefined
      });

      setCampaignResult(result);
      setIsConfirmModalOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al iniciar la campaña.');
    } finally {
      setSendingCampaign(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* ENCABEZADO */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare color="var(--accent-primary)" size={32} /> Campaña WhatsApp Masiva
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            Gestioná tu sesión de WhatsApp Web y enviá promociones personalizadas a tus clientes.
          </p>
        </div>

        <button 
          onClick={checkStatus}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} className={loadingStatus ? 'animate-spin' : ''} />
          <span>Actualizar Estado</span>
        </button>
      </div>

      {/* MENSAJES DE ERROR GLOBALES */}
      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(183, 65, 52, 0.1)', color: 'var(--danger)',
          padding: '16px', borderRadius: '8px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem',
          border: '1px solid rgba(183, 65, 52, 0.2)'
        }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* RESULTADO DE CAMPAÑA LANZADA */}
      {campaignResult && (
        <div style={{
          backgroundColor: 'rgba(74, 124, 89, 0.12)', color: 'var(--success)',
          padding: '20px', borderRadius: '12px', marginBottom: '32px',
          border: '1px solid rgba(74, 124, 89, 0.3)', display: 'flex', gap: '16px', alignItems: 'flex-start'
        }}>
          <CheckCircle2 size={28} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 6px 0', color: 'var(--success)' }}>
              ¡Campaña iniciada con éxito!
            </h4>
            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
              Se procesarán <strong>{campaignResult.totalClientes} destinatarios</strong> en segundo plano.
              Tiempo estimado de despacho: <strong>~{campaignResult.tiempoEstimadoMinutos} minutos</strong> (con pausas anti-ban).
            </p>
          </div>
          <button 
            onClick={() => setCampaignResult(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        {/* TARJETA 1: GESTIÓN DE SESIÓN Y CÓDIGO QR */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={22} style={{ color: 'var(--accent-primary)' }} /> Sesión WhatsApp
              </h3>
              
              {/* BADGE DE ESTADO */}
              {waStatus === 'CONNECTED' && (
                <span className="badge badge-entregado" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} /> Conectado
                </span>
              )}
              {waStatus === 'QR_READY' && (
                <span className="badge badge-pendiente" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} /> Escanear QR
                </span>
              )}
              {(waStatus === 'DISCONNECTED' || waStatus === 'CHECKING') && (
                <span className="badge badge-pendiente">
                  Iniciando...
                </span>
              )}
              {waStatus === 'OFFLINE' && (
                <span className="badge badge-cancelado">
                  Servidor Offline
                </span>
              )}
            </div>

            {/* CONTENIDO SEGÚN ESTADO DE WHATSAPP */}
            {waStatus === 'CONNECTED' && (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(74, 124, 89, 0.05)', borderRadius: '12px', border: '1px solid rgba(74, 124, 89, 0.15)' }}>
                <CheckCircle2 size={64} style={{ color: 'var(--success)', margin: '0 auto 16px auto' }} />
                <h4 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  WhatsApp Web Vinculado
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Tu sesión está activa y lista para enviar mensajes masivos a la lista de clientes.
                </p>
              </div>
            )}

            {waStatus === 'QR_READY' && qrCodeUrl && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ 
                  background: 'white', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  display: 'inline-block',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  marginBottom: '16px' 
                }}>
                  <img 
                    src={qrCodeUrl} 
                    alt="Código QR WhatsApp" 
                    style={{ width: '220px', height: '220px', display: 'block' }} 
                  />
                </div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                  Escanear código QR
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  Abrí WhatsApp en tu teléfono › <strong>Dispositivos vinculados</strong> › <strong>Vincular dispositivo</strong>.
                </p>
              </div>
            )}

            {waStatus === 'OFFLINE' && (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(183, 65, 52, 0.05)', borderRadius: '12px', border: '1px solid rgba(183, 65, 52, 0.15)' }}>
                <AlertTriangle size={48} style={{ color: 'var(--danger)', margin: '0 auto 12px auto' }} />
                <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--danger)' }}>
                  Microservicio Desconectado
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  Asegurate de tener el microservicio corriendo localmente en el puerto 3001:
                </p>
                <code style={{ background: 'var(--code-bg)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', display: 'inline-block' }}>
                  cd whatsapp-service && npm start
                </code>
              </div>
            )}

            {(waStatus === 'DISCONNECTED' || waStatus === 'CHECKING') && (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent-primary)', margin: '0 auto 16px auto' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Conectando con el servidor de WhatsApp...
                </p>
              </div>
            )}
          </div>

          {/* BOTÓN DE CIERRE DE SESIÓN */}
          {waStatus === 'CONNECTED' && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
              <button 
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn btn-secondary"
                style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(183, 65, 52, 0.3)', fontSize: '0.85rem' }}
              >
                {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                <span>Cerrar Sesión de WhatsApp</span>
              </button>
            </div>
          )}
        </div>

        {/* TARJETA 2: AUDIENCIA Y DESTINATARIOS */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={22} style={{ color: 'var(--accent-primary)' }} /> Destinatarios
            </h3>

            <div style={{ padding: '24px', background: 'rgba(197, 160, 89, 0.05)', borderRadius: '12px', border: '1px solid rgba(197, 160, 89, 0.2)', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Audiencia Alcanzable
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-primary)', lineHeight: 1 }}>
                  {loadingClientes ? '...' : clientesCount}
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>clientes con teléfono</span>
              </div>
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ fontSize: '0.9rem', margin: '0 0 8px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={16} style={{ color: 'var(--accent-primary)' }} /> Estrategia Anti-Ban Integrada
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Los mensajes se despachan en segundo plano con una pausa aleatoria de <strong>8 a 15 segundos</strong> entre envíos para proteger tu número de WhatsApp contra bloqueos.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Tiempo estimado total: <strong>~{Math.ceil((clientesCount * 11.5) / 60)} minutos</strong>
          </div>
        </div>
      </div>

      {/* COMPOSITOR DE LA CAMPAÑA */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.35rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={22} style={{ color: 'var(--accent-primary)' }} /> Redactar Mensaje de la Campaña
        </h3>

        <form onSubmit={handleOpenConfirm}>
          {/* CAMPO MENSAJE */}
          <div className="input-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="input-label" style={{ margin: 0 }}>Mensaje de Texto</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => insertVariable('{nombre}')}
                  style={{
                    background: 'rgba(197, 160, 89, 0.1)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(197, 160, 89, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Insertar nombre del cliente"
                >
                  + Variable {'{nombre}'}
                </button>
              </div>
            </div>

            <textarea
              className="input-field"
              rows={5}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribí el mensaje de tu campaña..."
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>

          {/* ADJUNTAR FLYER / IMAGEN */}
          <div style={{ marginBottom: '32px' }}>
            <label className="input-label" style={{ display: 'block', marginBottom: '8px' }}>
              Flyer / Imagen Promocional (Opcional)
            </label>

            {flyerPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <img 
                  src={flyerPreview} 
                  alt="Flyer Vista Previa" 
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} 
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {flyerFile?.name || 'Flyer adjunto'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {uploadingFlyer ? 'Subiendo imagen...' : 'Imagen lista para la campaña'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFlyer}
                  className="btn btn-secondary"
                  style={{ padding: '8px', color: 'var(--danger)', borderColor: 'rgba(183,65,52,0.3)' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label 
                  htmlFor="flyer-upload"
                  className="btn btn-secondary"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0 }}
                >
                  <ImageIcon size={18} />
                  <span>Seleccionar Imagen / Flyer</span>
                </label>
                <input 
                  id="flyer-upload"
                  type="file" 
                  accept="image/*" 
                  onChange={handleFlyerChange}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Formatos aceptados: JPG, PNG, WEBP (Máx 5MB)
                </span>
              </div>
            )}
          </div>

          {/* BOTÓN DISPARAR CAMPAÑA */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={waStatus !== 'CONNECTED' || clientesCount === 0 || !mensaje.trim() || uploadingFlyer}
              className="btn btn-primary"
              style={{ padding: '14px 32px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Send size={20} />
              <span>Disparar Campaña Masiva</span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE DISPARO */}
      {isConfirmModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)', border: '1px solid var(--glass-border)',
            borderRadius: '16px', maxWidth: '550px', width: '100%', padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ fontSize: '1.4rem', marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Send size={24} style={{ color: 'var(--accent-primary)' }} /> Confirmar Lanzamiento de Campaña
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '20px' }}>
              Estás por enviar este mensaje a <strong>{clientesCount} clientes</strong> vía WhatsApp Web. El envío se realizará secuencialmente en segundo plano.
            </p>

            {/* VISTA PREVIA DEL MENSAJE */}
            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '20px', maxHeight: '180px', overflowY: 'auto' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Vista Previa del Texto
              </span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0, whitespace: 'pre-wrap' }}>
                {mensaje.replace(/\{nombre\}/gi, 'Juan Perez')}
              </p>
            </div>

            {flyerPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: 'rgba(197, 160, 89, 0.05)', padding: '10px', borderRadius: '8px' }}>
                <img src={flyerPreview} alt="Flyer" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Flyer promocional adjunto</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={sendingCampaign}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDispararCampana}
                disabled={sendingCampaign}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {sendingCampaign ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Iniciando...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Confirmar y Enviar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
