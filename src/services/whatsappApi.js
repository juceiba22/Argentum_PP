const WHATSAPP_SERVICE_URL = import.meta.env.VITE_WHATSAPP_SERVICE_URL || 'http://localhost:3001';

export const getWhatsAppStatus = async () => {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/api/status`);
    if (!res.ok) {
      return { status: 'OFFLINE', qrCodeUrl: null };
    }
    return await res.json();
  } catch (err) {
    return { status: 'OFFLINE', qrCodeUrl: null, error: err.message };
  }
};

export const logoutWhatsApp = async () => {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch (err) {
    throw new Error('No se pudo conectar con el microservicio de WhatsApp.');
  }
};

export const enviarCampanaWhatsApp = async ({ tenantId, mensaje, flyerUrl }) => {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/api/enviar-campana`, {
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
