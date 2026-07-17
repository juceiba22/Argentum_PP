import type { EmitirFacturaPayload, EmitirFacturaResult, ARCAServerStatus } from './types';

export async function mockVerificarConexionARCA(): Promise<ARCAServerStatus> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    ok: true,
    appServer: 'OK',
    dbServer: 'OK',
    authServer: 'OK',
  };
}

export async function mockEmitirFactura(payload: EmitirFacturaPayload): Promise<EmitirFacturaResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (Math.random() < 0.02) {
    return { ok: false, error: 'Error de simulación de conexión con ARCA. Intente nuevamente.' };
  }

  const cae = `${Math.floor(Math.random() * 9e13 + 1e13)}`;
  const nroCbte = Math.floor(Math.random() * 99999 + 1);
  const caeFchVto = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return {
    ok: true,
    cae,
    caeFchVto,
    nroCbte,
    tipoCbte: payload.tipoCbte,
  };
}
