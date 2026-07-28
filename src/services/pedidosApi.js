import { supabase } from './supabaseClient';
import { registrarMovimiento } from './erpApi';

// Obtener todos los pedidos filtrados por carnicería
export const getTodosLosPedidos = async (tenantId) => {
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Registrar venta directa desde el POS de la carnicería
export const registrarVentaDirecta = async (total, medioPago, items = [], clienteId = null, tenantId) => {
  if (!tenantId) throw new Error('Se requiere tenantId para registrar la venta.');

  const { data, error } = await supabase
    .from('pedidos')
    .insert([{
      tenant_id: tenantId,
      estado: 'Pagado',
      total: total,
      medio_pago: medioPago,
      cliente_id: clienteId,
      fecha_cobro: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;

  if (items && items.length > 0) {
    const itemsAInsertar = items.map(item => ({
      tenant_id: tenantId,
      pedido_id: data.id,
      producto_nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.producto.precio_unitario
    }));
    
    const { error: itemsError } = await supabase
      .from('items_pedido')
      .insert(itemsAInsertar);
      
    if (itemsError) console.error("Error al guardar items del pedido:", itemsError);
  }

  try {
    await registrarMovimiento({
      tenant_id: tenantId,
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

// Obtener cobros realizados filtrados por carnicería
export const getCobrosRealizados = async (tenantId) => {
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('estado', 'Pagado')
    .order('fecha_cobro', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data;
};

// Actualizar estado de pedido
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

// Registrar pedido desde la web pública (Promociones)
export const registrarPedidoWeb = async (total, items = [], datosEntrega = {}, tenantId = null) => {
  // Nota: como es público puede no traer tenantId, en un multitenant real se debería inferir de la URL.
  // Aquí usamos insert normal y permitimos que el backend lo maneje o asigne nulo si es genérico.
  const { data, error } = await supabase
    .from('pedidos')
    .insert([{
      tenant_id: tenantId, // Puede ser null en caso de que sea global 
      estado: 'Pendiente',
      total: total,
      medio_pago: 'efectivo', // Por defecto web se pacta pago contra entrega/transferencia manual
      fecha_cobro: null,
      metadata: datosEntrega
    }])
    .select()
    .single();

  if (error) throw error;

  if (items && items.length > 0) {
    const itemsAInsertar = items.map(item => ({
      tenant_id: tenantId,
      pedido_id: data.id,
      producto_nombre: item.nombre_producto,
      cantidad: item.cantidad_carrito,
      precio_unitario: item.precio_promocional
    }));
    
    const { error: itemsError } = await supabase
      .from('items_pedido')
      .insert(itemsAInsertar);
      
    if (itemsError) console.error("Error al guardar items del pedido web:", itemsError);
  }

  return data;
};