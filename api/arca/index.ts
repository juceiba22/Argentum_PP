import { createClient } from '@supabase/supabase-js';
import { getAfipClientForTenant } from './afip-client.js';
import { verifyTenantAccess } from '../_shared/verifyTenantAuth.js';
import type { EmitirFacturaPayload, ARCAServerStatus } from './types.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_KEY || 
  '';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Enrutador Central de ARCA / AFIP para Vercel Serverless Functions
 */
export default async function handler(req: any, res: any) {
  // Asegurar respuesta JSON y cabeceras
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/').filter(Boolean);
    
    let route = req.query.action || req.query.path;
    if (!route || route === 'index' || route === 'index.ts' || route === 'index.js') {
      route = parts[parts.length - 1];
    }

    switch (route) {
      case 'emitir':
        return await handleEmitir(req, res);
      case 'status':
        return await handleStatus(req, res);
      case 'verificar-delegacion':
        return await handleVerificarDelegacion(req, res);
      default:
        return res.status(404).json({ success: false, error: `Ruta de ARCA no encontrada: ${route}` });
    }
  } catch (err: any) {
    console.error('[ARCA Central Router] Error general en el manejador:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error interno en servidor ARCA.' });
  }
}

// -----------------------------------------------------------------------------
// 1. HANDLER: emitir (Emisión de Comprobante CAE con AFIP/ARCA)
// -----------------------------------------------------------------------------
async function handleEmitir(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  const payload: EmitirFacturaPayload = req.body || {};
  const { pedidoId, docTipo, docNro, importeTotal, concepto = 1, fechaCbte, tenantId } = payload;

  if (!pedidoId) {
    return res.status(400).json({ success: false, error: 'El campo pedidoId es obligatorio.' });
  }

  if (!importeTotal || importeTotal <= 0) {
    return res.status(400).json({ success: false, error: 'El importe total debe ser mayor a 0.' });
  }

  try {
    await verifyTenantAccess(req, tenantId);
  } catch (authErr: any) {
    return res.status(401).json({ success: false, error: authErr.message });
  }

  let afipClientInfo: { afip: any; ptoVta: number; isMock: boolean };

  try {
    afipClientInfo = await getAfipClientForTenant(tenantId);
  } catch (clientErr: any) {
    console.warn(`Error al obtener cliente AFIP para tenant (${tenantId}):`, clientErr.message);
    return res.status(200).json({
      success: false,
      error: clientErr.message || 'El comercio no tiene configuradas sus credenciales fiscales de AFIP.'
    });
  }

  const { afip, ptoVta: ptoVtaFinal } = afipClientInfo;

  const tipoCbte = 11; // Factura C
  const fechaStr = fechaCbte ?? new Date().toISOString().split('T')[0];
  const fechaARCA = parseInt(fechaStr.replace(/-/g, ''), 10);
  const docNroLimpio = String(docNro || '0').replace(/\D/g, '');

  let cae: string | null = null;
  let caeFchVto: string | null = null;
  let nextNro = 0;

  try {
    const ultimoNro: number = await afip.ElectronicBilling.getLastVoucher(ptoVtaFinal, tipoCbte);
    nextNro = (ultimoNro || 0) + 1;

    const voucherData = {
      CantReg: 1,
      PtoVta: ptoVtaFinal,
      CbteTipo: tipoCbte,
      Concepto: concepto,
      DocTipo: docTipo ?? 99,
      DocNro: Number(docNroLimpio),
      CbteDesde: nextNro,
      CbteHasta: nextNro,
      CbteFch: fechaARCA,
      ImpTotal: importeTotal,
      ImpTotConc: 0,
      ImpNeto: importeTotal,
      ImpOpEx: 0,
      ImpTrib: 0,
      ImpIVA: 0,
      MonId: 'PES',
      MonCotiz: 1,
    };

    const afipResult = await afip.ElectronicBilling.createVoucher(voucherData);
    
    cae = afipResult?.CAE?.toString() ?? null;
    caeFchVto = afipResult?.CAEFchVto
      ? String(afipResult.CAEFchVto).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
      : null;

    if (!cae) {
      throw new Error('ARCA / AFIP no devolvió un número de CAE válido para la operación.');
    }
  } catch (afipErr: any) {
    console.error('Error al emitir factura en AFIP:', afipErr);
    const errorMsg = afipErr.message || String(afipErr);
    return res.status(200).json({
      success: false,
      error: `Error AFIP / ARCA: ${errorMsg}`
    });
  }

  const pvStr = ptoVtaFinal.toString().padStart(4, '0');
  const nroStr = nextNro.toString().padStart(8, '0');
  const formattedVoucherNumber = `${pvStr}-${nroStr}`;

  let updateQuery = supabase
    .from('pedidos')
    .update({
      is_fiscal: true,
      cae_number: cae,
      cae_expiration: caeFchVto,
      voucher_number: formattedVoucherNumber,
      voucher_type: 'FC',
      alicuota_iva: 0
    })
    .eq('id', pedidoId);

  if (tenantId) {
    updateQuery = updateQuery.eq('tenant_id', tenantId);
  }

  const { data: updatedPedido, error: updateError } = await updateQuery.select().single();

  if (updateError) {
    console.error('Error actualizando estado fiscal del pedido en BD:', updateError);
    return res.status(200).json({
      success: false,
      error: `Factura aprobada por AFIP (CAE: ${cae}), pero falló la actualización local en base de datos: ${updateError.message}`
    });
  }

  return res.status(200).json({
    success: true,
    pedido: updatedPedido,
    cae: cae,
    caeFchVto: caeFchVto,
    voucherNumber: formattedVoucherNumber,
    voucherType: 'FC'
  });
}

