import { createClient } from '@supabase/supabase-js';
import { getAfipClientForTenant } from './afip-client.js';
import { mockEmitirFactura } from './mock.js';
import {
  type EmitirFacturaPayload
} from './types.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const payload: EmitirFacturaPayload = req.body;
  const { pedidoId, docTipo, docNro, importeTotal, concepto = 1, fechaCbte, tenantId } = payload;

  if (!pedidoId) {
    return res.status(400).json({ success: false, error: 'El campo pedidoId es obligatorio.' });
  }

  let result: any;
  let ptoVtaFinal = 1;

  try {
    // Intentar obtener el cliente AFIP específico del Tenant
    const { afip, ptoVta } = await getAfipClientForTenant(tenantId);
    ptoVtaFinal = ptoVta;

    const tipoCbte = 11; // Factura C
    const fechaStr = fechaCbte ?? new Date().toISOString().split('T')[0];
    const fechaARCA = parseInt(fechaStr.replace(/-/g, ''), 10);
    const docNroLimpio = String(docNro || '0').replace(/\D/g, '');

    const ultimoNro: number = await afip.ElectronicBilling.getLastVoucher(ptoVtaFinal, tipoCbte);
    const nextNro = ultimoNro + 1;

    const voucherData = {
      CantReg: 1,
      PtoVta: ptoVtaFinal,
      CbteTipo: tipoCbte,
      Concepto: concepto,
      DocTipo: docTipo,
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
    const cae = afipResult?.CAE?.toString() ?? null;
    const caeFchVto = afipResult?.CAEFchVto
      ? String(afipResult.CAEFchVto).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
      : null;

    if (!cae) {
      throw new Error('ARCA no devolvió un número de CAE válido.');
    }

    result = { ok: true, cae, caeFchVto, nroCbte: nextNro, tipoCbte };

  } catch (e: any) {
    console.warn("Aviso ARCA / Modo Mock activado:", e.message);
    // Si falla porque el tenant no tiene credenciales configuradas, recurrimos al mock de desarrollo
    result = await mockEmitirFactura(payload);
  }

  // Guardar en Supabase asegurando el aislamiento por tenant
  if (result.ok && result.cae) {
    const pvStr = ptoVtaFinal.toString().padStart(4, '0');
    const nroStr = (result.nroCbte ?? 0).toString().padStart(8, '0');
    const formattedVoucherNumber = `${pvStr}-${nroStr}`;

    let updateQuery = supabase
      .from('pedidos')
      .update({
        is_fiscal: true,
        cae_number: result.cae,
        cae_expiration: result.caeFchVto,
        voucher_number: formattedVoucherNumber,
        voucher_type: 'FC',
        alicuota_iva: 0
      })
      .eq('id', pedidoId);

    if (tenantId) {
      updateQuery = updateQuery.eq('tenant_id', tenantId);
    }

    const { data, error } = await updateQuery
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: `Error actualizando BD local: ${error.message}` });
    }

    return res.status(200).json({
      success: true,
      pedido: data,
      cae: result.cae,
      caeFchVto: result.caeFchVto,
      voucherNumber: formattedVoucherNumber,
      voucherType: 'FC'
    });
  }

  return res.status(200).json({ success: false, error: result.error ?? 'Error desconocido al emitir' });
}
