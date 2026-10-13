// Cálculo de desposte de una media res vacuna.
//
// Fórmula (dos etapas):
//
//   1) kg aprovechables = kg media res × RENDIMIENTO
//      El resto (hueso, grasa, recorte) es el desperdicio de primera etapa.
//
//   2) kg de cada corte = kg aprovechables × porcentaje del corte
//      Los porcentajes son la tabla promedio de referencia ("Porcentaje2"):
//      reparten el 100% de la carne aprovechable, no de la media res.
//
//   Subgrupos (opcionales, segunda etapa): algunos cortes se pueden seguir
//   despostando. kg subcorte = kg de los cortes de origen × factor, y lo que
//   no sale como subcorte es la "segunda pérdida".
//
// Ejemplo con 97 kg: 97 × 81,35% = 78,91 kg aprovechables;
// asado = 78,91 × 9,87% = 7,79 kg; ojo de bife = bife ancho 5,74 × 56% = 3,22 kg.

// 78,905 kg aprovechables sobre una media res de 97 kg.
export const RENDIMIENTO_MEDIA_RES = 0.8135;

// Porcentaje de cada corte sobre la carne aprovechable (tabla "Porcentaje2").
export const CORTES_MEDIA_RES = [
  { nombre: 'Asado', porcentaje: 9.87 },
  { nombre: 'Vacío', porcentaje: 4.31 },
  { nombre: 'Matambre', porcentaje: 1.73 },
  { nombre: 'Entraña', porcentaje: 0.69 },
  { nombre: 'Palomita', porcentaje: 1.13 },
  { nombre: 'Tortuguita', porcentaje: 1.88 },
  { nombre: 'Roast beef', porcentaje: 5.90 },
  { nombre: 'Bife ancho', porcentaje: 7.28 },
  { nombre: 'Paleta', porcentaje: 7.34 },
  { nombre: 'Nalga', porcentaje: 8.92 },
  { nombre: 'Bola de lomo', porcentaje: 4.78 },
  { nombre: 'Cuadrada', porcentaje: 4.92 },
  { nombre: 'Cuadril', porcentaje: 5.66 },
  { nombre: 'Peceto', porcentaje: 2.56 },
  { nombre: 'Bife con lomo', porcentaje: 7.92 },
  { nombre: 'Bife angosto', porcentaje: 6.49 },
  { nombre: 'Carnaza común', porcentaje: 5.47 },
  { nombre: 'Falda', porcentaje: 4.59 },
  { nombre: 'Falda parrillera', porcentaje: 0.86 },
  { nombre: 'Osobuco', porcentaje: 2.14 },
  { nombre: 'Espinazo', porcentaje: 0.84 },
  { nombre: 'Lomo', porcentaje: 0.85 },
  { nombre: 'Arañita', porcentaje: 0.46 },
  { nombre: 'Colita de cuadril', porcentaje: 2.06 },
  { nombre: 'Tapa de asado', porcentaje: 1.36 }
];

// Subgrupos de segunda etapa. "factor" es la fracción de los kg de origen
// que sale como ese subcorte. factor: null = dato todavía no relevado; el
// subgrupo queda deshabilitado hasta completarlo (si no, el resto se
// contaría como pérdida y el stock quedaría corto).
export const SUBGRUPOS_MEDIA_RES = [
  {
    id: 'bife-ancho',
    nombre: 'Separar bife ancho en ojo de bife y marucha',
    origen: ['Bife ancho'],
    salidas: [
      { nombre: 'Ojo de bife', factor: 0.56 },
      { nombre: 'Marucha', factor: 0.24 }
    ]
  },
  {
    id: 'tapa-nalga',
    nombre: 'Separar la tapa de nalga',
    origen: ['Nalga'],
    salidas: [
      { nombre: 'Tapa de nalga', factor: 0.25 },
      { nombre: 'Nalga', factor: null }
    ]
  },
  {
    id: 'bife-chorizo',
    nombre: 'Sacar bife de chorizo del bife con lomo y el bife angosto',
    origen: ['Bife con lomo', 'Bife angosto'],
    salidas: [
      { nombre: 'Bife de chorizo', factor: 0.5623 },
      { nombre: 'Lomo', factor: null }
    ]
  }
];

export const subgrupoConfigurado = (subgrupo) =>
  subgrupo.salidas.every(s => typeof s.factor === 'number');

const redondearKg = (kg) => Math.round(kg * 1000) / 1000;

