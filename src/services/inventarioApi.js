import { supabase } from './supabaseClient';

// Obtener inventario filtrado exclusivamente por la carnicería activa
export const getInventario = async (tenantId) => {
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
};

// Agregar un nuevo producto asignándole el tenant_id
export const addMercaderia = async (item, tenantId) => {
  if (!tenantId) throw new Error('Se requiere tenantId para registrar productos.');

  const { data, error } = await supabase
    .from('inventario')
    .insert([{ ...item, tenant_id: tenantId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Actualizar un producto existente
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

// Eliminar un producto
export const deleteMercaderia = async (id) => {
  const { error } = await supabase
    .from('inventario')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// Subida de imágenes organizadas por tenant_id
export const uploadImage = async (file, tenantId) => {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${tenantId || 'general'}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('productos')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('productos')
    .getPublicUrl(filePath);

  return data.publicUrl;
};