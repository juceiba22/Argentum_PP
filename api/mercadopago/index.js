import { Order } from 'mercadopago';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { getMercadoPagoCredentialsForTenant } from './mp-client.js';
import { verifyTenantAccess } from '../_shared/verifyTenantAuth.js';

/**
 * Enrutador Central de Mercado Pago para Vercel Serverless Functions
 *
 * IMPORTANTE: este archivo maneja EXCLUSIVAMENTE los cobros con terminal
 * Point (create-point-payment / get-payment-intent / cancel-point-payment).
 * La compra y activación de licencias (create-preference / webhook) vive
 * únicamente en el repo Argentum-Comercios (api/mercadopago/create-preference.js
 * y api/mercadopago/webhook.js), que es el checkout público real. No
 * dupliques esa lógica acá: hubo dos implementaciones divergentes que
 * escribían a licencias_activas con reglas distintas y eso costó bugs de
 * licencias que nunca se activaban. Si un comercio necesita cobrar con Point,
 * es un flujo completamente aparte de la compra de licencia.
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
      route = '';
    }

    switch (route) {
      case 'create-point-payment':
        return await handleCreatePointPayment(req, res);
      case 'get-payment-intent':
        return await handleGetPaymentIntent(req, res);
      case 'cancel-point-payment':
        return await handleCancelPointPayment(req, res);
      default:
        // create-preference/webhook de licencias viven solo en Argentum-Comercios.
        return res.status(404).json({ success: false, error: `Ruta no encontrada: ${route || '(vacía)'}` });
    }
  } catch (err) {
    console.error('[MP Central Router] Error general en el manejador:', err);
    return res.status(200).json({ success: false, error: err.message || 'Error interno en servidor MP.' });
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

  try {
    await verifyTenantAccess(req, tenantId);
  } catch (authErr) {
    return res.status(401).json({ success: false, error: authErr.message });
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

  try {
    const response = await order.create({ body, requestOptions });

    return res.status(200).json({
      success: true,
      paymentIntent: response
    });
  } catch (err) {
    console.error('[MP Point] Error al crear orden:', err);
    return res.status(200).json({
      success: false,
      error: err.message || 'Error al comunicarse con Mercado Pago Point.'
    });
  }
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

  try {
    await verifyTenantAccess(req, tenantId);
  } catch (authErr) {
    return res.status(401).json({ success: false, error: authErr.message });
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

  try {
    await verifyTenantAccess(req, tenantId);
  } catch (authErr) {
    return res.status(401).json({ success: false, error: authErr.message });
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

