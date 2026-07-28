import { supabase } from './supabaseClient';

const resolveTenantId = async (tenantId) => {
  if (tenantId) return tenantId;
  try {
    const { data: tu } = await supabase.from('tenant_users').select('tenant_id').not('tenant_id', 'is', null).limit(1).maybeSingle();
    if (tu?.tenant_id) return tu.tenant_id;
    const { data: t } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
    if (t?.id) return t.id;
    const { data: inv } = await supabase.from('inventario').select('tenant_id').not('tenant_id', 'is', null).limit(1).maybeSingle();
    if (inv?.tenant_id) return inv.tenant_id;
  } catch (e) {
    console.warn("Error resolviendo fallback de tenantId en inventario:", e);
  }
  return null;
};

// Obtener inventario filtrado exclusivamente por la carnicería activa
export const getInventario = async (tenantId) => {
  const activeTenantId = await resolveTenantId(tenantId);
  if (!activeTenantId) return [];

  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .eq('tenant_id', activeTenantId)
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