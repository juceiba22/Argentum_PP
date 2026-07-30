export type EstadoImportacion = 'Pendiente' | 'Procesando' | 'Procesado' | 'Error';
export type OrigenImportacion = 'BANCO' | 'ARCA' | 'PAYWAY' | 'MERCADOPAGO' | 'OTRO';

export interface ReporteGemini {
  resumen: string;
  total_operaciones?: number;
  monto_total_ingresos?: number;
  monto_total_egresos?: number;
  hallazgos_clave?: string[];
  alertas?: string[];
  anomalias?: string[];
}

export interface Importacion {
  id: string;
  usuario_id: string;
  origen: OrigenImportacion;
  tipo_archivo: string;
  nombre_archivo: string;
  ruta_storage: string;
  tamano: number;
  estado: EstadoImportacion;
  cantidad_registros: number;
  resultado_procesamiento: ReporteGemini | null;
  metadata: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchivoImportado {
  file: File;
  origen: OrigenImportacion;
}

export interface ResultadoSubida {
  success: boolean;
  data?: Importacion;
  error?: string;
}