// -----------------------------------------------------------------------------
// 2. HANDLER: status (Verificación de Estado Servidores AFIP/ARCA)
// -----------------------------------------------------------------------------
async function handleStatus(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo GET o POST).' });
  }

  const tenantId = (
    req.query?.tenantId ||
    req.headers?.['x-tenant-id'] ||
    req.headers?.['tenant-id'] ||
    req.headers?.tenantid ||
    req.body?.tenantId
  ) as string | undefined;

  try {
    await verifyTenantAccess(req, tenantId);
  } catch (authErr: any) {
    return res.status(401).json({ success: false, error: authErr.message });
  }

  let afipClientInfo;
  try {
    afipClientInfo = await getAfipClientForTenant(tenantId);
  } catch (clientErr: any) {
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
}

// -----------------------------------------------------------------------------
// 3. HANDLER: verificar-delegacion (Comprobación Delegación CUIT)
// -----------------------------------------------------------------------------
async function handleVerificarDelegacion(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  const { tenantId } = req.body || {};

  if (!tenantId) {
    return res.status(200).json({ success: false, error: 'El campo tenantId es obligatorio.' });
  }

  try {
    await verifyTenantAccess(req, tenantId);
  } catch (authErr: any) {
    return res.status(401).json({ success: false, error: authErr.message });
  }

  let afipClientInfo;
  try {
    afipClientInfo = await getAfipClientForTenant(tenantId, true);
  } catch (clientErr: any) {
    return res.status(200).json({
      success: false,
      error: clientErr.message || 'El comercio no tiene configuradas sus credenciales fiscales de AFIP.'
    });
  }

  const { afip, ptoVta } = afipClientInfo;

  try {
    await afip.ElectronicBilling.getLastVoucher(ptoVta, 11);
  } catch (afipErr: any) {
    const errorMsg = afipErr.message || String(afipErr);
    return res.status(200).json({
      success: false,
      error: `No se pudo verificar la delegación en AFIP / ARCA: ${errorMsg}`
    });
  }

  const nowISO = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      afip_delegacion_verificada: true,
      afip_delegacion_verificada_at: nowISO
    })
    .eq('id', tenantId);

  if (updateError) {
    return res.status(200).json({
      success: false,
      error: `Verificación exitosa en AFIP, pero ocurrió un error al actualizar la base de datos: ${updateError.message}`
    });
  }

  return res.status(200).json({
    success: true,
    verifiedAt: nowISO
  });
}
