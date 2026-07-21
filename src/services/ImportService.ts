import { supabase } from './supabaseClient';
import { 
  Importacion, 
  ArchivoImportado, 
  ResultadoSubida,
  OrigenImportacion
} from '../types/importaciones';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXTENSIONS = ['csv', 'xls', 'xlsx', 'pdf'];

export class ImportService {
  /**
   * Obtiene la lista de importaciones del usuario autenticado
   */
  static async getImportaciones(userId: string): Promise<Importacion[]> {
    try {
      const { data, error } = await supabase
        .from('importaciones')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching importaciones (DB):', error.message);
        throw new Error('Error al obtener el historial de importaciones.');
      }
      return data as Importacion[];
    } catch (err: any) {
      console.error('getImportaciones failed:', err);
      throw err;
    }
  }

  /**
   * Elimina una importación (Storage + DB en "transacción" lógica)
   */
  static async deleteImportacion(importacion: Importacion): Promise<void> {
    try {
      // 1. Eliminar de Storage
      const { error: storageError } = await supabase.storage
        .from('importaciones')
        .remove([importacion.ruta_storage]);

      if (storageError) {
        console.error('Error removing file from storage:', storageError.message);
        throw new Error('No se pudo eliminar el archivo físico asociado.');
      }

      // 2. Eliminar de DB
      const { error: dbError } = await supabase
        .from('importaciones')
        .delete()
        .eq('id', importacion.id)
        .eq('usuario_id', importacion.usuario_id);

      if (dbError) {
        console.error('Error deleting record from DB:', dbError.message);
        throw new Error('No se pudo eliminar el registro de la base de datos.');
      }
    } catch (err: any) {
      console.error('deleteImportacion failed:', err);
      throw err;
    }
  }

  /**
   * Valida un archivo antes de intentar subirlo
   */
  static validateFile(file: File): string | null {
    if (!file) return 'No se seleccionó ningún archivo.';
    
    if (file.size > MAX_FILE_SIZE) {
      return `El archivo supera el tamaño máximo permitido de 20MB.`;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Formato inválido. Formatos permitidos: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}.`;
    }

    return null; // Sin errores
  }

  /**
   * Sube un archivo a Storage y crea su registro en DB
   */
  static async uploadFile(
    archivo: ArchivoImportado, 
    userId: string, 
    onProgress?: (progress: number) => void
  ): Promise<ResultadoSubida> {
    try {
      // Validación previa
      const validationError = this.validateFile(archivo.file);
      if (validationError) {
        return { success: false, error: validationError };
      }

      const extension = archivo.file.name.split('.').pop()?.toLowerCase() || '';
      
      // Generar UUID y estructura: usuario_id/año/mes/uuid-nombre_original.ext
      const uuid = crypto.randomUUID();
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      const cleanFileName = archivo.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const storagePath = `${userId}/${year}/${month}/${uuid}-${cleanFileName}`;

      // 1. Subir a Storage
      // Como el onUploadProgress no está soportado uniformemente en la versión JS estándar para FormData 
      // y fetch, simulamos o dependemos de una subida rápida. Supabase storage JS no soporta 
      // de forma nativa progress bar en upload regular. Usaremos una aproximación o simplemente sin tracking
      // real si no está soportado.
      
      // Para simular el progreso ya que no hay soporte nativo en upload() de supabase-js
      if (onProgress) onProgress(20);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('importaciones')
        .upload(storagePath, archivo.file, {
          cacheControl: '3600',
          upsert: false // Nunca sobrescribir
        });

      if (uploadError) {
        console.error('Error uploading file to storage:', uploadError.message);
        throw new Error('Error al subir el archivo al almacenamiento seguro.');
      }
      
      if (onProgress) onProgress(70);

      // 2. Crear registro en DB
      const record = {
        usuario_id: userId,
        origen: archivo.origen,
        tipo_archivo: extension.toUpperCase(),
        nombre_archivo: archivo.file.name,
        ruta_storage: uploadData.path,
        tamano: archivo.file.size,
        estado: 'Pendiente' as const,
        cantidad_registros: 0,
        resultado_procesamiento: null,
        metadata: null,
        error: null
      };

      const { data: dbData, error: dbError } = await supabase
        .from('importaciones')
        .insert([record])
        .select('*')
        .single();

      if (dbError) {
        console.error('Error inserting importacion to DB:', dbError.message);
        // Intentar limpiar storage si la DB falla
        await supabase.storage.from('importaciones').remove([uploadData.path]);
        throw new Error('El archivo fue subido pero hubo un error al registrarlo en la base de datos.');
      }

      if (onProgress) onProgress(100);

      return { success: true, data: dbData as Importacion };

    } catch (err: any) {
      console.error('uploadFile failed:', err);
      return { success: false, error: err.message || 'Ocurrió un error inesperado al subir el archivo.' };
    }
  }

  /**
   * Obtiene la URL firmada para ver/descargar el archivo
   */
  static async getSignedUrl(ruta_storage: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('importaciones')
      .createSignedUrl(ruta_storage, 60); // 1 minuto de validez

    if (error || !data) {
      console.error('Error creating signed URL:', error?.message);
      throw new Error('No se pudo generar el enlace de descarga.');
    }
    
    return data.signedUrl;
  }
}
