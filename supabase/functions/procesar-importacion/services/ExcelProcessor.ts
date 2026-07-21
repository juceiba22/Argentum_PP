import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

export class ExcelProcessor {
  static process(arrayBuffer: ArrayBuffer, tipo: string) {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const hojas = workbook.SheetNames;
      let allColumnas: any[] = [];
      let allFilas: any[] = [];
      
      if (hojas.length > 0) {
        const sheetName = hojas[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        allFilas = json;
        if (json.length > 0) {
          allColumnas = json[0].map(String);
          allFilas = json.slice(1);
        }
      }

      return {
        tipo: tipo.toUpperCase(),
        estructura: {
          columnas: allColumnas,
          filas: allFilas,
          texto: "",
          paginas: hojas.length,
          nombres_hojas: hojas
        },
        estadisticas: {
          filas: allFilas.length + (allColumnas.length > 0 ? 1 : 0),
          columnas: allColumnas.length,
          caracteres: 0
        }
      };
    } catch (error: any) {
      throw new Error(`Error al procesar Excel: ${error.message}`);
    }
  }
}
