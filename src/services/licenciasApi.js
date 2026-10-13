import { supabase } from './supabaseClient';
import { getAuthHeaders } from './authHeader';

export const formatearCodigoLicencia = (codigo) =>
  String(codigo || '').replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1-');

// Activa un código de 16 dígitos en la carnicería del usuario logueado.
// Devuelve { ok, valida_hasta } o { ok: false, error }.
export const activarLicencia = async (codigo) => {
  const { data, error } = await supabase.rpc('activar_licencia', { p_codigo: codigo });
  if (error) throw error;
  return data;
};

// Licencias activadas en esta carnicería (por código o por pago online).
export const getLicenciasDelComercio = async (tenantId) => {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('licencias')
    .select('id, codigo, meses, origen, activada_en, valida_desde, valida_hasta, estado')
    .eq('tenant_id', tenantId)
    .order('valida_hasta', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getPrecioLicencia = async () => {
  const response = await fetch('/api/licencias/precio');
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo obtener el precio.');
  return data;
};

// Crea la orden y devuelve la URL de pago de Mercado Pago.
export const iniciarPagoLicencia = async (tenantId) => {
  const response = await fetch('/api/licencias/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ tenantId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo iniciar el pago.');
  return data.init_point;
};

// --- Administración de la plataforma ---------------------------------------

export const esAdminPlataforma = async () => {
  const { data, error } = await supabase.rpc('es_admin_plataforma');
  if (error) return false;
  return data === true;
};

export const generarLicencias = async ({ cantidad, meses, notas }) => {
  const { data, error } = await supabase.rpc('generar_licencias', {
    p_cantidad: Number(cantidad),
    p_meses: Number(meses),
    p_notas: notas || null
  });
  if (error) throw error;
  return data || [];
};

export const listarLicencias = async () => {
  const { data, error } = await supabase.rpc('listar_licencias');
  if (error) throw error;
  return data || [];
};

export const revocarLicencia = async (id) => {
  const { error } = await supabase.rpc('revocar_licencia', { p_id: id });
  if (error) throw error;
};
