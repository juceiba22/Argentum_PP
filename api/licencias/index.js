import crypto from 'crypto';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.js';
import { Resend } from 'resend';
import { verifyTenantAccess } from '../_shared/verifyTenantAuth.js';

/**
 * Venta de licencias anuales de Argentum por Mercado Pago.
 *
 *   POST /api/licencias/checkout  (sesión del carnicero) -> crea la orden y la
 *        preferencia de pago, devuelve el init_point de Mercado Pago.
 *   POST /api/licencias/webhook   (Mercado Pago) -> si el pago está aprobado,
 *        emite el código de 16 dígitos y lo activa en la carnicería que pagó
 *        (función emitir_licencia_por_pago, idempotente).
 *
 * Variables de entorno (Vercel):
 *   MP_LICENCIAS_ACCESS_TOKEN  Access Token de la cuenta de MP de Argentum
 *                              (cae a MP_ACCESS_TOKEN si no está).
 *   SUPABASE_SERVICE_ROLE_KEY  Obligatoria: la orden y la emisión no tienen
 *                              policies para el cliente.
 *   LICENCIA_PRECIO_ANUAL      Precio en ARS (default 299999).
 *   MP_WEBHOOK_SECRET          Recomendado: valida la firma del webhook.
 *   APP_URL                    Opcional: URL pública del sistema (si no, se
 *                              usa el origin del request).
 *   RESEND_API_KEY, RESEND_FROM Opcionales: mail con el código.
 *
 * No usa la tabla licencias_pagos ni licencias_activas (las del checkout de
 * Argentum-Comercios): las órdenes van a licencias_ordenes, así el webhook de
 * ese repo nunca reconoce estos pagos como propios.
 */

const PRECIO_DEFAULT = 299999;
const MESES_LICENCIA = 12;

const precioLicencia = () => {
  const precio = Number(process.env.LICENCIA_PRECIO_ANUAL || PRECIO_DEFAULT);
  return Number.isFinite(precio) && precio > 0 ? precio : PRECIO_DEFAULT;
};

const mpAccessToken = () => (process.env.MP_LICENCIAS_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '').trim();

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const route = req.query.action || urlObj.pathname.split('/').filter(Boolean).pop();

  try {
    switch (route) {
      case 'checkout':
        return await handleCheckout(req, res);
      case 'precio':
        return res.status(200).json({ success: true, precio: precioLicencia(), meses: MESES_LICENCIA });
      case 'webhook':
        return await handleWebhook(req, res, urlObj);
      default:
        return res.status(404).json({ success: false, error: `Ruta no encontrada: ${route || '(vacía)'}` });
    }
  } catch (err) {
    console.error(`[Licencias] Error en /${route}:`, err);
    return res.status(500).json({ success: false, error: err.message || 'Error interno.' });
  }
}

