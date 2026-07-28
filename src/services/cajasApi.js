import { supabase } from './supabaseClient';

/**
 * Obtiene la sesión de caja abierta para un usuario determinado
 */
const resolveTenantId = async (tenantId) => {
  if (tenantId) return tenantId;

  try {
    // Fallback 1: Buscar cualquier tenant_id en tenant_users
    const { data: tu } = await supabase.from('tenant_users').select('tenant_id').not('tenant_id', 'is', null).limit(1).maybeSingle();
    if (tu?.tenant_id) return tu.tenant_id;

    // Fallback 2: Buscar cualquier tenant_id en la tabla tenants
    const { data: t } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
    if (t?.id) return t.id;

    // Fallback 3: Buscar en inventario
    const { data: inv } = await supabase.from('inventario').select('tenant_id').not('tenant_id', 'is', null).limit(1).maybeSingle();
    if (inv?.tenant_id) return inv.tenant_id;
  } catch (e) {
    console.warn("Error resolviendo fallback de tenantId:", e);
  }

  return null;
};

/**
 * Obtiene la sesión de caja abierta para un usuario determinado
 */
export const getCajaAbierta = async (usuarioEmail, tenantId) => {
  const activeTenantId = await resolveTenantId(tenantId);
  if (!activeTenantId) return null;

  const { data, error } = await supabase
    .from('sesiones_caja')
    .select('*')
    .eq('usuario_email', usuarioEmail)
    .eq('tenant_id', activeTenantId)
    .eq('estado', 'abierta')
    .order('fecha_apertura', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error('Error obteniendo caja abierta:', error);
    return null;
  }
  
  return data || null;
};

/**
 * Abre una nueva sesión de caja
 */
export const abrirCaja = async (usuarioEmail, saldoInicial = 0, tenantId) => {
  const activeTenantId = await resolveTenantId(tenantId);
  if (!activeTenantId) throw new Error('Se requiere tenantId para abrir caja.');

  // Verificar si ya hay una abierta
  const cajaExistente = await getCajaAbierta(usuarioEmail, activeTenantId);
  if (cajaExistente) {
    throw new Error('Ya existe una caja abierta para este usuario.');
  }

  const { data, error } = await supabase
    .from('sesiones_caja')
    .insert([
      { 
        usuario_email: usuarioEmail, 
        estado: 'abierta', 
        saldo_inicial: saldoInicial,
        tenant_id: activeTenantId
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Cierra una sesión de caja
 */
export const cerrarCaja = async (cajaId) => {
  const { data, error } = await supabase
    .from('sesiones_caja')
    .update({ 
      estado: 'cerrada', 
      fecha_cierre: new Date().toISOString() 
    })
    .eq('id', cajaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
