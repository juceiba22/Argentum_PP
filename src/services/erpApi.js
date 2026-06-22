import { supabase } from './supabaseClient';

// ==========================================
// MÓDULO: PROVEEDORES
// ==========================================
export const getProveedores = async () => {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw error;
  return data;
};

export const createProveedor = async (proveedor) => {
  const { data, error } = await supabase
    .from('proveedores')
    .insert([proveedor])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateProveedor = async (id, proveedor) => {
  const { data, error } = await supabase
    .from('proveedores')
    .update(proveedor)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProveedor = async (id) => {
  const { error } = await supabase
    .from('proveedores')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};

// ==========================================
// MÓDULO: MOVIMIENTOS FINANCIEROS
// ==========================================
export const registrarMovimiento = async (movimiento) => {
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .insert([movimiento])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getMovimientos = async () => {
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getIngresosY_Egresos = async () => {
  // Optimizada para el Dashboard
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .select('tipo, monto');
  if (error) throw error;
  
  let ingresos = 0;
  let egresos = 0;
  data.forEach(item => {
    if (item.tipo === 'INGRESO') ingresos += Number(item.monto);
    if (item.tipo === 'EGRESO') egresos += Number(item.monto);
  });
  
  return { ingresos, egresos, liquidez: ingresos - egresos };
};

// ==========================================
// MÓDULO: COMPRAS (REPOSICIÓN)
// ==========================================
export const getCompras = async () => {
  const { data, error } = await supabase
    .from('compras')
    .select(`
      *,
      proveedores (nombre)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const registrarCompraCompleta = async (compraData, items, usuario_auditoria) => {
  // 1. Insertar en tabla `compras`
  const { data: compra, error: compraError } = await supabase
    .from('compras')
    .insert([{ ...compraData, estado: 'Pagada', usuario_auditoria }])
    .select()
    .single();
  
  if (compraError) throw compraError;

  // 2. Insertar en `compras_detalle`
  const detalles = items.map(item => ({
    compra_id: compra.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal
  }));
  
  const { error: detallesError } = await supabase
    .from('compras_detalle')
    .insert(detalles);

  if (detallesError) throw detallesError;

  // 3. Registrar el Egreso Financiero
  await registrarMovimiento({
    tipo: 'EGRESO',
    monto: compra.importe,
    categoria: 'Proveedor',
    origen_id: compra.id,
    descripcion: `Compra a Proveedor (Ref: ${compra.id.substring(0,8)})`,
    usuario_auditoria
  });

  // 4. Actualizar Stock en Inventario
  for (const item of items) {
    // Buscar cantidad actual
    const { data: invItem } = await supabase.from('inventario').select('cantidad').eq('id', item.producto_id).single();
    if (invItem) {
      await supabase.from('inventario').update({
        cantidad: Number(invItem.cantidad) + Number(item.cantidad)
      }).eq('id', item.producto_id);
    }
  }

  return compra;
};

// ==========================================
// MÓDULO: GASTOS (OPERATIVOS)
// ==========================================
export const getGastos = async () => {
  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
};

export const registrarGasto = async (gasto, usuario_auditoria) => {
  // 1. Insertar en tabla `gastos`
  const { data: nuevoGasto, error: gastoError } = await supabase
    .from('gastos')
    .insert([{ ...gasto }])
    .select()
    .single();
  
  if (gastoError) throw gastoError;

  // 2. Registrar el Egreso Financiero
  await registrarMovimiento({
    tipo: 'EGRESO',
    monto: nuevoGasto.importe,
    categoria: nuevoGasto.categoria_principal, // 'Costos Fijos', 'Depreciación de Capital', 'Salario / Ganancia'
    origen_id: nuevoGasto.id,
    descripcion: nuevoGasto.rubro,
    usuario_auditoria
  });

  return nuevoGasto;
};
