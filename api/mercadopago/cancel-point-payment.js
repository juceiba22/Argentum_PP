import fetch from 'node-fetch';
import { getMercadoPagoCredentialsForTenant } from './mp-client.js';

export default async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  try {
    const { payment_intent_id, tenantId } = req.body || {};

    if (!payment_intent_id) {
      return res.status(400).json({ success: false, error: 'Falta el parámetro payment_intent_id.' });
    }

    let mpCredentials;
    try {
      mpCredentials = await getMercadoPagoCredentialsForTenant(tenantId);
    } catch (credErr) {
      return res.status(200).json({
        success: false,
        error: credErr.message || 'El POS de Mercado Pago no está configurado para este comercio.'
      });
    }

    const { accessToken, deviceId } = mpCredentials;

    // API de Integración Point para cancelar intención de pago activa en el dispositivo
    const response = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents/${payment_intent_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.warn("Mercado Pago retornó estado no OK al cancelar en la terminal:", response.status);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error al cancelar orden en MP Point:", error);
    return res.status(200).json({
      success: false,
      error: error.message || 'Error al cancelar la orden en Mercado Pago Point.'
    });
  }
}
