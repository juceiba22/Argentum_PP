import { MercadoPagoConfig } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  '';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Helper auxiliar que consulta las credenciales específicas del tenant en Supabase
 * (`mp_access_token` y `mp_point_device_id`) e inicializa el cliente de Mercado Pago.
 */
export async function getMercadoPagoCredentialsForTenant(tenantId) {
  let accessToken = process.env.MP_ACCESS_TOKEN ? process.env.MP_ACCESS_TOKEN.trim() : null;
  let deviceId = process.env.MP_POINT_DEVICE_ID ? process.env.MP_POINT_DEVICE_ID.trim() : null;

  if (tenantId) {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('mp_access_token, mp_point_device_id')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) {
        console.error(`Error consultando credenciales de MP para tenant ${tenantId}:`, error.message);
      }

      if (tenant) {
        if (tenant.mp_access_token && tenant.mp_access_token.trim()) {
          accessToken = tenant.mp_access_token.trim();
        }
        if (tenant.mp_point_device_id && tenant.mp_point_device_id.trim()) {
          deviceId = tenant.mp_point_device_id.trim();
        }
      }
    } catch (err) {
      console.warn(`Excepción al consultar credenciales MP para tenant ${tenantId}:`, err);
    }
  }

  // Validación 1: Verificar existencia del Access Token
  if (!accessToken) {
    throw new Error('El comercio no tiene configurado un Access Token de Mercado Pago. Configúralo en Config. MP Point.');
  }

  // Validación 2: Verificar existencia del Device ID de la terminal Point
  if (!deviceId) {
    throw new Error('El comercio no tiene configurado el Device ID de su terminal Mercado Pago Point.');
  }

  // Inicializar SDK oficial de Mercado Pago
  const client = new MercadoPagoConfig({ accessToken });

  return {
    accessToken,
    deviceId,
    client
  };
}
