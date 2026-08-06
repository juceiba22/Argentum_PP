import { createClient } from '@supabase/supabase-js';
import { getAfipClientForTenant } from './afip-client.js';
import { type EmitirFacturaPayload } from './types.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_KEY || 
  '';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  // Asegurar que la respuesta sea siempre JSON
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  try {
    const payload: EmitirFacturaPayload = req.body || {};
    const { pedidoId, docTipo, docNro, importeTotal, concepto = 1, fechaCbte, tenantId } = payload;

    if (!pedidoId) {
      return res.status(400).json({ success: false, error: 'El campo pedidoId es obligatorio.' });
    }

    if (!importeTotal || importeTotal <= 0) {
      return res.status(400).json({ success: false, error: 'El importe total debe ser mayor a 0.' });
    }

    let afipClientInfo: { afip: any; ptoVta: number; isMock: boolean };

    // 1. Obtener cliente AFIP isolado por tenant
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

    const tipoCbte = 11; // Factura C (Monotributo / Consumidor Final)
    const fechaStr = fechaCbte ?? new Date().toISOString().split('T')[0];
    const fechaARCA = parseInt(fechaStr.replace(/-/g, ''), 10);
    const docNroLimpio = String(docNro || '0').replace(/\D/g, '');

    let cae: string | null = null;
    let caeFchVto: string | null = null;
    let nextNro = 0;

    // 2. Comunicación con Web Services de AFIP / ARCA
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

    // 3. Formateo y actualización en la base de datos de Supabase
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

  } catch (globalErr: any) {
    console.error('Excepción global no controlada en api/arca/emitir:', globalErr);
    return res.status(200).json({
      success: false,
      error: globalErr?.message || 'Ocurrió un error interno e inesperado al procesar la solicitud.'
    });
  }
}
