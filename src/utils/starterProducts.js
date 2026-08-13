import { supabase } from '../services/supabaseClient';

// Helper para normalizar strings (pasa a minúsculas, elimina tildes y espacios extra)
export const normalizeString = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
};

// Diccionario de Productos Iniciales con claves normalizadas (minúsculas sin tildes)
export const STARTER_PRODUCTS_BY_RUBRO = {
  'carniceria': [
    { nombre: 'Asado de Tira', cantidad: 10, unidad_medida: 'kg', precio_unitario: 9500, categoria: 'Cortes Vacunos' },
    { nombre: 'Milanesa de Peceto', cantidad: 15, unidad_medida: 'kg', precio_unitario: 11200, categoria: 'Elaborados' },
    { nombre: 'Chorizo Bombón', cantidad: 8, unidad_medida: 'kg', precio_unitario: 6800, categoria: 'Embutidos' },
    { nombre: 'Bife de Chorizo', cantidad: 12, unidad_medida: 'kg', precio_unitario: 12500, categoria: 'Cortes Vacunos' },
    { nombre: 'Carne Picada Especial', cantidad: 20, unidad_medida: 'kg', precio_unitario: 6200, categoria: 'Picadas' },
    { nombre: 'Vacío', cantidad: 10, unidad_medida: 'kg', precio_unitario: 8900, categoria: 'Cortes Vacunos' },
    { nombre: 'Matambre', cantidad: 8, unidad_medida: 'kg', precio_unitario: 9200, categoria: 'Cortes Vacunos' },
    { nombre: 'Costillar de Cerdo', cantidad: 12, unidad_medida: 'kg', precio_unitario: 6500, categoria: 'Cortes Porcinos' },
    { nombre: 'Pechito de Cerdo', cantidad: 10, unidad_medida: 'kg', precio_unitario: 6800, categoria: 'Cortes Porcinos' },
    { nombre: 'Suprema de Pollo', cantidad: 15, unidad_medida: 'kg', precio_unitario: 4200, categoria: 'Cortes Aviares' },
    { nombre: 'Pata Muslo de Pollo', cantidad: 20, unidad_medida: 'kg', precio_unitario: 3200, categoria: 'Cortes Aviares' },
    { nombre: 'Chorizo Parrillero', cantidad: 10, unidad_medida: 'kg', precio_unitario: 5800, categoria: 'Embutidos' },
    { nombre: 'Morcilla', cantidad: 8, unidad_medida: 'kg', precio_unitario: 4500, categoria: 'Embutidos' },
    { nombre: 'Hígado Vacuno', cantidad: 6, unidad_medida: 'kg', precio_unitario: 2800, categoria: 'Achuras' },
    { nombre: 'Mollejas', cantidad: 5, unidad_medida: 'kg', precio_unitario: 9500, categoria: 'Achuras' }
  ],
  'petshop': [
    { nombre: 'Alimento Perro Adulto 15kg', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 32000, categoria: 'Alimentos Perro' },
    { nombre: 'Alimento Gato Cachorro 3kg', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 14500, categoria: 'Alimentos Gato' },
    { nombre: 'Piedras Sanitarias Gato', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 4800, categoria: 'Higiene' },
    { nombre: 'Comedero Acero Inoxidable', cantidad: 12, unidad_medida: 'unidades', precio_unitario: 3500, categoria: 'Accesorios' },
    { nombre: 'Pipeta Pulguicida Perro', cantidad: 25, unidad_medida: 'unidades', precio_unitario: 5200, categoria: 'Salud' },
    { nombre: 'Alimento Gato Adulto 10kg', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 22000, categoria: 'Alimentos Gato' },
    { nombre: 'Alimento Perro Cachorro 15kg', cantidad: 8, unidad_medida: 'unidades', precio_unitario: 19500, categoria: 'Alimentos Perro' },
    { nombre: 'Snacks para Perro 500g', cantidad: 30, unidad_medida: 'paquetes', precio_unitario: 3800, categoria: 'Snacks' },
    { nombre: 'Arena Sanitaria Perfumada 10L', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 4200, categoria: 'Higiene' },
    { nombre: 'Correa para Perro Regulable', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 6500, categoria: 'Accesorios' },
    { nombre: 'Cama para Mascota Mediana', cantidad: 6, unidad_medida: 'unidades', precio_unitario: 18000, categoria: 'Accesorios' },
    { nombre: 'Shampoo Antipulgas', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 5200, categoria: 'Salud' },
    { nombre: 'Collar Antipulgas', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 4800, categoria: 'Salud' },
    { nombre: 'Pecera de Vidrio 20L', cantidad: 4, unidad_medida: 'unidades', precio_unitario: 25000, categoria: 'Acuariofilia' },
    { nombre: 'Alimento para Peces', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 1800, categoria: 'Acuariofilia' }
  ],
  'minimercado': [
    { nombre: 'Leche Entera 1L', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 1400, categoria: 'Lácteos' },
    { nombre: 'Galletitas Dulces 300g', cantidad: 40, unidad_medida: 'paquetes', precio_unitario: 1200, categoria: 'Almacén' },
    { nombre: 'Gaseosa Cola 2.25L', cantidad: 24, unidad_medida: 'unidades', precio_unitario: 2800, categoria: 'Bebidas' },
    { nombre: 'Aceite de Girasol 900ml', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2100, categoria: 'Almacén' },
    { nombre: 'Yerba Mate 500g', cantidad: 30, unidad_medida: 'paquetes', precio_unitario: 2600, categoria: 'Infusiones' },
    { nombre: 'Fideos Secos 500g', cantidad: 40, unidad_medida: 'paquetes', precio_unitario: 1300, categoria: 'Almacén' },
    { nombre: 'Arroz Largo Fino 1kg', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 1900, categoria: 'Almacén' },
    { nombre: 'Azúcar Común 1kg', cantidad: 25, unidad_medida: 'unidades', precio_unitario: 1500, categoria: 'Almacén' },
    { nombre: 'Agua Mineral Sin Gas 2L', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 1600, categoria: 'Bebidas' },
    { nombre: 'Cerveza Rubia Lata 473ml', cantidad: 24, unidad_medida: 'unidades', precio_unitario: 1900, categoria: 'Bebidas' },
    { nombre: 'Queso Cremoso 300g', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3200, categoria: 'Lácteos' },
    { nombre: 'Manteca 200g', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2100, categoria: 'Lácteos' },
    { nombre: 'Papel Higiénico x4', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 2800, categoria: 'Limpieza' },
    { nombre: 'Detergente Lavavajillas 750ml', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2400, categoria: 'Limpieza' },
    { nombre: 'Jamón Cocido Fetas 150g', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 2600, categoria: 'Fiambres' }
  ],
  'libreria': [
    { nombre: 'Cuaderno A4 Espiralado 80h', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3800, categoria: 'Cuadernos y Hojas' },
    { nombre: 'Birome Azul x10', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 2400, categoria: 'Escritura' },
    { nombre: 'Resma de Papel A4 75g 500h', cantidad: 10, unidad_medida: 'paquetes', precio_unitario: 8500, categoria: 'Papelería' },
    { nombre: 'Set de Resaltadores Pastel x4', cantidad: 12, unidad_medida: 'paquetes', precio_unitario: 4200, categoria: 'Escritura' },
    { nombre: 'Mochila Escolar Reforzada', cantidad: 8, unidad_medida: 'unidades', precio_unitario: 24500, categoria: 'Mochilas' },
    { nombre: 'Lápiz Negro x12', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 2200, categoria: 'Escritura' },
    { nombre: 'Goma de Borrar', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 800, categoria: 'Escritura' },
    { nombre: 'Tijera Escolar', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 1500, categoria: 'Útiles' },
    { nombre: 'Plasticola 250g', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 2000, categoria: 'Útiles' },
    { nombre: 'Cartuchera Doble', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 8500, categoria: 'Mochilas' },
    { nombre: 'Repuesto Hojas Rayadas x200', cantidad: 12, unidad_medida: 'paquetes', precio_unitario: 3600, categoria: 'Cuadernos y Hojas' },
    { nombre: 'Carpeta N°3', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 4200, categoria: 'Papelería' },
    { nombre: 'Marcadores x12 Colores', cantidad: 10, unidad_medida: 'paquetes', precio_unitario: 5800, categoria: 'Escritura' },
    { nombre: 'Calculadora Científica', cantidad: 6, unidad_medida: 'unidades', precio_unitario: 15000, categoria: 'Electrónica' },
    { nombre: 'Diccionario Español', cantidad: 5, unidad_medida: 'unidades', precio_unitario: 12000, categoria: 'Libros' }
  ],
  'dietetica': [
    { nombre: 'Mix de Frutos Secos', cantidad: 10, unidad_medida: 'kg', precio_unitario: 14000, categoria: 'Frutos Secos' },
    { nombre: 'Granola Crocante con Miel', cantidad: 15, unidad_medida: 'kg', precio_unitario: 7500, categoria: 'Cereales' },
    { nombre: 'Harina de Almendras', cantidad: 8, unidad_medida: 'kg', precio_unitario: 12800, categoria: 'Harinas Especiales' },
    { nombre: 'Semillas de Chía', cantidad: 12, unidad_medida: 'kg', precio_unitario: 5400, categoria: 'Semillas' },
    { nombre: 'Miel Pura de Abejas 1kg', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 6200, categoria: 'Endulzantes' },
    { nombre: 'Avena Arrollada 500g', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2800, categoria: 'Cereales' },
    { nombre: 'Té Verde x25 saquitos', cantidad: 15, unidad_medida: 'paquetes', precio_unitario: 3200, categoria: 'Infusiones' },
    { nombre: 'Proteína Vegetal en Polvo 500g', cantidad: 8, unidad_medida: 'unidades', precio_unitario: 18500, categoria: 'Suplementos' },
    { nombre: 'Aceite de Oliva Extra Virgen 500ml', cantidad: 12, unidad_medida: 'unidades', precio_unitario: 8900, categoria: 'Aceites' },
    { nombre: 'Pasas de Uva 500g', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 4200, categoria: 'Frutos Secos' },
    { nombre: 'Coco Rallado 250g', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3100, categoria: 'Cereales' },
    { nombre: 'Stevia Líquida 50ml', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 4500, categoria: 'Endulzantes' },
    { nombre: 'Barras de Cereal x6', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 3800, categoria: 'Snacks Saludables' },
    { nombre: 'Leche de Almendras 1L', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3600, categoria: 'Lácteos Vegetales' },
    { nombre: 'Quinoa 500g', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 5200, categoria: 'Cereales' }
  ],
  'fiambreria': [
    { nombre: 'Jamón Cocido Especial', cantidad: 8, unidad_medida: 'kg', precio_unitario: 12500, categoria: 'Fiambres' },
    { nombre: 'Queso Tybo Feteado', cantidad: 10, unidad_medida: 'kg', precio_unitario: 10800, categoria: 'Quesos' },
    { nombre: 'Salame Tandilero', cantidad: 6, unidad_medida: 'kg', precio_unitario: 14200, categoria: 'Embutidos' },
    { nombre: 'Aceitunas Verdes Rellenas', cantidad: 15, unidad_medida: 'kg', precio_unitario: 6500, categoria: 'Encurtidos' },
    { nombre: 'Queso Reggianito Horma', cantidad: 5, unidad_medida: 'kg', precio_unitario: 16000, categoria: 'Quesos duros' },
    { nombre: 'Jamón Crudo', cantidad: 5, unidad_medida: 'kg', precio_unitario: 32000, categoria: 'Fiambres' },
    { nombre: 'Bondiola Ahumada', cantidad: 6, unidad_medida: 'kg', precio_unitario: 24000, categoria: 'Fiambres' },
    { nombre: 'Queso Provolone', cantidad: 8, unidad_medida: 'kg', precio_unitario: 18000, categoria: 'Quesos' },
    { nombre: 'Queso de Rallar', cantidad: 6, unidad_medida: 'kg', precio_unitario: 16000, categoria: 'Quesos' },
    { nombre: 'Salame Milán', cantidad: 6, unidad_medida: 'kg', precio_unitario: 22000, categoria: 'Embutidos' },
    { nombre: 'Panceta Ahumada', cantidad: 6, unidad_medida: 'kg', precio_unitario: 19000, categoria: 'Fiambres' },
    { nombre: 'Aceitunas Negras', cantidad: 10, unidad_medida: 'kg', precio_unitario: 14000, categoria: 'Encurtidos' },
    { nombre: 'Queso Cremoso', cantidad: 10, unidad_medida: 'kg', precio_unitario: 12000, categoria: 'Quesos' },
    { nombre: 'Mortadela', cantidad: 8, unidad_medida: 'kg', precio_unitario: 13000, categoria: 'Fiambres' },
    { nombre: 'Pan Lactal x2', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 2800, categoria: 'Panadería' }
  ],
  'verduleria': [
    { nombre: 'Tomate Perita', cantidad: 25, unidad_medida: 'kg', precio_unitario: 2200, categoria: 'Verduras' },
    { nombre: 'Papa Negra Especial', cantidad: 40, unidad_medida: 'kg', precio_unitario: 950, categoria: 'Verduras' },
    { nombre: 'Banana Ecuador', cantidad: 30, unidad_medida: 'kg', precio_unitario: 2400, categoria: 'Frutas' },
    { nombre: 'Palta Hass Premium', cantidad: 15, unidad_medida: 'kg', precio_unitario: 5800, categoria: 'Frutas' },
    { nombre: 'Manzana Red Delicious', cantidad: 20, unidad_medida: 'kg', precio_unitario: 1900, categoria: 'Frutas' },
    { nombre: 'Zanahoria', cantidad: 25, unidad_medida: 'kg', precio_unitario: 1100, categoria: 'Verduras' },
    { nombre: 'Cebolla', cantidad: 30, unidad_medida: 'kg', precio_unitario: 1200, categoria: 'Verduras' },
    { nombre: 'Zapallo Anco', cantidad: 20, unidad_medida: 'kg', precio_unitario: 900, categoria: 'Verduras' },
    { nombre: 'Choclo', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 600, categoria: 'Verduras' },
    { nombre: 'Naranja', cantidad: 25, unidad_medida: 'kg', precio_unitario: 1400, categoria: 'Frutas' },
    { nombre: 'Limón', cantidad: 20, unidad_medida: 'kg', precio_unitario: 1600, categoria: 'Frutas' },
    { nombre: 'Pera', cantidad: 20, unidad_medida: 'kg', precio_unitario: 2000, categoria: 'Frutas' },
    { nombre: 'Ajo', cantidad: 40, unidad_medida: 'unidades', precio_unitario: 500, categoria: 'Verduras' },
    { nombre: 'Zapallito Verde', cantidad: 20, unidad_medida: 'kg', precio_unitario: 1300, categoria: 'Verduras' },
    { nombre: 'Frutilla', cantidad: 15, unidad_medida: 'kg', precio_unitario: 3500, categoria: 'Frutas' }
  ],
  'ferreteria': [
    { nombre: 'Cinta Aisladora Negra', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 1100, categoria: 'Electricidad' },
    { nombre: 'Martillo Galponero 500g', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 9500, categoria: 'Herramientas' },
    { nombre: 'Set Destornilladores x6', cantidad: 8, unidad_medida: 'paquetes', precio_unitario: 14000, categoria: 'Herramientas' },
    { nombre: 'Taquetes Fisher 8mm x100', cantidad: 15, unidad_medida: 'paquetes', precio_unitario: 3200, categoria: 'Fijaciones' },
    { nombre: 'Lubricante Aerosol 300ml', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 4800, categoria: 'Químicos' },
    { nombre: 'Pintura Látex Interior 4L', cantidad: 8, unidad_medida: 'unidades', precio_unitario: 28000, categoria: 'Pinturería' },
    { nombre: 'Pincel N°20', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 2800, categoria: 'Pinturería' },
    { nombre: 'Llave Francesa 10"', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 8500, categoria: 'Herramientas' },
    { nombre: 'Alicate Universal', cantidad: 12, unidad_medida: 'unidades', precio_unitario: 6200, categoria: 'Herramientas' },
    { nombre: 'Tornillos Autorroscantes x100', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 3800, categoria: 'Fijaciones' },
    { nombre: 'Cable Unipolar 2.5mm (rollo)', cantidad: 6, unidad_medida: 'unidades', precio_unitario: 12000, categoria: 'Electricidad' },
    { nombre: 'Tomacorriente Doble', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2200, categoria: 'Electricidad' },
    { nombre: 'Silicona para Sellador', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3200, categoria: 'Químicos' },
    { nombre: 'Guantes de Trabajo', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2500, categoria: 'Seguridad' },
    { nombre: 'Manguera de Jardín 20m', cantidad: 6, unidad_medida: 'unidades', precio_unitario: 15000, categoria: 'Jardín' }
  ],
  'cerveceria': [
    { nombre: 'Cerveza IPA Artesanal 500ml', cantidad: 48, unidad_medida: 'unidades', precio_unitario: 2800, categoria: 'Cervezas' },
    { nombre: 'Cerveza Honey 500ml', cantidad: 48, unidad_medida: 'unidades', precio_unitario: 2700, categoria: 'Cervezas' },
    { nombre: 'Cerveza Stout 500ml', cantidad: 36, unidad_medida: 'unidades', precio_unitario: 2900, categoria: 'Cervezas' },
    { nombre: 'Papas Fritas Rústicas', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 3500, categoria: 'Snacks' },
    { nombre: 'Maní Salado Tostado', cantidad: 15, unidad_medida: 'kg', precio_unitario: 4200, categoria: 'Snacks' },
    { nombre: 'Cerveza Pilsen Lata 473ml', cantidad: 60, unidad_medida: 'unidades', precio_unitario: 1800, categoria: 'Cervezas' },
    { nombre: 'Cerveza Roja 500ml', cantidad: 36, unidad_medida: 'unidades', precio_unitario: 2600, categoria: 'Cervezas' },
    { nombre: 'Cerveza Sin Alcohol 473ml', cantidad: 24, unidad_medida: 'unidades', precio_unitario: 1700, categoria: 'Cervezas' },
    { nombre: 'Vino Tinto Malbec 750ml', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 6500, categoria: 'Vinos' },
    { nombre: 'Sidra 750ml', cantidad: 12, unidad_medida: 'unidades', precio_unitario: 3200, categoria: 'Otras Bebidas' },
    { nombre: 'Copas de Cerveza x2', cantidad: 10, unidad_medida: 'paquetes', precio_unitario: 4500, categoria: 'Accesorios' },
    { nombre: 'Nachos con Queso', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3800, categoria: 'Snacks' },
    { nombre: 'Aceitunas Rellenas', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 2900, categoria: 'Snacks' },
    { nombre: 'Picada Mixta 300g', cantidad: 12, unidad_medida: 'unidades', precio_unitario: 6800, categoria: 'Snacks' },
    { nombre: 'Hielo Bolsa 2kg', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 1200, categoria: 'Insumos' }
  ],
  'cafeteria': [
    { nombre: 'Café en Grano Tostado 1kg', cantidad: 10, unidad_medida: 'paquetes', precio_unitario: 28000, categoria: 'Cafetería' },
    { nombre: 'Medialunas de Manteca', cantidad: 60, unidad_medida: 'unidades', precio_unitario: 650, categoria: 'Panadería' },
    { nombre: 'Tostado Jamón y Queso', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 3800, categoria: 'Comidas' },
    { nombre: 'Jugo Naranja Exprimido 500ml', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2200, categoria: 'Bebidas' },
    { nombre: 'Capuchino Especial', cantidad: 25, unidad_medida: 'unidades', precio_unitario: 3200, categoria: 'Cafetería' },
    { nombre: 'Té Negro x25 saquitos', cantidad: 15, unidad_medida: 'paquetes', precio_unitario: 2800, categoria: 'Infusiones' },
    { nombre: 'Chocolate Caliente en Polvo 500g', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 4200, categoria: 'Cafetería' },
    { nombre: 'Alfajor de Maicena', cantidad: 40, unidad_medida: 'unidades', precio_unitario: 900, categoria: 'Panadería' },
    { nombre: 'Tostado Jamón Crudo y Queso', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 4200, categoria: 'Comidas' },
    { nombre: 'Ensalada de Frutas', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3600, categoria: 'Comidas' },
    { nombre: 'Vaso Descartable x50', cantidad: 10, unidad_medida: 'paquetes', precio_unitario: 3200, categoria: 'Insumos' },
    { nombre: 'Azúcar en Sobres x50', cantidad: 10, unidad_medida: 'paquetes', precio_unitario: 1800, categoria: 'Insumos' },
    { nombre: 'Leche Chocolatada 500ml', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 1900, categoria: 'Bebidas' },
    { nombre: 'Scon Dulce', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 1100, categoria: 'Panadería' },
    { nombre: 'Sándwich de Miga Triple', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2800, categoria: 'Comidas' }
  ],
  'articulos de limpieza': [
    { nombre: 'Lavandina Concentrada 2L', cantidad: 30, unidad_medida: 'unidades', precio_unitario: 1800, categoria: 'Limpieza del hogar' },
    { nombre: 'Detergente Lavavajillas 750ml', cantidad: 25, unidad_medida: 'unidades', precio_unitario: 2400, categoria: 'Cocina' },
    { nombre: 'Jabón Líquido Para Ropa 3L', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 7800, categoria: 'Ropa' },
    { nombre: 'Rollos de Cocina x3', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 2600, categoria: 'Papelería' },
    { nombre: 'Limpiador Multiuso Aerosol', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 3100, categoria: 'Superficies' },
    { nombre: 'Trapo de Piso x3', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 2200, categoria: 'Limpieza del hogar' },
    { nombre: 'Esponja de Cocina x3', cantidad: 25, unidad_medida: 'paquetes', precio_unitario: 1500, categoria: 'Cocina' },
    { nombre: 'Guantes de Látex', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 1800, categoria: 'Cocina' },
    { nombre: 'Desodorante de Ambiente Aerosol', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3400, categoria: 'Superficies' },
    { nombre: 'Limpiavidrios 500ml', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2600, categoria: 'Superficies' },
    { nombre: 'Cepillo de Baño', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 2000, categoria: 'Limpieza del hogar' },
    { nombre: 'Bolsas de Residuo x30', cantidad: 20, unidad_medida: 'paquetes', precio_unitario: 2800, categoria: 'Papelería' },
    { nombre: 'Suavizante para Ropa 900ml', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3600, categoria: 'Ropa' },
    { nombre: 'Alcohol en Gel 500ml', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2400, categoria: 'Higiene' },
    { nombre: 'Escoba con Pala', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 4800, categoria: 'Limpieza del hogar' }
  ],
  'general / otro': [
    { nombre: 'Producto Ejemplo A', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 1500, categoria: 'General' },
    { nombre: 'Producto Ejemplo B', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 2500, categoria: 'General' },
    { nombre: 'Producto Ejemplo C', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 3000, categoria: 'General' },
    { nombre: 'Producto Ejemplo D', cantidad: 12, unidad_medida: 'unidades', precio_unitario: 3500, categoria: 'General' },
    { nombre: 'Producto Ejemplo E', cantidad: 10, unidad_medida: 'unidades', precio_unitario: 4000, categoria: 'General' },
    { nombre: 'Producto Ejemplo F', cantidad: 8, unidad_medida: 'unidades', precio_unitario: 4500, categoria: 'General' },
    { nombre: 'Producto Ejemplo G', cantidad: 8, unidad_medida: 'unidades', precio_unitario: 5000, categoria: 'General' },
    { nombre: 'Producto Ejemplo H', cantidad: 20, unidad_medida: 'unidades', precio_unitario: 1800, categoria: 'General' },
    { nombre: 'Producto Ejemplo I', cantidad: 18, unidad_medida: 'unidades', precio_unitario: 2200, categoria: 'General' },
    { nombre: 'Producto Ejemplo J', cantidad: 15, unidad_medida: 'unidades', precio_unitario: 2700, categoria: 'General' },
    { nombre: 'Producto Ejemplo K', cantidad: 12, unidad_medida: 'unidades', precio_unitario: 3300, categoria: 'General' },
    { nombre: 'Producto Ejemplo L', cantidad: 6, unidad_medida: 'unidades', precio_unitario: 6000, categoria: 'General' },
    { nombre: 'Producto Ejemplo M', cantidad: 5, unidad_medida: 'unidades', precio_unitario: 7500, categoria: 'General' },
    { nombre: 'Producto Ejemplo N', cantidad: 25, unidad_medida: 'unidades', precio_unitario: 1200, categoria: 'General' },
    { nombre: 'Producto Ejemplo O', cantidad: 4, unidad_medida: 'unidades', precio_unitario: 9000, categoria: 'General' }
  ]
};

// Carga de productos por defecto en el inventario de un tenant nuevo.
// Se usa tanto desde AuthContext (primer login post-confirmación, que es
// donde ahora se crea el tenant) como potencialmente desde otros puntos de
// alta futuros -- por eso vive acá y no adentro de OnboardingWizard.
export const seedProductosIniciales = async (tenantId, rubroElegido) => {
  console.log(`[Seed Inventario] Iniciando precarga para tenantId: ${tenantId}, rubro: '${rubroElegido}'`);

  if (!tenantId) {
    console.error('[Seed Inventario ERROR] No se proporcionó un tenantId válido.');
    return;
  }

  const rubroKey = normalizeString(rubroElegido);
  const items = STARTER_PRODUCTS_BY_RUBRO[rubroKey] || STARTER_PRODUCTS_BY_RUBRO['general / otro'] || [];

  if (items.length === 0) {
    console.warn(`[Seed Inventario WARN] No se encontraron productos iniciales para el rubro normalizado: '${rubroKey}'`);
    return;
  }

  const payload = items.map(item => ({
    tenant_id: tenantId,
    nombre: item.nombre,
    cantidad: Number(item.cantidad || 0),
    unidad_medida: item.unidad_medida || 'unidades',
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
