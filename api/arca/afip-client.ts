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
 * Utiliza el CUIT delegado del tenant junto con el Certificado y Clave Privada ÚNICOS
 * de la Plataforma (PLATFORM_AFIP_CERT y PLATFORM_AFIP_KEY).
 * 
 * Si skipDelegationCheck es true, no exige que afip_delegacion_verificada sea true (útil para verificar).
 */
export async function getAfipClientForTenant(tenantId?: string, skipDelegationCheck: boolean = false) {
  let cuitDelegado: string | null = null;
  let puntoVenta = Number(process.env.AFIP_PUNTO_DE_VENTA ?? 1);
  let env = process.env.AFIP_ENV ?? 'development';
  let delegacionVerificada = false;

  if (tenantId) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('afip_cuit_delegado, afip_punto_de_venta, afip_env, afip_delegacion_verificada')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) {
      console.error(`Error consultando tenant ${tenantId} en Supabase:`, error.message);
    }

    if (tenant) {
      cuitDelegado = tenant.afip_cuit_delegado ? String(tenant.afip_cuit_delegado).trim() : null;
      if (tenant.afip_punto_de_venta) puntoVenta = Number(tenant.afip_punto_de_venta);
      if (tenant.afip_env) env = tenant.afip_env;
      delegacionVerificada = Boolean(tenant.afip_delegacion_verificada);
    }
  } else {
    // Fallback si no se provee tenantId (para invocaciones genéricas)
    cuitDelegado = process.env.AFIP_CUIT ?? null;
    delegacionVerificada = true;
  }

  // 1. Error explícito si afip_cuit_delegado no está configurado
  if (!cuitDelegado) {
    throw new Error('El comercio no tiene configurado un CUIT delegado de AFIP.');
  }

  const cuitNumber = Number(cuitDelegado.replace(/\D/g, ''));
  if (!cuitNumber || isNaN(cuitNumber)) {
    throw new Error('El CUIT delegado del comercio no es un número válido.');
  }

  // 2. Error explícito distinto si afip_delegacion_verificada es false
  if (!skipDelegationCheck && !delegacionVerificada) {
    throw new Error('La delegación del servicio de AFIP / ARCA no ha sido verificada para este comercio.');
  }

  // 3. Obtener certificado y clave privada ÚNICOS de la plataforma
  const certRaw = process.env.PLATFORM_AFIP_CERT || process.env.AFIP_CERT;
  const keyRaw = process.env.PLATFORM_AFIP_KEY || process.env.AFIP_PRIVATE_KEY;

  const cert = parsePemOrBase64(certRaw);
  const key = parsePemOrBase64(keyRaw);

  if (!cert || !key) {
    throw new Error('Faltan configurar los certificados de la plataforma (PLATFORM_AFIP_CERT y PLATFORM_AFIP_KEY).');
  }

  const isDev = env === 'development';

  try {
    const afipInstance = new Afip({
      CUIT: cuitNumber,
      cert: cert,
      key: key,
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
