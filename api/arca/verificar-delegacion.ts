import { createClient } from '@supabase/supabase-js';
import { getAfipClientForTenant } from './afip-client.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_KEY || 
  '';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  // Asegurar respuesta JSON
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (solo POST).' });
  }

  try {
    const { tenantId } = req.body || {};

    if (!tenantId) {
      return res.status(200).json({ success: false, error: 'El campo tenantId es obligatorio.' });
    }

    let afipClientInfo;
    try {
      // Pasar skipDelegationCheck = true para permitir la prueba previa a marcar verificada
      afipClientInfo = await getAfipClientForTenant(tenantId, true);
    } catch (clientErr: any) {
      console.warn(`Error al obtener cliente AFIP para verificación (${tenantId}):`, clientErr.message);
      return res.status(200).json({
        success: false,
        error: clientErr.message || 'El comercio no tiene configuradas sus credenciales fiscales de AFIP.'
      });
    }

    const { afip, ptoVta } = afipClientInfo;

    // Prueba real de comunicación con AFIP / ARCA (getLastVoucher con Factura C, tipo 11)
    try {
      await afip.ElectronicBilling.getLastVoucher(ptoVta, 11);
    } catch (afipErr: any) {
      console.error(`Falla en prueba de delegación AFIP para tenant (${tenantId}):`, afipErr);
      const errorMsg = afipErr.message || String(afipErr);
      return res.status(200).json({
        success: false,
        error: `No se pudo verificar la delegación en AFIP / ARCA: ${errorMsg}`
      });
    }

    // Actualizar tabla tenants tras verificación exitosa
    const nowISO = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        afip_delegacion_verificada: true,
        afip_delegacion_verificada_at: nowISO
      })
      .eq('id', tenantId);

    if (updateError) {
      console.error(`Error actualizando verificación en la BD para tenant (${tenantId}):`, updateError);
      return res.status(200).json({
        success: false,
        error: `Verificación exitosa en AFIP, pero ocurrió un error al actualizar la base de datos: ${updateError.message}`
      });
    }

    return res.status(200).json({
      success: true,
      verifiedAt: nowISO
    });

  } catch (globalErr: any) {
    console.error('Excepción global no controlada en api/arca/verificar-delegacion:', globalErr);
    return res.status(200).json({
      success: false,
      error: globalErr?.message || 'Ocurrió un error interno e inesperado al verificar la delegación.'
    });
  }
}
