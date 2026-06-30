import { MercadoPagoConfig, PaymentIntent } from 'mercadopago';

// Vercel Serverless Function para consultar el estado del Payment Intent
export default async function handler(req, res) {
  // Soporte para CORS (pre-flight)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Restricción de método
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { payment_intent_id } = req.query;

  if (!payment_intent_id) {
    return res.status(400).json({ success: false, error: 'Falta payment_intent_id' });
  }

  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-TU_ACCESS_TOKEN_AQUI' 
  });

  try {
    const paymentIntent = new PaymentIntent(client);
    const intent = await paymentIntent.get({ payment_intent_id });

    return res.status(200).json({
      success: true,
      intent
    });
  } catch (error) {
    console.error("Error al consultar Payment Intent en MP Point:", error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno al comunicarse con Mercado Pago'
    });
  }
}
