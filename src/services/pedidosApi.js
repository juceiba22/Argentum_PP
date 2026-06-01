import { supabase } from './supabaseClient';

// 1. Obtener todos los pedidos junto con el nombre del cliente
export const getTodosLosPedidos = async () => {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// 2. Crear un pedido y sus ítems de forma relacionada
export const createPedidoCompleto = async (mesa, items) => {
  // A. Calcular el total del pedido sumando subtotal de los items
  const totalPedido = items.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0);

  // B. Insertar el registro principal en la tabla pedidos
  const { data: pedidoData, error: pedidoError } = await supabase
    .from('pedidos')
    .insert([
      { 
        mesa: parseInt(mesa, 10), 
        estado: 'Pendiente', 
        total: totalPedido 
      }
    ])
    .select()
    .single();

  if (pedidoError) throw pedidoError;

  // C. Preparar los datos de los ítems con el pedido_id recién generado
  const itemsAInsertar = items.map(item => ({
    pedido_id: pedidoData.id,
    producto_nombre: item.producto_nombre,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario
  }));

  // D. Insertar todos los ítems en la tabla items_pedido
  const { error: itemsError } = await supabase
    .from('items_pedido')
    .insert(itemsAInsertar);

  if (itemsError) throw itemsError;

  return pedidoData;
};

// 3. Actualizar el estado de un pedido específico
export const updateEstadoPedido = async (pedidoId, nuevoEstado) => {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
