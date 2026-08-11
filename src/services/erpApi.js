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
// MÓDULO: MOVIMIENTOS FINANCIEROS Y ESTADÍSTICAS
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

/**
 * Consulta y calcula estadísticas generales de negocio consolidadas para el Dashboard
 */
export const getEstadisticasGenerales = async (tenantId) => {
  if (!tenantId) {
    return {
      ventasTotales: 0,
      cantidadVentas: 0,
      ticketPromedio: 0,
      ingresosTotales: 0,
      egresosTotales: 0,
      margenNeto: 0,
      porcentajeMargen: 0,
      valorCostoStock: 0,
      valorVentaStock: 0,
      gananciaLatenteStock: 0,
      stockOptimoCount: 0,
      stockBajoCount: 0,
      mediosPagoBreakdown: {},
      topProductos: [],
      gastosPorCategoria: {},
      ultimosPedidos: [],
      ultimasCompras: []
    };
  }

  // Consultas en paralelo a Supabase
  const [pedidosRes, movimientosRes, inventarioRes, comprasRes, itemsRes] = await Promise.all([
    supabase.from('pedidos').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('movimientos_financieros').select('*').eq('tenant_id', tenantId),
    supabase.from('inventario').select('*').eq('tenant_id', tenantId),
    supabase.from('compras').select('*, proveedores(nombre)').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('items_pedido').select('*').eq('tenant_id', tenantId)
  ]);

  const pedidos = pedidosRes.data || [];
  const movimientos = movimientosRes.data || [];
  const inventario = inventarioRes.data || [];
  const compras = comprasRes.data || [];
  const itemsPedido = itemsRes.data || [];

  // 1. Métricas de Ventas
  const ventasTotales = pedidos.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const cantidadVentas = pedidos.length;
  const ticketPromedio = cantidadVentas > 0 ? +(ventasTotales / cantidadVentas).toFixed(2) : 0;

  // Desglose por Medio de Pago
  const mediosPagoBreakdown = {
    efectivo: 0,
    mercado_pago: 0,
    cuenta_dni: 0,
    transferencia: 0,
    tarjeta: 0
  };
  pedidos.forEach(p => {
    const mpKey = (p.medio_pago || 'efectivo').toLowerCase();
    if (mediosPagoBreakdown[mpKey] !== undefined) {
      mediosPagoBreakdown[mpKey] += Number(p.total || 0);
    } else {
      mediosPagoBreakdown.efectivo += Number(p.total || 0);
    }
  });

  // 2. Métricas Financieras (Movimientos)
  let ingresosTotales = 0;
  let egresosTotales = 0;
  const gastosPorCategoria = {};

  movimientos.forEach(m => {
    const monto = Number(m.monto || 0);
    if (m.tipo === 'INGRESO') {
      ingresosTotales += monto;
    } else if (m.tipo === 'EGRESO') {
      egresosTotales += monto;
      const cat = m.categoria || 'Varios';
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + monto;
    }
  });

  // Fallback si no hay ingresos expresos pero sí pedidos
  if (ingresosTotales === 0 && ventasTotales > 0) {
    ingresosTotales = ventasTotales;
  }

  const margenNeto = ingresosTotales - egresosTotales;
  const porcentajeMargen = ingresosTotales > 0 ? +((margenNeto / ingresosTotales) * 100).toFixed(1) : 0;

  // 3. Valorización e Índice de Salud de Inventario
  let valorCostoStock = 0;
  let valorVentaStock = 0;
  let stockOptimoCount = 0;
  let stockBajoCount = 0;

  inventario.forEach(item => {
    const cant = Number(item.cantidad || 0);
    const precioCompra = Number(item.precio_compra || item.precio || 0);
    const precioVenta = Number(item.precio_venta || item.precio || 0);

    valorCostoStock += cant * precioCompra;
    valorVentaStock += cant * precioVenta;

    const minStock = Number(item.stock_minimo || 5);
    if (cant <= minStock) {
      stockBajoCount++;
    } else {
      stockOptimoCount++;
    }
  });

  const gananciaLatenteStock = valorVentaStock - valorCostoStock;

  // 4. Top 5 Productos más Vendidos
  const productAggMap = {};
  itemsPedido.forEach(item => {
    const name = item.producto_nombre || 'Producto';
    const qty = Number(item.cantidad || 0);
    const price = Number(item.precio_unitario || 0);
    const totalItem = qty * price;

    if (!productAggMap[name]) {
      productAggMap[name] = { nombre: name, cantidad: 0, montoTotal: 0 };
    }
    productAggMap[name].cantidad += qty;
    productAggMap[name].montoTotal += totalItem;
  });

  const topProductos = Object.values(productAggMap)
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, 5);

  return {
    ventasTotales,
    cantidadVentas,
    ticketPromedio,
    ingresosTotales,
    egresosTotales,
    margenNeto,
    porcentajeMargen,
    valorCostoStock,
    valorVentaStock,
    gananciaLatenteStock,
    stockOptimoCount,
    stockBajoCount,
    mediosPagoBreakdown,
    topProductos,
    gastosPorCategoria,
    ultimosPedidos: pedidos.slice(0, 5),
    ultimasCompras: compras.slice(0, 5)
  };
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
  const { data: compra, error: compraError } = await supabase
    .from('compras')
    .insert([{ ...compraData, estado: 'Pagada', usuario_auditoria, tenant_id: tenantId }])
    .select()
    .single();
  
  if (compraError) throw compraError;

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

  await registrarMovimiento({
    tipo: 'EGRESO',
    monto: compra.importe,
    categoria: 'Proveedor',
    origen_id: compra.id,
    descripcion: `Compra a Proveedor (Ref: ${compra.id.substring(0,8)})`,
    usuario_auditoria,
    tenant_id: tenantId
  }, tenantId);

  for (const item of items) {
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
  const { data: nuevoGasto, error: gastoError } = await supabase
    .from('gastos')
    .insert([{ ...gasto, tenant_id: tenantId }])
    .select()
    .single();
  
  if (gastoError) throw gastoError;

  await registrarMovimiento({
    tipo: 'EGRESO',
    monto: nuevoGasto.importe,
    categoria: nuevoGasto.categoria_principal,
    origen_id: nuevoGasto.id,
    descripcion: nuevoGasto.rubro,
    usuario_auditoria,
    tenant_id: tenantId
  }, tenantId);

  return nuevoGasto;
};
