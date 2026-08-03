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
