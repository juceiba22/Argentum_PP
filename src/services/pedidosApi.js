import { supabase } from './supabaseClient';
import { registrarMovimiento } from './erpApi';

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

// 5. Obtener cobros realizados (Auditoría de Caja)
export const getCobrosRealizados = async () => {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('estado', 'Pagado')
    .order('fecha_cobro', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data;
};

// 4. Actualizar estado y datos de cobro financiero desde Point
export const updateCobroPedido = async (pedidoId, paymentData) => {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ 
      estado: 'Pagado',
      payment_id: paymentData.id ? String(paymentData.id) : `POINT-${Date.now()}`,
      payment_status: paymentData.status || 'approved',
      medio_pago: 'mercado_pago_point',
      fecha_cobro: new Date().toISOString()
    })
    .eq('id', pedidoId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 6. Registrar venta directa desde Market
export const registrarVentaDirecta = async (total, medioPago) => {
  const { data, error } = await supabase
    .from('pedidos')
    .insert([{
      estado: 'Pagado',
      total: total,
      medio_pago: medioPago,
      fecha_cobro: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;

  try {
    await registrarMovimiento({
      tipo: 'INGRESO',
      monto: total,
      categoria: 'Venta',
      origen_id: data.id,
      descripcion: `Venta Mostrador (${medioPago})`,
      usuario_auditoria: 'Sistema'
    });
  } catch (e) {
    console.error("No se pudo registrar el movimiento financiero", e);
  }

  return data;
};
