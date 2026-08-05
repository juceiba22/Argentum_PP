import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
const Afip = require('@afipsdk/afip.js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Retorna la instancia de AfipSDK configurada para un tenant específico.
 */
export async function getAfipClientForTenant(tenantId?: string) {
  let cuit = process.env.AFIP_CUIT ? Number(process.env.AFIP_CUIT) : null;
  let env = process.env.AFIP_ENV ?? 'development';
  let accessToken = process.env.AFIP_ACCESS_TOKEN;
  let certB64 = process.env.AFIP_CERT;
  let keyB64 = process.env.AFIP_PRIVATE_KEY;
  let puntoVenta = Number(process.env.AFIP_PUNTO_DE_VENTA ?? 1);

  // Si se provee un tenantId, intentamos buscar sus credenciales personalizadas en Supabase
  if (tenantId) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('afip_cuit, afip_punto_de_venta, afip_cert, afip_private_key, afip_env, afip_access_token')
      .eq('id', tenantId)
      .single();

    if (!error && tenant && tenant.afip_cuit) {
      cuit = Number(tenant.afip_cuit);
      puntoVenta = tenant.afip_punto_de_venta ?? puntoVenta;
      env = tenant.afip_env ?? env;
      accessToken = tenant.afip_access_token ?? accessToken;
      certB64 = tenant.afip_cert ?? certB64;
      keyB64 = tenant.afip_private_key ?? keyB64;
    }
  }

  if (!cuit) {
    throw new Error('AFIP_CUIT no está configurado para este comercio (tenant).');
  }

  const isDev = env === 'development';

  // ─── Modo desarrollo: usar access_token de afipsdk.com ───
  if (isDev && accessToken) {
    return {
      afip: new Afip({
        CUIT: cuit,
        access_token: accessToken,
        production: false,
      }),
      ptoVta: puntoVenta,
      isMock: false
    };
  }

  // ─── Modo producción (o dev con certificados propios) ───
  if (!certB64 || !keyB64) {
    // Si no hay certificados y estamos probando sin CUIT configurado, retornamos mock transparente
    throw new Error('Faltan configurar los certificados AFIP_CERT y AFIP_PRIVATE_KEY para este comercio.');
  }

  const cert = Buffer.from(certB64, 'base64').toString('utf-8').replace(/\r\n/g, '\n').trim();
  const key = Buffer.from(keyB64, 'base64').toString('utf-8').replace(/\r\n/g, '\n').trim();

  const afipInstance = new Afip({
    CUIT: cuit,
    cert: cert,
    key: key,
    access_token: accessToken,
    production: !isDev,
  });

  return {
    afip: afipInstance,
    ptoVta: puntoVenta,
    isMock: false
  };
}

/**
 * Retorna la instancia de AfipSDK por defecto.
 */
export async function getAfipClient() {
  const { afip } = await getAfipClientForTenant();
  return afip;
}
