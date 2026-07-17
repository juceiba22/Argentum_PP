import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Afip = require('@afipsdk/afip.js');

let _afipInstance: any = null;

function buildAfipInstance() {
  const cuit = Number(process.env.AFIP_CUIT);
  if (!cuit) {
    throw new Error('AFIP_CUIT no está configurado en las variables de entorno.');
  }

  const env = process.env.AFIP_ENV ?? 'development';
  const isDev = env === 'development';

  // ─── Modo desarrollo: usar access_token de afipsdk.com ───
  if (isDev && process.env.AFIP_ACCESS_TOKEN) {
    return new Afip({
      CUIT: cuit,
      access_token: process.env.AFIP_ACCESS_TOKEN,
      production: false,
    });
  }

  // ─── Modo producción (o dev con certificados propios) ───
  const certB64 = process.env.AFIP_CERT;
  const keyB64 = process.env.AFIP_PRIVATE_KEY;

  if (!certB64 || !keyB64) {
    throw new Error(
      'Faltan configurar AFIP_CERT y AFIP_PRIVATE_KEY en las variables de entorno ' +
        '(o AFIP_ACCESS_TOKEN para modo desarrollo)'
    );
  }

  const cert = Buffer.from(certB64, 'base64').toString('utf-8').replace(/\r\n/g, '\n').trim();
  const key = Buffer.from(keyB64, 'base64').toString('utf-8').replace(/\r\n/g, '\n').trim();

  return new Afip({
    CUIT: cuit,
    cert: cert,
    key: key,
    access_token: process.env.AFIP_ACCESS_TOKEN,
    production: !isDev,
  });
}

/**
 * Retorna la instancia singleton de AfipSDK.
 */
export function getAfipClient() {
  if (!_afipInstance) {
    _afipInstance = buildAfipInstance();
  }
  return _afipInstance;
}
