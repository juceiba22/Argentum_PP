import { supabase } from './supabaseClient';

/**
 * Obtiene la sesión de caja abierta para un usuario determinado
 */
export const getCajaAbierta = async (usuarioEmail, tenantId) => {
  if (!tenantId) return null;
  const { data, error } = await supabase
    .from('sesiones_caja')
    .select('*')
    .eq('usuario_email', usuarioEmail)
    .eq('tenant_id', tenantId)
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
  if (!tenantId) throw new Error('Se requiere tenantId para abrir caja.');
  // Verificar si ya hay una abierta
  const cajaExistente = await getCajaAbierta(usuarioEmail, tenantId);
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
        tenant_id: tenantId
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
