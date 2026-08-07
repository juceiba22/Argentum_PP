import { Order } from 'mercadopago';
import { getMercadoPagoCredentialsForTenant } from './mp-client.js';

export default async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo GET).' });
  }

  try {
    const { payment_intent_id, tenantId } = req.query || {};

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

    const { client } = mpCredentials;
    const order = new Order(client);
    const intent = await order.get({ id: payment_intent_id });

    return res.status(200).json({
      success: true,
      intent
    });
  } catch (error) {
    console.error("Error al consultar Payment Intent en MP Point:", error);
    return res.status(200).json({
      success: false,
      error: error.message || 'Error al consultar estado de pago en Mercado Pago.'
    });
  }
}
