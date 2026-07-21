import { supabase } from './supabaseClient';

export const getImportaciones = async (usuario_id) => {
  const { data, error } = await supabase
    .from('importaciones_bancarias')
    .select('*')
    .eq('usuario_id', usuario_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const uploadImportacionFile = async (file, usuario_id) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `${usuario_id}/${year}/${month}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('importaciones')
    .upload(filePath, file);
    
  if (uploadError) throw uploadError;
  return filePath;
};

export const createImportacionRecord = async (data) => {
  const { error } = await supabase
    .from('importaciones_bancarias')
    .insert([data]);
    
  if (error) throw error;
};

export const triggerProcessImportacion = async (importacion_id) => {
  const { data, error } = await supabase.functions.invoke('procesar-importacion', {
    body: { importacion_id }
  });
  if (error) throw error;
  return data;
};
