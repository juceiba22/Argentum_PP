import { MercadoPagoConfig, Order } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  const { payment_intent_id, tenantId } = req.query;

  if (!payment_intent_id) {
    return res.status(400).json({ success: false, error: 'Falta payment_intent_id' });
  }

  let accessToken = process.env.MP_ACCESS_TOKEN;

  if (tenantId) {
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('mp_access_token')
        .eq('id', tenantId)
        .single();
        
      if (tenant && tenant.mp_access_token) {
        accessToken = tenant.mp_access_token;
      }
    } catch (err) {
      console.warn("Error consultando tenant para mercado pago:", err);
    }
  }

  const client = new MercadoPagoConfig({ 
    accessToken: accessToken || 'APP_USR-TU_ACCESS_TOKEN_AQUI' 
  });

  try {
    const order = new Order(client);
    const intent = await order.get({ id: payment_intent_id });

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
