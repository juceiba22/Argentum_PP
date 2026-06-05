import { supabase } from './supabaseClient';

export const getInventario = async () => {
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
};

export const addMercaderia = async (item) => {
  const { data, error } = await supabase
    .from('inventario')
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateMercaderia = async (id, itemData) => {
  const { data, error } = await supabase
    .from('inventario')
    .update({ ...itemData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteMercaderia = async (id) => {
  const { error } = await supabase
    .from('inventario')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

export const uploadImage = async (file) => {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('productos')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('productos')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
