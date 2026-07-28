import { supabase } from './supabaseClient';

// ==========================================
// MÓDULO: PROVEEDORES
// ==========================================
export const getProveedores = async (tenantId) => {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('nombre', { ascending: true });
  if (error) throw error;
  return data;
};

export const createProveedor = async (proveedor, tenantId) => {
  if (!tenantId) throw new Error('Se requiere tenantId para proveedor.');
  const { data, error } = await supabase
    .from('proveedores')
    .insert([{ ...proveedor, tenant_id: tenantId }])
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
export const registrarMovimiento = async (movimiento, tenantId) => {
  if (!tenantId && !movimiento.tenant_id) throw new Error('Falta tenant_id en movimiento');
  const tId = tenantId || movimiento.tenant_id;
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .insert([{ ...movimiento, tenant_id: tId }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getMovimientos = async (tenantId) => {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getIngresosY_Egresos = async (tenantId) => {
  if (!tenantId) return { ingresos: 0, egresos: 0, liquidez: 0 };
  // Optimizada para el Dashboard
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .select('tipo, monto')
    .eq('tenant_id', tenantId);
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
export const getCompras = async (tenantId) => {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('compras')
    .select(`
      *,
      proveedores (nombre)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getComprasDetalle = async (tenantId) => {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('compras_detalle')
    .select(`
      *,
      compras!inner (fecha, estado, tenant_id)
    `)
    .eq('compras.tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const registrarCompraCompleta = async (compraData, items, usuario_auditoria, tenantId) => {
  if (!tenantId) throw new Error('Se requiere tenantId para registrar la compra.');
  // 1. Insertar en tabla `compras`
  const { data: compra, error: compraError } = await supabase
    .from('compras')
    .insert([{ ...compraData, estado: 'Pagada', usuario_auditoria, tenant_id: tenantId }])
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
    usuario_auditoria,
    tenant_id: tenantId
  }, tenantId);

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
export const getGastos = async (tenantId) => {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
};

export const registrarGasto = async (gasto, usuario_auditoria, tenantId) => {
  if (!tenantId) throw new Error('Se requiere tenantId para el gasto');
  // 1. Insertar en tabla `gastos`
  const { data: nuevoGasto, error: gastoError } = await supabase
    .from('gastos')
    .insert([{ ...gasto, tenant_id: tenantId }])
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
    usuario_auditoria,
    tenant_id: tenantId
  }, tenantId);

  return nuevoGasto;
};
