import fetch from 'node-fetch';

// Vercel Serverless Function para cancelar el Payment Intent (Order) en el dispositivo
export default async function handler(req, res) {
  // Soporte para CORS (pre-flight)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Restricción de método
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { payment_intent_id } = req.body;

  if (!payment_intent_id) {
    return res.status(400).json({ success: false, error: 'Falta payment_intent_id' });
  }

  const DEVICE_ID = process.env.MP_POINT_DEVICE_ID;
  const TOKEN = process.env.MP_ACCESS_TOKEN;

  if (!DEVICE_ID || !TOKEN) {
     return res.status(500).json({ success: false, error: 'Credenciales incompletas en el servidor' });
  }

  try {
    // API de Integración Point para cancelar intención de pago activa en el dispositivo
    const response = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${DEVICE_ID}/payment-intents/${payment_intent_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!response.ok) {
       console.warn("Mercado Pago retornó error al intentar cancelar en el dispositivo:", response.status);
       // A veces MP devuelve error si ya fue cobrado o expirado, pero localmente igual limpiamos
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error al cancelar orden en MP Point:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
