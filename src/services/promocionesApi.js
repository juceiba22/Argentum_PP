import { supabase } from './supabaseClient';

const resolveTenantId = async (tenantId) => {
  if (tenantId) return tenantId;
  try {
    const { data: tu } = await supabase.from('tenant_users').select('tenant_id').not('tenant_id', 'is', null).limit(1).maybeSingle();
    if (tu?.tenant_id) return tu.tenant_id;
    const { data: t } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
    if (t?.id) return t.id;
  } catch (e) {
    console.warn("Error resolviendo fallback de tenantId en promociones:", e);
  }
  return null;
};

export const getPromocionesActivas = async (tenantId) => {
  try {
    const activeTenantId = await resolveTenantId(tenantId);
    if (!activeTenantId) return [];

    const { data, error } = await supabase
      .from('promociones')
      .select('*')
      .eq('tenant_id', activeTenantId)
      .eq('activa', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("No se pudieron cargar promociones activas:", error.message || error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("Excepción al consultar promociones activas:", err);
    return [];
  }
};

export const getAllPromociones = async (tenantId) => {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('promociones')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createPromocion = async (promoData, tenantId) => {
  if (!tenantId) throw new Error('Se requiere tenantId para registrar una promoción.');
  const { data, error } = await supabase
    .from('promociones')
    .insert([{ ...promoData, tenant_id: tenantId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updatePromocion = async (id, updates) => {
  const { data, error } = await supabase
    .from('promociones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePromocion = async (id) => {
  const { error } = await supabase
    .from('promociones')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};
