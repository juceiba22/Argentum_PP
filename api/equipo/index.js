import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { verifyTenantAccess } from '../_shared/verifyTenantAuth.js';

/**
 * Equipo de la carnicería.
 *
 *   POST /api/equipo/notificar  (sesión del dueño) { tenantId, invitacionId }
 *        Manda por mail el link de una invitación pendiente. La invitación en
 *        sí se crea con la función invitar_vendedor de la base; esto es solo
 *        el aviso. Sin RESEND_API_KEY devuelve { enviado: false } y la app
 *        ofrece compartir el link por WhatsApp.
 *
 * Variables: SUPABASE_SERVICE_ROLE_KEY (obligatoria), APP_URL (opcional),
 * RESEND_API_KEY y RESEND_FROM (opcionales).
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const route = req.query.action || urlObj.pathname.split('/').filter(Boolean).pop();

  try {
    if (route === 'notificar') return await handleNotificar(req, res);
    return res.status(404).json({ success: false, error: `Ruta no encontrada: ${route || '(vacía)'}` });
  } catch (err) {
    console.error(`[Equipo] Error en /${route}:`, err);
    return res.status(500).json({ success: false, error: err.message || 'Error interno.' });
  }
}

async function handleNotificar(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  const { tenantId, invitacionId } = req.body || {};
  try {
    await verifyTenantAccess(req, tenantId);
  } catch (authErr) {
    return res.status(401).json({ success: false, error: authErr.message });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Falta SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // La invitación tiene que ser de esta carnicería y estar pendiente.
  const { data: invitacion } = await supabase
    .from('invitaciones')
    .select('id, email, estado, tenants(nombre_comercio)')
    .eq('id', invitacionId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!invitacion || invitacion.estado !== 'pendiente') {
    return res.status(404).json({ success: false, error: 'La invitación no existe o ya no está pendiente.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ success: true, enviado: false });
  }

  const baseUrl = (process.env.APP_URL || req.headers.origin || '').replace(/\/$/, '');
  const link = `${baseUrl}/login?invitacion=${invitacion.id}`;
  const comercio = invitacion.tenants?.nombre_comercio || 'una carnicería';

  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM || 'Argentum <onboarding@resend.dev>',
    to: [invitacion.email],
    subject: `${comercio} te invitó a Argentum`,
    html: `
      <h2>Te invitaron a ${escapeHtml(comercio)}</h2>
      <p>Te sumaron como vendedor en Argentum, el sistema de la carnicería.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 22px;background:#8e1b1b;color:#fff;border-radius:999px;text-decoration:none;font-weight:bold">Aceptar la invitación</a></p>
      <p>Entrá con este mismo email (<strong>${escapeHtml(invitacion.email)}</strong>), con Google o creando una contraseña.</p>
      <p>El equipo de Argentum</p>
    `
  });

  return res.status(200).json({ success: true, enviado: true });
}

function escapeHtml(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
