import { supabase } from './supabaseClient';

export const getPromocionesActivas = async (tenantId) => {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('promociones')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('activa', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
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
