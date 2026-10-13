import { supabase } from './supabaseClient';
import { getAuthHeaders } from './authHeader';

// Devuelve { ok, id, email } o { ok: false, error }.
export const invitarVendedor = async (email) => {
  const { data, error } = await supabase.rpc('invitar_vendedor', { p_email: email });
  if (error) throw error;
  return data;
};

// { miembros: [{ user_id, email, nombre, rol, soy_yo, desde }], invitaciones: [{ id, email, created_at }] }
export const listarEquipo = async () => {
  const { data, error } = await supabase.rpc('listar_equipo');
  if (error) throw error;
  return data || { miembros: [], invitaciones: [] };
};

export const cancelarInvitacion = async (id) => {
  const { error } = await supabase.rpc('cancelar_invitacion', { p_id: id });
  if (error) throw error;
};

export const quitarVendedor = async (userId) => {
  const { error } = await supabase.rpc('quitar_vendedor', { p_user_id: userId });
  if (error) throw error;
};

// Datos de la invitación para la pantalla de ingreso (funciona sin sesión).
export const verInvitacion = async (id) => {
  const { data, error } = await supabase.rpc('ver_invitacion', { p_id: id });
  if (error) return null;
  return data;
};

// Manda el mail con el link. { enviado: false } si el mail no está configurado.
export const notificarInvitacion = async (tenantId, invitacionId) => {
  try {
    const response = await fetch('/api/equipo/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ tenantId, invitacionId })
    });
    const data = await response.json().catch(() => ({}));
    return { enviado: Boolean(response.ok && data.enviado) };
  } catch {
    return { enviado: false };
  }
};

export const linkInvitacion = (invitacionId) => `${window.location.origin}/login?invitacion=${invitacionId}`;
