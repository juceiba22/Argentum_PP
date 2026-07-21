import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

export class CsvProcessor {
  static async process(arrayBuffer: ArrayBuffer) {
    try {
      // Intentar decodificar como UTF-8 primero
      let text = new TextDecoder("utf-8").decode(arrayBuffer);
      
      // Parsear
      const rows = parse(text, { skipFirstRow: false });
      
      // Estructura
      const columnas = rows.length > 0 ? rows[0] : [];
      const filas = rows.length > 1 ? rows.slice(1) : [];
      
      return {
        tipo: "CSV",
        estructura: {
          columnas: columnas,
          filas: filas,
          texto: "",
          paginas: 0
        },
        estadisticas: {
          filas: rows.length,
          columnas: columnas.length,
          caracteres: text.length
        }
      };
    } catch (error: any) {
      throw new Error(`Error al procesar CSV: ${error.message}`);
    }
  }
}
