import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
const Afip = require('@afipsdk/afip.js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_KEY || 
  '';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Función auxiliar para parsear credenciales en formato PEM o Base64
 */
function parsePemOrBase64(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.includes('-----BEGIN')) {
    return trimmed.replace(/\r\n/g, '\n');
  }
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8').trim();
    if (decoded.includes('-----BEGIN')) {
      return decoded.replace(/\r\n/g, '\n');
    }
  } catch (e) {
    // Si no es un base64 válido, retorna la cadena recortada
  }
  return trimmed;
}

/**
 * Retorna la instancia de AfipSDK configurada dinámicamente para un tenant específico.
 * Consulta la tabla `tenants` de Supabase usando la Service Role Key para garantizar
 * el aislamiento multi-tenant estricto.
 */
export async function getAfipClientForTenant(tenantId?: string) {
  let cuit: number | null = process.env.AFIP_CUIT ? Number(process.env.AFIP_CUIT) : null;
  let env = process.env.AFIP_ENV ?? 'development';
  let accessToken: string | undefined = process.env.AFIP_ACCESS_TOKEN;
  let certRaw: string | undefined = process.env.AFIP_CERT;
  let keyRaw: string | undefined = process.env.AFIP_PRIVATE_KEY;
  let puntoVenta = Number(process.env.AFIP_PUNTO_DE_VENTA ?? 1);

  // Si se provee un tenantId, consultamos sus credenciales exclusivas en la tabla `tenants`
  if (tenantId) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('afip_cuit, afip_punto_de_venta, afip_cert, afip_private_key, afip_env, afip_access_token')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) {
      console.error(`Error consultando credenciales para tenant ${tenantId}:`, error.message);
    }

    if (tenant) {
      if (tenant.afip_cuit) cuit = Number(tenant.afip_cuit);
      if (tenant.afip_punto_de_venta) puntoVenta = Number(tenant.afip_punto_de_venta);
      if (tenant.afip_env) env = tenant.afip_env;
      if (tenant.afip_access_token) accessToken = tenant.afip_access_token;
      if (tenant.afip_cert) certRaw = tenant.afip_cert;
      if (tenant.afip_private_key) keyRaw = tenant.afip_private_key;
    }
  }

  // Validación 1: Verificar existencia del CUIT del comercio
  if (!cuit || isNaN(cuit)) {
    throw new Error('El comercio no tiene configurado un CUIT fiscal válido en sus credenciales de AFIP.');
  }

  const isDev = env === 'development';

  // Opción 1: Modo desarrollo con access_token de afipsdk.com
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

  // Opción 2: Autenticación nativa AFIP con certificados digitales (.crt y .key)
  const cert = parsePemOrBase64(certRaw);
  const key = parsePemOrBase64(keyRaw);

  if (!cert || !key) {
    throw new Error('El comercio no tiene configuradas sus credenciales fiscales de AFIP (Certificado .crt o Clave Privada .key faltantes).');
  }

  try {
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
  } catch (err: any) {
    throw new Error(`Error al inicializar el SDK de AFIP: ${err.message || String(err)}`);
  }
}

/**
 * Retorna la instancia de AfipSDK por defecto.
 */
export async function getAfipClient() {
  const { afip } = await getAfipClientForTenant();
  return afip;
}
