import { supabase } from './supabaseClient';

// Crear un nuevo cliente con datos fiscales
export const createCliente = async (clienteData) => {
  const { data, error } = await supabase
    .from('clientes')
    .insert([
      { 
        nombre: clienteData.nombre, 
        email: clienteData.email, 
        telefono: clienteData.telefono || null,
        cuit: clienteData.cuit || null,
        doc_tipo: clienteData.doc_tipo ?? 99,
        doc_nro: clienteData.doc_nro ?? '0',
        condicion_iva: clienteData.condicion_iva ?? 'CF'
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Actualizar un cliente existente
export const updateClienteFiscal = async (clienteId, clienteData) => {
  const { data, error } = await supabase
    .from('clientes')
    .update({
      nombre: clienteData.nombre,
      email: clienteData.email,
      telefono: clienteData.telefono || null,
      cuit: clienteData.cuit || null,
      doc_tipo: clienteData.doc_tipo ?? 99,
      doc_nro: clienteData.doc_nro ?? '0',
      condicion_iva: clienteData.condicion_iva ?? 'CF'
    })
    .eq('id', clienteId)
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

// Obtener todos los clientes
export const getAllClientes = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
