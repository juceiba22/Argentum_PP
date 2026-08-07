const DEFAULT_URL = 'http://localhost:3001';

export const getWhatsAppServiceUrl = () => {
  const savedUrl = localStorage.getItem('WHATSAPP_SERVICE_URL');
  if (savedUrl && savedUrl.trim()) {
    return savedUrl.trim().replace(/\/+$/, '');
  }
  const envUrl = import.meta.env.VITE_WHATSAPP_SERVICE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_URL;
};

export const setWhatsAppServiceUrl = (url) => {
  if (!url || !url.trim()) {
    localStorage.removeItem('WHATSAPP_SERVICE_URL');
  } else {
    let formatted = url.trim().replace(/\/+$/, '');
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }
    localStorage.setItem('WHATSAPP_SERVICE_URL', formatted);
  }
};

export const resetWhatsAppServiceUrl = () => {
  localStorage.removeItem('WHATSAPP_SERVICE_URL');
};

export const getWhatsAppStatus = async () => {
  const serviceUrl = getWhatsAppServiceUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${serviceUrl}/api/status`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { status: 'OFFLINE', qrCodeUrl: null, serviceUrl };
    }
    const data = await res.json();
    return { ...data, serviceUrl };
  } catch (err) {
    return { status: 'OFFLINE', qrCodeUrl: null, serviceUrl, error: err.message };
  }
};

export const logoutWhatsApp = async () => {
  const serviceUrl = getWhatsAppServiceUrl();
  try {
    const res = await fetch(`${serviceUrl}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch (err) {
    throw new Error('No se pudo conectar con el microservicio de WhatsApp en ' + serviceUrl);
  }
};

export const restartWhatsAppClient = async () => {
  const serviceUrl = getWhatsAppServiceUrl();
  try {
    const res = await fetch(`${serviceUrl}/api/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch (err) {
    throw new Error('No se pudo solicitar el reinicio en ' + serviceUrl);
  }
};

export const enviarCampanaWhatsApp = async ({ tenantId, mensaje, flyerUrl }) => {
  const serviceUrl = getWhatsAppServiceUrl();
  try {
    const res = await fetch(`${serviceUrl}/api/enviar-campana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, mensaje, flyerUrl })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Error al enviar la campaña');
    }
    return data;
  } catch (err) {
    throw err;
  }
};

/**
 * Plantilla oficial para alta de nuevo comercio / bienvenida con delegación ARCA
 */
export const getMensajeBienvenidaDelegacion = (nombreComercio = 'tu comercio') => {
  return `¡Hola {nombre}! Bienvenido a la plataforma para ${nombreComercio}.\n\n` +
    `Para habilitar la Facturación Electrónica de tu comercio, por favor realizá la delegación del servicio en ARCA / AFIP:\n\n` +
    `1. Ingresá al portal oficial de ARCA: https://auth.afip.gob.ar/\n` +
    `2. En 'Administrador de Relaciones', delegá el servicio de Facturación Electrónica a nuestro CUIT de plataforma.\n` +
    `3. De regreso en la app, ingresá a 'Configuración Fiscal' y hacé clic en 'Verificar delegación'.\n\n` +
    `Recordá que la plataforma NUNCA te solicitará tu Clave Fiscal ni certificados privados.`;
};

/**
 * Envía notificación individual al dar de alta un comercio nuevo por WhatsApp
 */
export const enviarNotificacionAltaComercio = async ({ telefono, nombreComercio }) => {
  const serviceUrl = getWhatsAppServiceUrl();
  const mensaje = getMensajeBienvenidaDelegacion(nombreComercio);
  try {
    const res = await fetch(`${serviceUrl}/api/enviar-notificacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, mensaje })
    });
    return await res.json();
  } catch (err) {
    console.warn('No se pudo enviar la notificación de alta por WhatsApp:', err.message);
  }
};
