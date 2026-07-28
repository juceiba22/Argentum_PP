import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  const { payment_intent_id, tenantId } = req.body;

  if (!payment_intent_id) {
    return res.status(400).json({ success: false, error: 'Falta payment_intent_id' });
  }

  let DEVICE_ID = process.env.MP_POINT_DEVICE_ID;
  let TOKEN = process.env.MP_ACCESS_TOKEN;

  if (tenantId) {
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('mp_access_token, mp_point_device_id')
        .eq('id', tenantId)
        .single();
        
      if (tenant) {
        if (tenant.mp_access_token) TOKEN = tenant.mp_access_token;
        if (tenant.mp_point_device_id) DEVICE_ID = tenant.mp_point_device_id;
      }
    } catch (err) {
      console.warn("Error consultando tenant para mercado pago:", err);
    }
  }

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
