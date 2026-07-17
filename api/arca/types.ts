/**
 * Tipos específicos para la integración con ARCA (ex AFIP).
 * Facturación electrónica para Responsable Inscripto (Factura A + B).
 */

// ─── Tipos de comprobante ────────────────────────────────────────────────────

/** Códigos de tipo de comprobante AFIP */
export const TIPO_COMPROBANTE = {
  FACTURA_A: 1,
  NOTA_DEBITO_A: 2,
  NOTA_CREDITO_A: 3,
  FACTURA_B: 6,
  NOTA_DEBITO_B: 7,
  NOTA_CREDITO_B: 8,
  FACTURA_C: 11,
} as const;

export type TipoComprobante = (typeof TIPO_COMPROBANTE)[keyof typeof TIPO_COMPROBANTE];

/** Códigos de condición IVA del receptor */
export const CONDICION_IVA = {
  RESPONSABLE_INSCRIPTO: 1,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  MONOTRIBUTISTA: 6,
  MONOTRIBUTISTA_SOCIAL: 13,
} as const;

export type CondicionIVA = (typeof CONDICION_IVA)[keyof typeof CONDICION_IVA];

/** Códigos de tipo de documento */
export const DOC_TIPO = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  SIN_IDENTIFICAR: 99,
} as const;

export type DocTipo = (typeof DOC_TIPO)[keyof typeof DOC_TIPO];

/** Códigos de alícuota IVA */
export const ALICUOTA_IVA = {
  IVA_0: 3,
  IVA_10_5: 4,
  IVA_21: 5,
  IVA_27: 6,
  IVA_5: 8,
  IVA_2_5: 9,
} as const;

export type AlicuotaIVA = (typeof ALICUOTA_IVA)[keyof typeof ALICUOTA_IVA];

/** Porcentajes correspondientes a cada código de alícuota */
export const ALICUOTA_PORCENTAJE: Record<AlicuotaIVA, number> = {
  [ALICUOTA_IVA.IVA_0]: 0,
  [ALICUOTA_IVA.IVA_2_5]: 2.5,
  [ALICUOTA_IVA.IVA_5]: 5,
  [ALICUOTA_IVA.IVA_10_5]: 10.5,
  [ALICUOTA_IVA.IVA_21]: 21,
  [ALICUOTA_IVA.IVA_27]: 27,
};

// ─── Concepto ────────────────────────────────────────────────────────────────

export const CONCEPTO = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
} as const;

export type Concepto = (typeof CONCEPTO)[keyof typeof CONCEPTO];

// ─── Interfaces para la API ──────────────────────────────────────────────────

export interface EmitirFacturaPayload {
  /** Tipo de comprobante (1=Factura A, 6=Factura B) */
  tipoCbte: typeof TIPO_COMPROBANTE.FACTURA_A | typeof TIPO_COMPROBANTE.FACTURA_B;
  /** Condición IVA del receptor (determina si es Factura A o B) */
  condicionIVAReceptor: CondicionIVA;
  /** Tipo de documento del receptor */
  docTipo: DocTipo;
  /** Número de documento del receptor (sin guiones) */
  docNro: string;
  /** Importe total (IVA incluido) */
  importeTotal: number;
  /** Concepto: 1=Productos, 2=Servicios, 3=Ambos */
  concepto: Concepto;
  /** Descripción del comprobante */
  descripcion?: string;
  /** Fecha del comprobante YYYY-MM-DD (default: hoy) */
  fechaCbte?: string;
  /** ID del pedido para vincular */
  pedidoId?: string;
  /** Alícuota IVA a aplicar (default: 21%) */
  alicuotaIVA?: AlicuotaIVA;
}

export interface EmitirFacturaResult {
  ok: boolean;
  cae?: string;
  caeFchVto?: string;
  nroCbte?: number;
  tipoCbte?: number;
  error?: string;
}

export interface ARCAServerStatus {
  ok: boolean;
  appServer?: string;
  dbServer?: string;
  authServer?: string;
  error?: string;
}

/**
 * Determina automáticamente el tipo de comprobante según la condición IVA del receptor.
 */
export function determinarTipoCbte(condicionIVA: CondicionIVA): typeof TIPO_COMPROBANTE.FACTURA_A | typeof TIPO_COMPROBANTE.FACTURA_B {
  if (condicionIVA === CONDICION_IVA.RESPONSABLE_INSCRIPTO) {
    return TIPO_COMPROBANTE.FACTURA_A;
  }
  return TIPO_COMPROBANTE.FACTURA_B;
}

/**
 * Calcula la descomposición de IVA para un importe total.
 */
export function calcularDesgloseIVA(
  importeTotal: number,
  tipoCbte: TipoComprobante,
  alicuotaId: AlicuotaIVA = ALICUOTA_IVA.IVA_21
): { impNeto: number; impIVA: number; impTotal: number } {
  if (tipoCbte === TIPO_COMPROBANTE.FACTURA_A || tipoCbte === TIPO_COMPROBANTE.FACTURA_B) {
    const tasa = ALICUOTA_PORCENTAJE[alicuotaId] / 100;
    const impNeto = +(importeTotal / (1 + tasa)).toFixed(2);
    const impIVA = +(importeTotal - impNeto).toFixed(2);
    return { impNeto, impIVA, impTotal: importeTotal };
  }
  return { impNeto: importeTotal, impIVA: 0, impTotal: importeTotal };
}
