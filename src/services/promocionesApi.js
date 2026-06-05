import { supabase } from './supabaseClient';

export const getPromocionesActivas = async () => {
  const { data, error } = await supabase
    .from('promociones')
    .select('*')
    .eq('activa', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getAllPromociones = async () => {
  const { data, error } = await supabase
    .from('promociones')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createPromocion = async (promoData) => {
  const { data, error } = await supabase
    .from('promociones')
    .insert([promoData])
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
