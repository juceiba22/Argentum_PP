import fs from 'fs';
import path from 'path';
import Client from 'ssh2-sftp-client';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente de Supabase para el backend usando process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
// Es ideal usar la Service Role Key en el backend para saltar RLS si es necesario, pero usamos Anon de fallback
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface PaywayRow {
  id_transaccion_external: string;
  fecha_operacion: string;
  monto_bruto: string;
  medio_pago: string;
  estado: string;
  terminal_id?: string;
  [key: string]: any; // Para soportar otras columnas
}

export class PaywaySftpService {
  private sftp: Client;

  constructor() {
    this.sftp = new Client();
  }

  /**
   * Limpia un string de dinero (ej. "$ 1.234,56" -> 1234.56)
   */
  private parseMonto(montoStr: string): number {
    if (!montoStr) return 0;
    
    // Remover símbolos de moneda y espacios
    let cleaned = montoStr.replace(/\$|\s/g, '');
    
    // Si tiene formato europeo/argentino (1.234,56)
    if (cleaned.includes(',') && cleaned.indexOf(',') > cleaned.indexOf('.')) {
      cleaned = cleaned.replace(/\./g, ''); // Remover puntos de miles
      cleaned = cleaned.replace(/,/g, '.'); // Cambiar coma decimal a punto
    } 
    // Si solo tiene coma como decimal sin puntos (ej 1234,56)
    else if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(/,/g, '.');
    }
    // Si tiene formato gringo (1,234.56), removemos comas de miles
    else if (cleaned.includes(',') && cleaned.indexOf('.') > cleaned.indexOf(',')) {
      cleaned = cleaned.replace(/,/g, '');
    }

    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value;
  }

  /**
   * Procesa el archivo CSV más reciente del SFTP y guarda en base de datos.
   */
  public async syncLatestTransactions(): Promise<{ success: boolean; processed: number; error?: string }> {
    try {
      const config = {
        host: process.env.PAYWAY_SFTP_HOST,
        port: parseInt(process.env.PAYWAY_SFTP_PORT || '22', 10),
        username: process.env.PAYWAY_SFTP_USER,
        password: process.env.PAYWAY_SFTP_PASS,
        debug: (msg: string) => console.log('[SFTP DEBUG]', msg),
        readyTimeout: 20000,
      };

      const remotePath = process.env.PAYWAY_SFTP_REMOTE_PATH;
      if (!remotePath) {
        throw new Error('PAYWAY_SFTP_REMOTE_PATH no está configurado en el entorno.');
      }

      console.log('Conectando al SFTP de Payway...');
      await this.sftp.connect(config);

      // Listar archivos en la ruta remota
      const fileList = await this.sftp.list(remotePath);
      
      // Filtrar solo CSVs y ordenar por fecha de modificación (el más reciente primero)
      const csvFiles = fileList
        .filter(file => file.name.endsWith('.csv'))
        .sort((a, b) => b.modifyTime - a.modifyTime);

      if (csvFiles.length === 0) {
        await this.sftp.end();
        return { success: true, processed: 0, error: 'No se encontraron archivos CSV en el SFTP.' };
      }

      const latestFile = csvFiles[0];
      const remoteFilePath = `${remotePath}/${latestFile.name}`;
      console.log(`Descargando el archivo más reciente: ${latestFile.name}`);

      // Descargar el archivo a un Buffer en memoria
      const fileBuffer = (await this.sftp.get(remoteFilePath)) as Buffer;
      
      // Parsear el CSV
      // Nota: Ajustar los nombres de las columnas en `columns` según el formato exacto de Payway
      const records: PaywayRow[] = parse(fileBuffer, {
        columns: true, // Usa la primera fila como headers
        skip_empty_lines: true,
        delimiter: [',', ';'], // Soporta coma o punto y coma
        trim: true
      });

      if (records.length > 0) {
        console.log('AUDITORÍA - Cabeceras encontradas en el CSV de Payway:', Object.keys(records[0]));
      }

      console.log(`Se encontraron ${records.length} registros en el CSV. Iniciando guardado...`);

      let processedCount = 0;

      // Iterar e insertar/upsert en la base de datos
      for (const record of records) {
        // Asegúrate de mapear las columnas reales del CSV a los campos de tu base de datos.
        // Aquí asumimos que los headers del CSV coinciden o los extraes según tu necesidad.
        
        const idExternal = record.id_transaccion_external || record.ID || record.id_transaccion;
        
        if (!idExternal) continue; // Saltar si no hay ID válido

        const montoLimpio = this.parseMonto(record.monto_bruto || record.Monto || record.importe);
        
        // Manejo básico de fecha (Ajustar según formato del CSV: DD/MM/YYYY vs YYYY-MM-DD)
        // Ejemplo asumiendo que ya viene en formato válido o se debe parsear:
        let fechaOperacion = record.fecha_operacion || record.Fecha || new Date().toISOString();

        const dataToUpsert = {
          id_transaccion_external: String(idExternal),
          fecha_operacion: new Date(fechaOperacion).toISOString(),
          monto_bruto: montoLimpio,
          medio_pago: String(record.medio_pago || record.Medio || 'Tarjeta'),
          estado: String(record.estado || record.Estado || 'Aprobado'),
          terminal_id: String(record.terminal_id || record.Terminal || '0000')
        };

        const { error } = await supabase
          .from('transacciones_tarjeta')
          .upsert(dataToUpsert, { onConflict: 'id_transaccion_external' });

        if (error) {
          console.error(`Error al hacer upsert de transacción ${idExternal}:`, error.message);
        } else {
          processedCount++;
        }
      }

      await this.sftp.end();
      return { success: true, processed: processedCount };

    } catch (error: any) {
      console.error('Error procesando SFTP Payway:', error);
      this.sftp.end().catch(() => {}); // Intentar cerrar conexión en caso de error
      return { success: false, processed: 0, error: error.message };
    }
  }

  /**
   * Lee el archivo local de prueba (mock) para probar la lógica de limpieza y BD sin SFTP.
   */
  public async syncLocalTestMock(): Promise<{ success: boolean; processed: number; error?: string }> {
    try {
      // Leer el archivo local
      const filePath = path.join(process.cwd(), 'payway_mock_movimientos.csv');
      
      if (!fs.existsSync(filePath)) {
        return { success: false, processed: 0, error: `No se encontró el archivo mock en ${filePath}` };
      }

      console.log(`Leyendo archivo mock local: ${filePath}`);
      const fileBuffer = fs.readFileSync(filePath);
      
      const records: PaywayRow[] = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        delimiter: [',', ';'],
        trim: true
      });

      console.log(`Se encontraron ${records.length} registros en el CSV mock. Iniciando guardado...`);

      let processedCount = 0;

      for (const record of records) {
        const idExternal = record.id_transaccion_external || record.ID || record.id_transaccion;
        if (!idExternal) continue;

        const montoLimpio = this.parseMonto(record.monto_bruto || record.Monto || record.importe);
        let fechaOperacion = record.fecha_operacion || record.Fecha || new Date().toISOString();

        const dataToUpsert = {
          id_transaccion_external: String(idExternal),
          fecha_operacion: new Date(fechaOperacion).toISOString(),
          monto_bruto: montoLimpio,
          medio_pago: String(record.medio_pago || record.Medio || 'Tarjeta'),
          estado: String(record.estado || record.Estado || 'Aprobado'),
          terminal_id: String(record.terminal_id || record.Terminal || '0000')
        };

        const { error } = await supabase
          .from('transacciones_tarjeta')
          .upsert(dataToUpsert, { onConflict: 'id_transaccion_external' });

        if (error) {
          console.error(`Error al hacer upsert de transacción ${idExternal} (mock):`, error.message);
        } else {
          processedCount++;
        }
      }

      return { success: true, processed: processedCount };

    } catch (error: any) {
      console.error('Error procesando mock local:', error);
      return { success: false, processed: 0, error: error.message };
    }
  }
}
