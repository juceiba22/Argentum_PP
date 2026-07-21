// Using standard PDF.js in Deno compatible way (bypassing DOM issues)
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.js";

// Disable workers to run cleanly in Edge environments
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

export class PdfProcessor {
  static async process(arrayBuffer: ArrayBuffer) {
    try {
      const loadingTask = pdfjsLib.getDocument({ 
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: false
      });
      
      const pdf = await loadingTask.promise;
      let fullText = "";
      const numPages = pdf.numPages;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      return {
        tipo: "PDF",
        estructura: {
          columnas: [],
          filas: [],
          texto: fullText.trim(),
          paginas: numPages
        },
        estadisticas: {
          filas: 0,
          columnas: 0,
          caracteres: fullText.length
        }
      };
    } catch (error: any) {
      throw new Error(`Error al procesar PDF: ${error.message}`);
    }
  }
}
