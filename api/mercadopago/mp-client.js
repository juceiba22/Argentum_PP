import { supabaseAdmin as supabase } from '../_shared/supabaseAdmin.js';
import { MercadoPagoConfig } from 'mercadopago';


/**
 * Helper auxiliar que consulta las credenciales específicas del tenant en Supabase
 * (`mp_access_token` y `mp_point_device_id`) e inicializa el cliente de Mercado Pago.
 *
 * Usa SOLO las credenciales que cargó cada carnicería en Config. MP Point.
 * Antes, si faltaban, caía en MP_ACCESS_TOKEN / MP_POINT_DEVICE_ID del
 * servidor (la cuenta de Argentum): una carnicería sin configurar podía
 * terminar cobrando con la cuenta de la plataforma. Ahora, sin credenciales
 * propias, el cobro se rechaza con un mensaje para configurarlas.
 */
export async function getMercadoPagoCredentialsForTenant(tenantId) {
  let accessToken = null;
  let deviceId = null;

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
