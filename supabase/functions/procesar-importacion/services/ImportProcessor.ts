import { CsvProcessor } from "./CsvProcessor.ts";
import { ExcelProcessor } from "./ExcelProcessor.ts";
import { PdfProcessor } from "./PdfProcessor.ts";

export class ImportProcessor {
  static async processFile(arrayBuffer: ArrayBuffer, fileName: string, fileType: string) {
    const ext = fileType.toLowerCase() || fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (ext) {
      case 'csv':
        return await CsvProcessor.process(arrayBuffer);
      case 'xls':
      case 'xlsx':
        return ExcelProcessor.process(arrayBuffer, ext);
      case 'pdf':
        return await PdfProcessor.process(arrayBuffer);
      default:
        throw new Error(`Formato de archivo no soportado: ${ext}`);
    }
  }
}