// Devuelve el desglose de una media res de `kgMediaRes` kg.
// filas: un elemento por corte de primera etapa; si su subgrupo está activo,
// trae `subcortes` y `perdidaKg` (segunda pérdida) y deja de ir al stock
// como corte entero.
export const calcularDesposte = (
  kgMediaRes,
  { rendimiento = RENDIMIENTO_MEDIA_RES, subgruposActivos = [] } = {}
) => {
  const kg = Number(kgMediaRes) || 0;
  const kgAprovechable = kg * rendimiento;
  // La tabla suma 100,01% por redondeo: se normaliza para no inventar kilos.
  const sumaPorcentajes = CORTES_MEDIA_RES.reduce((acc, c) => acc + c.porcentaje, 0);

  const kgPorCorte = Object.fromEntries(
    CORTES_MEDIA_RES.map(c => [c.nombre, kgAprovechable * c.porcentaje / sumaPorcentajes])
  );

  const filas = CORTES_MEDIA_RES.map(c => ({
    nombre: c.nombre,
    kg: redondearKg(kgPorCorte[c.nombre]),
    porcentajeMediaRes: kg ? (kgPorCorte[c.nombre] / kg) * 100 : 0,
    subcortes: null,
    perdidaKg: 0
  }));

  let perdidaSecundariaKg = 0;

  SUBGRUPOS_MEDIA_RES
    .filter(sg => subgruposActivos.includes(sg.id) && subgrupoConfigurado(sg))
    .forEach(sg => {
      const kgOrigen = sg.origen.reduce((acc, nombre) => acc + kgPorCorte[nombre], 0);
      const subcortes = sg.salidas.map(s => ({
        nombre: s.nombre,
        kg: redondearKg(kgOrigen * s.factor),
        porcentajeMediaRes: kg ? (kgOrigen * s.factor / kg) * 100 : 0
      }));
      const perdidaKg = kgOrigen * (1 - sg.salidas.reduce((acc, s) => acc + s.factor, 0));
      perdidaSecundariaKg += perdidaKg;

      // Los subcortes se muestran colgando del primer corte de origen; los
      // demás orígenes quedan marcados como consumidos por el subgrupo.
      sg.origen.forEach((nombre, idx) => {
        const fila = filas.find(f => f.nombre === nombre);
        fila.subgrupo = sg.id;
        if (idx === 0) {
          fila.subcortes = subcortes;
          fila.perdidaKg = redondearKg(perdidaKg);
        }
      });
    });

  return {
    kgMediaRes: kg,
    kgAprovechable: redondearKg(kgAprovechable),
    kgDesperdicio: redondearKg(kg - kgAprovechable),
    perdidaSecundariaKg: redondearKg(perdidaSecundariaKg),
    filas
  };
};

// Lista plana de lo que efectivamente entra al stock: cortes enteros que no
// pasaron a un subgrupo + subcortes. Suma los repetidos (p. ej. "Lomo" como
// corte propio y como salida del bife con lomo).
export const cortesParaStock = (resultado) => {
  const totales = new Map();
  const sumar = (nombre, kg) => totales.set(nombre, (totales.get(nombre) || 0) + kg);

  resultado.filas.forEach(f => {
    if (f.subgrupo) {
      (f.subcortes || []).forEach(s => sumar(s.nombre, s.kg));
    } else {
      sumar(f.nombre, f.kg);
    }
  });

  return [...totales.entries()]
    .map(([nombre, kg]) => ({ nombre, kg: redondearKg(kg) }))
    .filter(c => c.kg > 0);
};

// Reparte el costo total de la media res entre los cortes según su valor de
// venta (método del valor relativo de venta): un kg de lomo absorbe más costo
// que un kg de osobuco. Si falta el precio de venta de algún corte, se
// reparte por kg para todos.
export const asignarCostos = (cortes, costoTotal, precioVentaPorNombre) => {
  const conPrecio = cortes.every(c => Number(precioVentaPorNombre[c.nombre]) > 0);
  const kgTotal = cortes.reduce((acc, c) => acc + c.kg, 0);
  const valorTotal = cortes.reduce((acc, c) => acc + c.kg * Number(precioVentaPorNombre[c.nombre] || 0), 0);

  return cortes.map(c => {
    const costoPorKg = conPrecio && valorTotal > 0
      ? Number(precioVentaPorNombre[c.nombre]) * (costoTotal / valorTotal)
      : (kgTotal > 0 ? costoTotal / kgTotal : 0);
    return { ...c, costoPorKg };
  });
};

export const normalizarNombreCorte = (nombre) =>
  (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
