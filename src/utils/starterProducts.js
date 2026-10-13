import { supabase } from '../services/supabaseClient';

// Argentum es un software exclusivo para carnicerías: todo tenant nuevo se
// da de alta con este rubro y recibe el mismo catálogo inicial de cortes.
export const RUBRO_CARNICERIA = 'Carnicería';

// Catálogo inicial de una carnicería (precios por kg de referencia, el
// carnicero los ajusta desde Inventario en el primer uso).
export const STARTER_PRODUCTS_CARNICERIA = [
  { nombre: 'Asado de Tira', cantidad: 10, unidad_medida: 'kg', precio_unitario: 9500, categoria: 'Cortes Vacunos' },
  { nombre: 'Vacío', cantidad: 10, unidad_medida: 'kg', precio_unitario: 8900, categoria: 'Cortes Vacunos' },
  { nombre: 'Matambre', cantidad: 8, unidad_medida: 'kg', precio_unitario: 9200, categoria: 'Cortes Vacunos' },
  { nombre: 'Bife de Chorizo', cantidad: 12, unidad_medida: 'kg', precio_unitario: 12500, categoria: 'Cortes Vacunos' },
  { nombre: 'Nalga', cantidad: 12, unidad_medida: 'kg', precio_unitario: 11800, categoria: 'Cortes Vacunos' },
  { nombre: 'Cuadril', cantidad: 10, unidad_medida: 'kg', precio_unitario: 11500, categoria: 'Cortes Vacunos' },
  { nombre: 'Carne Picada Especial', cantidad: 20, unidad_medida: 'kg', precio_unitario: 6200, categoria: 'Picadas' },
  { nombre: 'Milanesa de Peceto', cantidad: 15, unidad_medida: 'kg', precio_unitario: 11200, categoria: 'Elaborados' },
  { nombre: 'Costillar de Cerdo', cantidad: 12, unidad_medida: 'kg', precio_unitario: 6500, categoria: 'Cortes Porcinos' },
  { nombre: 'Bondiola de Cerdo', cantidad: 8, unidad_medida: 'kg', precio_unitario: 7900, categoria: 'Cortes Porcinos' },
  { nombre: 'Pechito de Cerdo', cantidad: 10, unidad_medida: 'kg', precio_unitario: 6800, categoria: 'Cortes Porcinos' },
  { nombre: 'Suprema de Pollo', cantidad: 15, unidad_medida: 'kg', precio_unitario: 4200, categoria: 'Pollo' },
  { nombre: 'Pata Muslo de Pollo', cantidad: 20, unidad_medida: 'kg', precio_unitario: 3200, categoria: 'Pollo' },
  { nombre: 'Chorizo Parrillero', cantidad: 10, unidad_medida: 'kg', precio_unitario: 5800, categoria: 'Embutidos' },
  { nombre: 'Morcilla', cantidad: 8, unidad_medida: 'kg', precio_unitario: 4500, categoria: 'Embutidos' },
  { nombre: 'Chinchulines', cantidad: 6, unidad_medida: 'kg', precio_unitario: 5200, categoria: 'Achuras' },
  { nombre: 'Mollejas', cantidad: 5, unidad_medida: 'kg', precio_unitario: 9500, categoria: 'Achuras' },
  { nombre: 'Hígado Vacuno', cantidad: 6, unidad_medida: 'kg', precio_unitario: 2800, categoria: 'Achuras' }
];

// Carga de productos por defecto en el inventario de un tenant nuevo.
// Se usa tanto desde AuthContext (primer login post-confirmación, que es
// donde ahora se crea el tenant) como potencialmente desde otros puntos de
// alta futuros -- por eso vive acá y no adentro de OnboardingWizard.
export const seedProductosIniciales = async (tenantId) => {
  console.log(`[Seed Inventario] Iniciando precarga del catálogo de carnicería para tenantId: ${tenantId}`);

  if (!tenantId) {
    console.error('[Seed Inventario ERROR] No se proporcionó un tenantId válido.');
    return;
  }

  const items = STARTER_PRODUCTS_CARNICERIA;

  const payload = items.map(item => ({
    tenant_id: tenantId,
    nombre: item.nombre,
    cantidad: Number(item.cantidad || 0),
    unidad_medida: item.unidad_medida || 'kg',
    precio_unitario: Number(item.precio_unitario || 0),
    categoria: item.categoria || 'General'
  }));

  console.log(`[Seed Inventario] Insertando ${payload.length} productos en la tabla 'inventario'...`, payload);

  const { data, error } = await supabase
    .from('inventario')
    .insert(payload)
    .select();

  if (error) {
    throw new Error(`No se pudieron cargar los productos iniciales: ${error.message}`);
  }

  console.log('[Seed Inventario ÉXITO] Productos iniciales insertados correctamente:', data);
};
