import { getAfipClientForTenant } from './afip-client.js';
import type { ARCAServerStatus } from './types.js';

export default async function handler(req: any, res: any) {
  // Asegurar cabeceras de respuesta JSON
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo GET o POST).' });
  }

  try {
    // Extraer tenantId desde query params, headers o body
    const tenantId = (
      req.query?.tenantId ||
      req.headers?.['x-tenant-id'] ||
      req.headers?.['tenant-id'] ||
      req.headers?.tenantid ||
      req.body?.tenantId
    ) as string | undefined;

    let afipClientInfo;
    try {
      afipClientInfo = await getAfipClientForTenant(tenantId);
    } catch (clientErr: any) {
      // Requisito 4: Si el tenant no tiene credenciales configuradas
      return res.status(200).json({
        success: false,
        configured: false,
        isMock: false,
        status: {
          ok: false,
          error: clientErr.message || 'El servicio fiscal de ARCA / AFIP se encuentra desconfigurado para este comercio.'
        }
      });
    }

    const { afip } = afipClientInfo;

    // Requisito 3: Consultar estado de los servidores de ARCA
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
    
    return res.status(200).json({
      success: true,
      configured: true,
      isMock: false,
      tenantId: tenantId ?? null,
      status
    });

  } catch (e: any) {
    console.error('Error al verificar estado de servidores ARCA:', e);
    const errorMsg = e instanceof Error ? e.message : String(e);
    return res.status(200).json({
      success: false,
      configured: true,
      isMock: false,
      status: { ok: false, error: errorMsg }
    });
  }
}