// -----------------------------------------------------------------------------
// checkout
// -----------------------------------------------------------------------------
async function handleCheckout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  const { tenantId } = req.body || {};
  let userId;
  try {
    userId = await verifyTenantAccess(req, tenantId);
  } catch (authErr) {
    return res.status(401).json({ success: false, error: authErr.message });
  }

  const token = mpAccessToken();
  if (!token) {
    return res.status(500).json({ success: false, error: 'El pago online todavía no está configurado (falta el Access Token de Mercado Pago).' });
  }

  const baseUrl = (process.env.APP_URL || req.headers.origin || '').replace(/\/$/, '');
  if (!/^https?:\/\//.test(baseUrl)) {
    return res.status(500).json({ success: false, error: 'No se pudo determinar la URL pública del sistema (configurá APP_URL).' });
  }

  const supabase = getSupabaseAdmin();
  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  const email = authData?.user?.email || null;
  const precio = precioLicencia();

  const { data: orden, error: ordenError } = await supabase
    .from('licencias_ordenes')
    .insert({ tenant_id: tenantId, user_id: userId, email, monto: precio, meses: MESES_LICENCIA })
    .select('id')
    .single();

  if (ordenError) {
    throw new Error(`No se pudo registrar la orden: ${ordenError.message}`);
  }

  const preference = new Preference(new MercadoPagoConfig({ accessToken: token }));
  const respuesta = await preference.create({
    body: {
      items: [{
        id: 'licencia-anual',
        title: 'Argentum · Licencia anual para carnicerías',
        quantity: 1,
        unit_price: precio,
        currency_id: 'ARS'
      }],
      ...(email ? { payer: { email } } : {}),
      external_reference: orden.id,
      back_urls: {
        success: `${baseUrl}/licencia?pago=aprobado`,
        pending: `${baseUrl}/licencia?pago=pendiente`,
        failure: `${baseUrl}/licencia?pago=rechazado`
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/api/licencias/webhook`,
      statement_descriptor: 'ARGENTUM'
    }
  });

  return res.status(200).json({ success: true, init_point: respuesta.init_point, orden_id: orden.id });
}

// -----------------------------------------------------------------------------
// webhook
// -----------------------------------------------------------------------------

// Firma "x-signature" de Mercado Pago (mismo esquema que el webhook de
// Argentum-Comercios). Sin MP_WEBHOOK_SECRET no se puede validar, pero el
// pago igual se consulta a la API de MP con nuestro token y se cruza contra
// la orden y su monto, así que un aviso falso no alcanza para emitir nada.
function firmaValida(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Licencias webhook] MP_WEBHOOK_SECRET no configurado: no se valida la firma.');
    return true;
  }

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  if (!signature || !requestId) return false;

  const partes = Object.fromEntries(String(signature).split(',').map(p => p.trim().split('=').map(s => s.trim())));
  if (!partes.ts || !partes.v1) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${partes.ts};`;
  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return partes.v1.length === esperado.length &&
    crypto.timingSafeEqual(Buffer.from(partes.v1), Buffer.from(esperado));
}

async function handleWebhook(req, res, urlObj) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  const tipo = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
  const paymentId = req.query['data.id'] || urlObj.searchParams.get('data.id') || req.body?.data?.id || req.query.id;

  if (!String(tipo || '').startsWith('payment') || !paymentId) {
    return res.status(200).json({ success: true, ignorado: 'No es un evento de pago' });
  }

  if (!firmaValida(req, paymentId)) {
    console.warn('[Licencias webhook] Firma inválida para el pago', paymentId);
    return res.status(401).json({ success: false, error: 'Firma inválida' });
  }

  const pago = await new Payment(new MercadoPagoConfig({ accessToken: mpAccessToken() })).get({ id: paymentId });
  const ordenId = pago?.external_reference;
  if (!ordenId || !/^[0-9a-f-]{36}$/i.test(ordenId)) {
    return res.status(200).json({ success: true, ignorado: 'Pago sin orden de licencia' });
  }

  const supabase = getSupabaseAdmin();
  const { data: orden } = await supabase.from('licencias_ordenes').select('id, estado').eq('id', ordenId).maybeSingle();
  if (!orden) {
    return res.status(200).json({ success: true, ignorado: 'Orden de licencia inexistente' });
  }

  if (pago.status === 'approved') {
    if (pago.currency_id && pago.currency_id !== 'ARS') {
      throw new Error(`Moneda inesperada en el pago ${paymentId}: ${pago.currency_id}`);
    }

    // Si falla (red, DB) devolvemos 500 para que Mercado Pago reintente: la
    // función es idempotente, nunca emite dos licencias para la misma orden.
    const { data: emision, error } = await supabase.rpc('emitir_licencia_por_pago', {
      p_orden_id: ordenId,
      p_mp_payment_id: String(paymentId),
      p_monto: Number(pago.transaction_amount)
    });
    if (error) throw new Error(`No se pudo emitir la licencia: ${error.message}`);

    if (!emision.ya_emitida) {
      await enviarMailLicencia(emision).catch(err => console.error('[Licencias webhook] No se pudo mandar el mail:', err));
    }
    return res.status(200).json({ success: true });
  }

  if (['rejected', 'cancelled'].includes(pago.status) && orden.estado === 'pendiente') {
    await supabase.from('licencias_ordenes').update({ estado: 'rechazada', mp_payment_id: String(paymentId) }).eq('id', ordenId);
  }

  return res.status(200).json({ success: true, estado: pago.status });
}

async function enviarMailLicencia({ email, codigo, valida_hasta }) {
  if (!process.env.RESEND_API_KEY || !email) return;

  const codigoFormateado = codigo.replace(/(\d{4})(?=\d)/g, '$1-');
  const vence = new Date(valida_hasta).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM || 'Argentum <onboarding@resend.dev>',
    to: [email],
    subject: 'Tu licencia anual de Argentum está activa',
    html: `
      <h2>¡Gracias por tu compra!</h2>
      <p>Tu licencia anual de Argentum ya está activa en tu carnicería y vence el <strong>${vence}</strong>.</p>
      <p>Código de licencia (guardalo como comprobante):</p>
      <p style="font-size:20px;font-weight:bold;letter-spacing:2px">${codigoFormateado}</p>
      <p>No tenés que hacer nada más: ya podés seguir usando el sistema.</p>
      <p>El equipo de Argentum</p>
    `
  });
}
