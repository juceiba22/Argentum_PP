import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Building2, MapPin, Receipt, ShieldCheck, CheckCircle2, 
  ArrowRight, ArrowLeft, Sparkles, AlertCircle, Loader2, Check, Store
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// Helper para normalizar strings (pasa a minúsculas, elimina tildes y espacios extra)
const normalizeString = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const RUBROS_CATALOGO = [
  { value: 'Carnicería', label: '🥩 Carnicería' },
  { value: 'Petshop', label: '🐶 Petshop' },
  { value: 'Minimercado', label: '🛒 Minimercado' },
  { value: 'Librería', label: '📚 Librería' },
  { value: 'Dietética', label: '🌿 Dietética' },
  { value: 'Fiambrería', label: '🧀 Fiambrería' },
  { value: 'Verdulería', label: '🍎 Verdulería' },
  { value: 'Ferretería', label: '🔧 Ferretería' },
  { value: 'Cervecería', label: '🍺 Cervecería' },
  { value: 'Cafetería', label: '☕ Cafetería' },
  { value: 'Artículos de Limpieza', label: '🧼 Artículos de Limpieza' },
  { value: 'General / Otro', label: '🏪 General / Otro' }
];

// Diccionario de Productos Iniciales con claves normalizadas (minúsculas sin tildes)
const STARTER_PRODUCTS_BY_RUBRO = {
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

export default function OnboardingWizard({ onBackToLogin }) {
  const navigate = useNavigate();

  // Paso actual (1 al 4, o 5 para Pantalla de Éxito)
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registroExitoso, setRegistroExitoso] = useState(false);

  // Estado del Formulario Multi-paso (4 Pasos)
  const [formData, setFormData] = useState({
    // Paso 1: Tu cuenta
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',

    // Paso 2: Tu comercio
    nombre_comercio: '',
    razon_social: '',
    rubro: 'Carnicería',
    cuit: '',
    condicion_fiscal: 'Monotributista',

    // Paso 3: Datos fiscales
    domicilio_fiscal: '',
    provincia: 'Buenos Aires',
    localidad: '',
    codigo_postal: '',

    // Paso 4: Facturación electrónica
    tienePuntoVenta: true,
    afip_punto_de_venta: '1'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Validaciones y avance de pasos (1 -> 2 -> 3 -> 4 -> Registro)
  const handleSiguientePaso = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (paso === 1) {
      if (!formData.nombre || !formData.apellido || !formData.email || !formData.password) {
        setErrorMsg('Por favor completa todos los campos obligatorios.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.');
        return;
      }
      if (formData.password.length < 6) {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      setPaso(2);
      return;
    }

    if (paso === 2) {
      if (!formData.nombre_comercio || !formData.cuit || !formData.rubro) {
        setErrorMsg('Por favor ingresá el nombre de tu comercio, CUIT y rubro.');
        return;
      }
      setPaso(3);
      return;
    }

    if (paso === 3) {
      if (!formData.domicilio_fiscal || !formData.localidad || !formData.provincia) {
        setErrorMsg('Por favor completa los datos de tu domicilio fiscal.');
        return;
      }
      setPaso(4);
      return;
    }

    if (paso === 4) {
      handleFinalizarRegistro();
    }
  };

  const handlePasoAnterior = () => {
    setErrorMsg('');
    setPaso(prev => Math.max(1, prev - 1));
  };

  // Carga de productos por defecto en el inventario del nuevo tenant (Ejecutado con cliente autenticado de Supabase)
  const seedProductosIniciales = async (tenantId, rubroElegido) => {
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

    // Mapeo estricto con campos válidos de la tabla 'inventario'
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
      // No tragar el error: si esto falla, el registro queda a medias
      // (comercio sin catálogo inicial) y el usuario nunca se entera si
      // solo lo logueamos. Que lo maneje el catch de handleFinalizarRegistro.
      throw new Error(`No se pudieron cargar los productos iniciales: ${error.message}`);
    }

    console.log('[Seed Inventario ÉXITO] Productos iniciales insertados correctamente:', data);
  };

  // Finalizar Registro y Guardar en Supabase al completar el Paso 4
  const handleFinalizarRegistro = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Registro de usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'admin',
            nombre: formData.nombre,
            apellido: formData.apellido,
            nombre_comercio: formData.nombre_comercio
          }
        }
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) throw new Error('No se pudo crear la cuenta de usuario.');

      // 2. Iniciar sesión PRIMERO para autenticar el cliente de Supabase (JWT activo)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (signInError) {
        console.warn('Advertencia al iniciar sesión inicial:', signInError.message);
      }

      // 3. Generar UUID aislado para el nuevo Tenant
      const newTenantId = crypto.randomUUID();

      // 4. Crear el nuevo Tenant en la tabla 'tenants' (Cliente ya autenticado)
      // OJO: la tabla no tiene columna "nombre", solo "nombre_comercio". Antes
      // se mandaban las dos, PostgREST rechazaba el INSERT entero por la
      // columna inexistente, y como el error solo se logueaba (ver más abajo)
      // el registro seguía como si nada: sin tenant, sin rubro guardado, sin
      // vínculo en tenant_users y sin productos iniciales, pero mostrando la
      // pantalla de "Registro Exitoso" igual.
      const { error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          id: newTenantId,
          nombre_comercio: formData.nombre_comercio,
          razon_social: formData.razon_social || formData.nombre_comercio,
          rubro: formData.rubro,
          cuit: formData.cuit,
          afip_cuit_delegado: formData.cuit,
          condicion_fiscal: formData.condicion_fiscal,
          domicilio_fiscal: formData.domicilio_fiscal,
          provincia: formData.provincia,
          localidad: formData.localidad,
          codigo_postal: formData.codigo_postal,
          afip_punto_de_venta: Number(formData.afip_punto_de_venta || 1),
          necesita_crear_pto_venta: !formData.tienePuntoVenta,
          afip_delegacion_verificada: true,
          afip_delegacion_verificada_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          onboarding_completado: true,
          onboarding_paso_actual: 4
        }]);

      if (tenantError) {
        throw new Error(`No se pudo crear el comercio: ${tenantError.message}`);
      }

      // 5. Vincular el usuario en 'tenant_users'
      const { error: linkError } = await supabase
        .from('tenant_users')
        .insert([{
          tenant_id: newTenantId,
          user_id: user.id,
          role: 'admin',
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono
        }]);

      if (linkError) {
        throw new Error(`No se pudo vincular tu usuario al comercio: ${linkError.message}`);
      }

      // 6. Poblar catálogo inicial de productos por defecto en inventario (Cliente autenticado)
      await seedProductosIniciales(newTenantId, formData.rubro);

      // Marcar registro exitoso para mostrar pantalla final de éxito
      setRegistroExitoso(true);
      setPaso(5); // Pantalla de Éxito
    } catch (err) {
      console.error('Error durante el registro:', err);
      setErrorMsg(err.message || 'Ocurrió un error al registrar el comercio. Por favor intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleIngresarAlPos = () => {
    navigate('/market');
  };

  return (
    <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '36px', position: 'relative' }}>

        {/* Encabezado e Indicador de Pasos (1 al 4) */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 className="brand-title" style={{ fontSize: '2.2rem', marginBottom: '6px' }}>
            Argentum
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Registro y Configuración Inicial de Comercio
          </p>

          {/* Progress Bar (Pasos 1 a 4) */}
          {!registroExitoso && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', position: 'relative', maxWidth: '480px', margin: '24px auto 0 auto' }}>
              <div style={{ position: 'absolute', top: '16px', left: '12%', right: '12%', height: '3px', backgroundColor: 'rgba(0,0,0,0.08)', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', top: '16px', left: '12%', width: `${((paso - 1) / 3) * 76}%`, height: '3px', backgroundColor: 'var(--accent-primary)', zIndex: 0, transition: 'width 0.4s ease' }}></div>

              {[1, 2, 3, 4].map(num => (
                <div key={num} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: paso >= num ? 'var(--accent-primary)' : 'var(--card-bg)',
                    color: paso >= num ? '#FFFFFF' : 'var(--text-secondary)',
                    border: `2px solid ${paso >= num ? 'var(--accent-primary)' : 'rgba(0,0,0,0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    transition: 'all 0.3s ease'
                  }}>
                    {paso > num ? <Check size={18} /> : num}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: paso === num ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: paso === num ? 700 : 400 }}>
                    Paso {num}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(183, 65, 52, 0.08)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 1 — TU CUENTA */}
        {/* ========================================================================= */}
        {paso === 1 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 1 — Tu cuenta
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>¡Bienvenido a Argentum! Creá tus credenciales de acceso.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Nombre *</label>
                <input type="text" name="nombre" className="input-field" placeholder="Juan" value={formData.nombre} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label className="input-label">Apellido *</label>
                <input type="text" name="apellido" className="input-field" placeholder="Pérez" value={formData.apellido} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Email *</label>
                <input type="email" name="email" className="input-field" placeholder="juan@ejemplo.com" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label className="input-label">Teléfono</label>
                <input type="tel" name="telefono" className="input-field" placeholder="+54 9 11 1234-5678" value={formData.telefono} onChange={handleChange} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Contraseña *</label>
                <input type="password" name="password" className="input-field" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label className="input-label">Confirmar Contraseña *</label>
                <input type="password" name="confirmPassword" className="input-field" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', alignItems: 'center' }}>
              {onBackToLogin ? (
                <button type="button" onClick={onBackToLogin} className="btn btn-secondary" style={{ padding: '10px 18px' }}>
                  Volver al Login
                </button>
              ) : <div></div>}

              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Siguiente Paso <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 2 — TU COMERCIO Y RUBRO */}
        {/* ========================================================================= */}
        {paso === 2 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 2 — Tu comercio
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>¿Cómo se llama tu comercio y a qué rubro pertenece?</p>
            </div>

            <div className="input-group">
              <label className="input-label">Nombre comercial *</label>
              <input type="text" name="nombre_comercio" className="input-field" placeholder="Ej: Don Pedro" value={formData.nombre_comercio} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label className="input-label">Rubro del Comercio *</label>
              <select 
                name="rubro" 
                className="input-field" 
                value={formData.rubro} 
                onChange={handleChange}
                style={{ cursor: 'pointer', fontWeight: 600 }}
              >
                {RUBROS_CATALOGO.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Cargaremos automáticamente un catálogo inicial de 5 productos de {formData.rubro} para que pruebes el sistema de inmediato.
              </span>
            </div>

            <div className="input-group">
              <label className="input-label">Razón social</label>
              <input type="text" name="razon_social" className="input-field" placeholder="Don Pedro S.R.L. / Juan Pérez" value={formData.razon_social} onChange={handleChange} />
            </div>

            <div className="input-group">
              <label className="input-label">CUIT *</label>
              <input type="text" name="cuit" className="input-field" placeholder="20-34567890-9" value={formData.cuit} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Condición fiscal *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Responsable Inscripto', 'Monotributista', 'Exento'].map(cond => (
                  <label key={cond} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px',
                    border: `1px solid ${formData.condicion_fiscal === cond ? 'var(--accent-primary)' : 'rgba(0,0,0,0.1)'}`,
                    backgroundColor: formData.condicion_fiscal === cond ? 'rgba(197, 160, 89, 0.08)' : 'var(--card-bg)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="condicion_fiscal" 
                      value={cond} 
                      checked={formData.condicion_fiscal === cond} 
                      onChange={handleChange} 
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cond}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button type="button" onClick={handlePasoAnterior} className="btn btn-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={18} /> Anterior
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Siguiente Paso <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 3 — DATOS FISCALES */}
        {/* ========================================================================= */}
        {paso === 3 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 3 — Datos fiscales
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Domicilio legal registrado en ARCA</p>
            </div>

            <div className="input-group">
              <label className="input-label">Domicilio fiscal *</label>
              <input type="text" name="domicilio_fiscal" className="input-field" placeholder="Av. San Martín 1234" value={formData.domicilio_fiscal} onChange={handleChange} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Provincia *</label>
                <input type="text" name="provincia" className="input-field" placeholder="Buenos Aires" value={formData.provincia} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label className="input-label">Localidad *</label>
                <input type="text" name="localidad" className="input-field" placeholder="La Plata" value={formData.localidad} onChange={handleChange} required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Código postal</label>
              <input type="text" name="codigo_postal" className="input-field" placeholder="1900" value={formData.codigo_postal} onChange={handleChange} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              <button type="button" onClick={handlePasoAnterior} className="btn btn-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={18} /> Anterior
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Siguiente Paso <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 4 — FACTURACIÓN ELECTRÓNICA (PASO FINAL DE ALTA) */}
        {/* ========================================================================= */}
        {paso === 4 && (
          <form onSubmit={handleSiguientePaso} className="animate-fade-in">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                PASO 4 — Facturación electrónica
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configuración de ARCA (AFIP)</p>
            </div>

            <div className="input-group">
              <label className="input-label">CUIT registrado</label>
              <input type="text" name="cuit" className="input-field" value={formData.cuit} readOnly style={{ opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.03)' }} />
            </div>

            <div className="input-group" style={{ marginTop: '20px' }}>
              <label className="input-label" style={{ marginBottom: '10px', display: 'block' }}>Punto de Venta</label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tienePuntoVenta" 
                    checked={formData.tienePuntoVenta} 
                    onChange={() => setFormData(prev => ({ ...prev, tienePuntoVenta: true }))} 
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ya tengo punto de venta para Facturación Electrónica</span>
                </label>

                {formData.tienePuntoVenta && (
                  <div style={{ marginLeft: '28px', marginTop: '-4px' }}>
                    <input 
                      type="number" 
                      name="afip_punto_de_venta" 
                      className="input-field" 
                      placeholder="Ej: 1" 
                      value={formData.afip_punto_de_venta} 
                      onChange={handleChange} 
                      style={{ maxWidth: '180px' }}
                    />
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="tienePuntoVenta" 
                    checked={!formData.tienePuntoVenta} 
                    onChange={() => setFormData(prev => ({ ...prev, tienePuntoVenta: false, afip_punto_de_venta: '1' }))} 
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Necesito crear uno nuevo en ARCA</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button type="button" onClick={handlePasoAnterior} className="btn btn-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={loading}>
                <ArrowLeft size={18} /> Anterior
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {loading ? 'Dando de Alta...' : 'Finalizar Registro'}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PANTALLA FINAL — CARTA DE ÉXITO (COMERCIO HABILITADO) */}
        {/* ========================================================================= */}
        {registroExitoso && paso === 5 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ 
              padding: '32px 24px', borderRadius: '16px', 
              backgroundColor: 'rgba(16, 185, 129, 0.08)', 
              border: '2px solid var(--success)', 
              marginBottom: '28px' 
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: 'var(--success)', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <Sparkles size={36} />
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                COMERCIO HABILITADO
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                ¡Bienvenido a Argentum!
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0 auto' }}>
                Tu comercio <strong>{formData.nombre_comercio}</strong> (Rubro: <strong>{formData.rubro}</strong>) ha sido registrado. Cargamos automáticamente <strong>5 productos iniciales</strong> en tu inventario para que puedas probar el sistema de inmediato.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={handleIngresarAlPos} 
                className="btn btn-primary" 
                style={{ padding: '14px 40px', fontSize: '1.05rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '10px' }}
              >
                <span>Ingresar a Argentum POS</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
