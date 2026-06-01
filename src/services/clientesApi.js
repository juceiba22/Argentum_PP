import { supabase } from './supabaseClient';

// Crear un nuevo cliente
export const createCliente = async (clienteData) => {
  const { data, error } = await supabase
    .from('clientes')
    .insert([
      { 
        nombre: clienteData.nombre, 
        email: clienteData.email, 
        telefono: clienteData.telefono || null 
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Buscar un cliente por ID exacto
export const getClienteById = async (id) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// Obtener pedidos de un cliente específico, incluyendo sus ítems
export const getPedidosByClienteId = async (clienteId) => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      items_pedido (*)
    `)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
