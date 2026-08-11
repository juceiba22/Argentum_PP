import { Order, Preference } from 'mercadopago';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { getMercadoPagoCredentialsForTenant } from './mp-client.js';

// Inicializar cliente de Supabase con Service Role Key para operaciones administrativas sin RLS
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

/**
 * Enrutador Central de Mercado Pago para Vercel Serverless Functions
 */
export default async function handler(req, res) {
  // Asegurar cabeceras de CORS y JSON
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Determinar la sub-ruta o acción solicitada
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/').filter(Boolean);
    
    let route = req.query.action || req.query.path;
    if (!route || route === 'index' || route === 'index.js') {
      route = parts[parts.length - 1];
    }
    if (route === 'mercadopago' || !route) {
      route = 'webhook';
    }

    switch (route) {
      case 'create-point-payment':
        return await handleCreatePointPayment(req, res);
      case 'get-payment-intent':
        return await handleGetPaymentIntent(req, res);
      case 'cancel-point-payment':
        return await handleCancelPointPayment(req, res);
      case 'create-preference':
        return await handleCreatePreference(req, res);
      case 'webhook':
      default:
        return await handleWebhook(req, res);
    }
  } catch (err) {
    console.error('[MP Central Router] Error general en el manejador:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error interno en servidor MP.' });
  }
}

// -----------------------------------------------------------------------------
// 1. HANDLER: create-point-payment
// -----------------------------------------------------------------------------
async function handleCreatePointPayment(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  const { total, pedidoId, tenantId } = req.body || {};

  if (!total || !pedidoId) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios: total y/o pedidoId' });
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

  const { client, deviceId } = mpCredentials;
  const order = new Order(client);

  const requestOptions = {
    idempotencyKey: crypto.randomUUID()
  };
  
  const body = {
    type: "point",
    external_reference: String(pedidoId),
    transactions: {
      payments: [{ amount: String(Number(total).toFixed(2)) }]
    },
    config: {
      point: {
        terminal_id: deviceId,
        print_on_terminal: "no_ticket"
      }
    },
    description: `Cobro POS - Pedido #${String(pedidoId).substring(0, 8)}`
  };

  const response = await order.create({ body, requestOptions });

  return res.status(200).json({
    success: true,
    paymentIntent: response
  });
}

// -----------------------------------------------------------------------------
// 2. HANDLER: get-payment-intent
// -----------------------------------------------------------------------------
async function handleGetPaymentIntent(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo GET).' });
  }

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
}

// -----------------------------------------------------------------------------
// 3. HANDLER: cancel-point-payment
// -----------------------------------------------------------------------------
async function handleCancelPointPayment(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Método no permitido.' });
  }

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
}

// -----------------------------------------------------------------------------
// 4. HANDLER: create-preference (Checkout de suscripción/licencia)
// -----------------------------------------------------------------------------
async function handleCreatePreference(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  const { email, planName = 'Pro', price = 15000 } = req.body || {};

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email del comprador es obligatorio.' });
  }

  const mpAccessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
  if (!mpAccessToken) {
    return res.status(500).json({ success: false, error: 'Falta configurar MP_ACCESS_TOKEN global en el servidor.' });
  }

  const preference = new Preference({ accessToken: mpAccessToken });
  
  const response = await preference.create({
    body: {
      items: [
        {
          title: `Licencia Anual Argentum - Plan ${planName}`,
          quantity: 1,
          unit_price: Number(price),
          currency_id: 'ARS'
        }
      ],
      payer: {
        email: email.toLowerCase().trim()
      },
      external_reference: email.toLowerCase().trim(),
      metadata: {
        payer_email: email.toLowerCase().trim(),
        plan: planName
      },
      back_urls: {
        success: 'https://argentum.com/market',
        failure: 'https://argentum.com/market',
        pending: 'https://argentum.com/market'
      },
      auto_return: 'approved'
    }
  });

  return res.status(200).json({
    success: true,
    init_point: response.init_point,
    id: response.id
  });
}

// -----------------------------------------------------------------------------
// 5. HANDLER: webhook (IPN / Webhooks con Service Role Key de Supabase)
// -----------------------------------------------------------------------------
async function handleWebhook(req, res) {
  const query = req.query || {};
  const body = req.body || {};

  const type = query.type || query.topic || body.type || body.action;
  const paymentId = query.id || query['data.id'] || body?.data?.id || body?.id;

  console.log(`[MP Webhook Central] Notificación recibida: type=${type}, id=${paymentId}`);

  if (!paymentId) {
    return res.status(200).json({ success: true, message: 'Webhook recibido sin ID de pago' });
  }

  const mpAccessToken = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN;
  let paymentData = null;

  if (mpAccessToken) {
    try {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mpAccessToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      if (mpResponse.ok) {
        paymentData = await mpResponse.json();
      }
    } catch (mpErr) {
      console.warn(`[MP Webhook] Excepción consultando pago ${paymentId}:`, mpErr);
    }
  }

  if (!paymentData && body.status) {
    paymentData = body;
  }

  if (!paymentData) {
    return res.status(200).json({ success: true, message: 'Notificación procesada sin detalles de pago' });
  }

  const status = paymentData.status;

  if (status === 'approved') {
    const payerEmail = 
      paymentData.payer?.email || 
      paymentData.additional_info?.payer?.email || 
      paymentData.external_reference || 
      paymentData.metadata?.payer_email;

    const planName = paymentData.metadata?.plan || 'Pro';

    if (!payerEmail) {
      return res.status(200).json({ success: false, error: 'Email de pagador no encontrado en el pago' });
    }

    const cleanEmail = payerEmail.toLowerCase().trim();

    const validaHastaDate = new Date();
    validaHastaDate.setFullYear(validaHastaDate.getFullYear() + 1);

    const { error } = await supabase
      .from('licencias_activas')
      .upsert({
        email: cleanEmail,
        plan: planName,
        valida_hasta: validaHastaDate.toISOString(),
        external_reference_pago: String(paymentId),
        estado: 'activa',
        fecha_compra: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (error) {
      console.error(`[MP Webhook] Error en upsert de licencias_activas para ${cleanEmail}:`, error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Licencia de 1 año activada para ${cleanEmail}`,
      email: cleanEmail,
      valida_hasta: validaHastaDate.toISOString()
    });
  }

  return res.status(200).json({
    success: true,
    message: `Pago en estado '${status}', no requiere activación de licencia`
  });
}
