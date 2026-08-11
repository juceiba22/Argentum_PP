import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase con Service Role Key para ignorar RLS en el servidor
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

export default async function handler(req, res) {
  // Encabezados de CORS y Content-Type
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Mercado Pago envía notificaciones por POST o GET con distintos formatos de query/body
    const query = req.query || {};
    const body = req.body || {};

    const type = query.type || query.topic || body.type || body.action;
    const paymentId = query.id || query['data.id'] || body?.data?.id || body?.id;

    console.log(`[MP Webhook] Notificación recibida: type=${type}, id=${paymentId}`);

    // Si no se proporcionó ID de pago, responder OK para confirmar recepción a MP
    if (!paymentId) {
      return res.status(200).json({ success: true, message: 'Webhook recibido sin ID de pago' });
    }

    // Consultar el estado del pago directamente en la API de Mercado Pago
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
        } else {
          console.warn(`[MP Webhook] No se pudo consultar el pago ${paymentId} en MP API: status ${mpResponse.status}`);
        }
      } catch (mpErr) {
        console.warn(`[MP Webhook] Excepción consultando pago ${paymentId} en MP:`, mpErr);
      }
    }

    // Fallback: Si no pudimos consultar a la API de MP pero el body incluye datos del pago
    if (!paymentData && body.status) {
      paymentData = body;
    }

    if (!paymentData) {
      console.log(`[MP Webhook] No se obtuvieron detalles para el pago ${paymentId}.`);
      return res.status(200).json({ success: true, message: 'Notificación procesada sin datos de pago' });
    }

    const status = paymentData.status;
    console.log(`[MP Webhook] Estado del pago ${paymentId}: ${status}`);

    // Procesar únicamente pagos APROBADOS ('approved')
    if (status === 'approved') {
      // Extraer email del comprador
      const payerEmail = 
        paymentData.payer?.email || 
        paymentData.additional_info?.payer?.email || 
        paymentData.external_reference || 
        paymentData.metadata?.payer_email;

      const planName = paymentData.metadata?.plan || 'Pro';

      if (!payerEmail) {
        console.error(`[MP Webhook] Error: Pago ${paymentId} aprobado pero no se encontró el email del pagador.`);
        return res.status(200).json({ success: false, error: 'Email de pagador no encontrado en el pago' });
      }

      const cleanEmail = payerEmail.toLowerCase().trim();

      // Calcular fecha 'valida_hasta' a 1 año a partir del día de hoy
      const validaHastaDate = new Date();
      validaHastaDate.setFullYear(validaHastaDate.getFullYear() + 1);

      console.log(`[MP Webhook] Activando Licencia Pro para: ${cleanEmail} válida hasta ${validaHastaDate.toISOString()}`);

      // Upsert en la tabla licencias_activas de Supabase (con Service Role Key)
      const { data, error } = await supabase
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
        console.error(`[MP Webhook] Error upserting licencias_activas para ${cleanEmail}:`, error.message);
        return res.status(500).json({ success: false, error: error.message });
      }

      console.log(`[MP Webhook] Licencia activada exitosamente en Supabase para ${cleanEmail}`);
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

  } catch (error) {
    console.error('[MP Webhook] Error crítico procesando webhook:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
