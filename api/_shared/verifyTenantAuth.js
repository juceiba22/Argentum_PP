import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/**
 * Verifica que el request traiga un JWT válido de Supabase (header
 * Authorization: Bearer <token>) y que el usuario autenticado esté vinculado
 * -vía tenant_users- al tenantId que reclama operar. Lanza si no es así.
 *
 * Los endpoints de /api/mercadopago y /api/arca corren con la Service Role
 * Key (necesaria para leer credenciales del tenant sin pasar por RLS), lo
 * que significa que RLS NO los protege: sin este chequeo, cualquiera que
 * conozca o adivine un tenantId puede cobrar en su terminal Point o emitir
 * facturas AFIP en su nombre, sin siquiera estar logueado.
 */
export async function verifyTenantAccess(req, tenantId) {
  if (!tenantId) {
    throw new Error('Falta el tenantId.');
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    throw new Error('No autenticado: falta el token de sesión.');
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new Error('Sesión inválida o expirada.');
  }

  const { data: link, error: linkError } = await supabaseAdmin
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userData.user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error('No autorizado para operar sobre este comercio.');
  }

  return userData.user.id;
}
