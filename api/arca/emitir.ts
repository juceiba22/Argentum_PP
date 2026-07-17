import { createClient } from '@supabase/supabase-js';
import { getAfipClient } from './afip-client.js';
import { mockEmitirFactura } from './mock.js';
import {
  ALICUOTA_IVA,
  ALICUOTA_PORCENTAJE,
  TIPO_COMPROBANTE,
  calcularDesgloseIVA,
  type EmitirFacturaPayload
} from './types.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const PTO_VTA = Number(process.env.AFIP_PUNTO_DE_VENTA ?? 1);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const payload: EmitirFacturaPayload = req.body;
  const {
    pedidoId,
    tipoCbte,
    condicionIVAReceptor,
    docTipo,
    docNro,
    importeTotal,
    concepto = 1,
    descripcion,
    fechaCbte,
    alicuotaIVA = ALICUOTA_IVA.IVA_21
  } = payload;

  if (!pedidoId) {
    return res.status(400).json({ success: false, error: 'El campo pedidoId es obligatorio.' });
  }

  // 1. Obtener resultado fiscal (mock o real)
  let result: any;
  if (!process.env.AFIP_CUIT) {
    result = await mockEmitirFactura(payload);
  } else {
    try {
      const docNroLimpio = docNro.replace(/\D/g, '');
      const fechaStr = fechaCbte ?? new Date().toISOString().split('T')[0];
      const fechaARCA = parseInt(fechaStr.replace(/-/g, ''), 10);

      // Calcular desglose IVA
      const { impNeto, impIVA } = calcularDesgloseIVA(importeTotal, tipoCbte, alicuotaIVA);

      const afip = getAfipClient();

      // Consultar el último comprobante
      const ultimoNro: number = await afip.ElectronicBilling.getLastVoucher(
        PTO_VTA,
        tipoCbte
      );
      const nextNro = ultimoNro + 1;

      // Fechas de servicio (obligatorias para Concepto 2 y 3)
      const fechasServicio =
        concepto === 2 || concepto === 3
          ? {
              FchServDesde: fechaARCA,
              FchServHasta: fechaARCA,
              FchVtoPago: fechaARCA,
            }
          : {};

      // Array de alícuotas IVA (requerido para Factura A y B si hay IVA)
      const ivaArray =
        (tipoCbte === TIPO_COMPROBANTE.FACTURA_A || tipoCbte === TIPO_COMPROBANTE.FACTURA_B) && impIVA > 0
          ? {
              Iva: [
                {
                  Id: alicuotaIVA,
                  BaseImp: impNeto,
                  Importe: impIVA,
                },
              ],
            }
          : {};

      const voucherData = {
        CantReg: 1,
        PtoVta: PTO_VTA,
        CbteTipo: tipoCbte,
        Concepto: concepto,
        DocTipo: docTipo,
        DocNro: Number(docNroLimpio),
        CbteDesde: nextNro,
        CbteHasta: nextNro,
        CbteFch: fechaARCA,
        ImpTotal: importeTotal,
        ImpTotConc: 0,
        ImpNeto: impNeto,
        ImpOpEx: 0,
        ImpTrib: 0,
        ImpIVA: impIVA,
        MonId: 'PES',
        MonCotiz: 1,
        ...fechasServicio,
        ...ivaArray,
      };

      // Solicitar CAE a ARCA
      const afipResult = await afip.ElectronicBilling.createVoucher(voucherData);

      const cae = afipResult?.CAE?.toString() ?? null;
      const caeFchVto = afipResult?.CAEFchVto
        ? String(afipResult.CAEFchVto).replace(
            /(\d{4})(\d{2})(\d{2})/,
            '$1-$2-$3'
          )
        : null;
      const resultado = afipResult?.Resultado ?? (cae ? 'A' : 'R');

      if (resultado !== 'A') {
        const obs =
          afipResult?.Observaciones?.Obs?.map(
            (o: { Msg: string }) => o.Msg
          )?.join('; ') ?? 'Comprobante rechazado por ARCA';
        return res.status(200).json({ ok: false, error: obs, nroCbte: nextNro, tipoCbte });
      }

      result = {
        ok: true,
        cae: cae ?? undefined,
        caeFchVto: caeFchVto ?? undefined,
        nroCbte: nextNro,
        tipoCbte,
      };
    } catch (e: any) {
      console.error("ARCA Error:", e);
      let errorMsg = e instanceof Error ? e.message : String(e);
      if (e.data) {
        if (e.data.message) {
          errorMsg = `${errorMsg}: ${e.data.message}`;
        } else if (typeof e.data === 'string') {
          errorMsg = `${errorMsg}: ${e.data}`;
        } else {
          errorMsg = `${errorMsg}: ${JSON.stringify(e.data)}`;
        }
      }
      return res.status(200).json({ ok: false, error: errorMsg });
    }
  }

  // 2. Si la emisión fue exitosa, registrar los datos fiscales en Supabase
  if (result.ok && result.cae) {
    try {
      const pvStr = PTO_VTA.toString().padStart(4, '0');
      const nroStr = (result.nroCbte ?? 0).toString().padStart(8, '0');
      const formattedVoucherNumber = `${pvStr}-${nroStr}`;
      const voucherTypeString = result.tipoCbte === TIPO_COMPROBANTE.FACTURA_A ? 'FA' : 'FB';
      const alicuotaVal = ALICUOTA_PORCENTAJE[alicuotaIVA];

      const { data, error } = await supabase
        .from('pedidos')
        .update({
          is_fiscal: true,
          cae_number: result.cae,
          cae_expiration: result.caeFchVto,
          voucher_number: formattedVoucherNumber,
          voucher_type: voucherTypeString,
          alicuota_iva: alicuotaVal
        })
        .eq('id', pedidoId)
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar pedido con datos fiscales:', error);
        return res.status(500).json({
          success: false,
          error: `Factura emitida en ARCA (${formattedVoucherNumber}, CAE: ${result.cae}) pero falló la actualización en la BD local: ${error.message}`
        });
      }

      return res.status(200).json({
        success: true,
        pedido: data,
        cae: result.cae,
        caeFchVto: result.caeFchVto,
        voucherNumber: formattedVoucherNumber,
        voucherType: voucherTypeString
      });
    } catch (dbError: any) {
      console.error('Database connection error during fiscalization:', dbError);
      return res.status(500).json({
        success: false,
        error: `Factura emitida en ARCA pero falló la actualización en la BD local: ${dbError.message}`
      });
    }
  }

  return res.status(200).json({
    success: false,
    error: result.error ?? 'Error desconocido al emitir comprobante'
  });
}
