import { CsvProcessor } from "./CsvProcessor.ts";
import { ExcelProcessor } from "./ExcelProcessor.ts";
import { PdfProcessor } from "./PdfProcessor.ts";
import { GeminiProcessor } from "./GeminiProcessor.ts";

export class ImportProcessor {
  static async processFile(arrayBuffer: ArrayBuffer, fileName: string, fileType: string, origen: string) {
    const ext = fileType.toLowerCase() || fileName.split('.').pop()?.toLowerCase() || '';
    
    let rawStructure: any = null;

    switch (ext) {
      case 'csv':
        rawStructure = await CsvProcessor.process(arrayBuffer);
        break;
      case 'xls':
      case 'xlsx':
        rawStructure = ExcelProcessor.process(arrayBuffer, ext);
        break;
      case 'pdf':
        rawStructure = await PdfProcessor.process(arrayBuffer);
        break;
      default:
        throw new Error(`Formato de archivo no soportado: ${ext}`);
    }

    // Pasar estructura extraida a Gemini
    const enrichedData = await GeminiProcessor.analyze(rawStructure, origen);
    
    // Devolvemos lo que construyó Gemini, preservando estadisticas crudas si queremos (o solo el enrich)
    return enrichedData;
  }
}
