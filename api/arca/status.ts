import { getAfipClient } from './afip-client.js';
import { mockVerificarConexionARCA } from './mock.js';
import type { ARCAServerStatus } from './types.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // Si no está configurado AFIP_CUIT, usar el mock de forma transparente
  if (!process.env.AFIP_CUIT) {
    const status = await mockVerificarConexionARCA();
    return res.status(200).json({ success: true, isMock: true, status });
  }

  try {
    const afip = getAfipClient();
    const serverStatus = await afip.ElectronicBilling.getServerStatus();
    
    const status: ARCAServerStatus = {
      ok:
        serverStatus.AppServer === 'OK' &&
        serverStatus.DbServer === 'OK' &&
        serverStatus.AuthServer === 'OK',
      appServer: serverStatus.AppServer,
      dbServer: serverStatus.DbServer,
      authServer: serverStatus.AuthServer,
    };
    
    return res.status(200).json({ success: true, isMock: false, status });
  } catch (e: any) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return res.status(200).json({
      success: false,
      isMock: false,
      status: { ok: false, error: errorMsg }
    });
  }
}
