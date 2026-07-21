export class GeminiProcessor {
  static async analyze(estructuraExtraida: any, origen: string) {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
Eres un asistente experto en conciliación bancaria y contable.
Se te proporciona el contenido crudo (filas o texto) de una importación cuyo origen es: ${origen}.
Tu objetivo es analizar la información, estructurarla y devolverla ESTRICTAMENTE en formato JSON, sin comentarios adicionales ni markdown.

Estructura requerida del JSON de respuesta:
{
  "resumen": "Breve resumen del contenido del documento (ej. Extracto Banco Galicia Julio 2026)",
  "moneda": "ARS",
  "total_ingresos": 0.0,
  "total_egresos": 0.0,
  "movimientos": [
    {
      "fecha": "YYYY-MM-DD",
      "descripcion": "Detalle de la transacción",
      "importe": 0.0,
      "tipo": "INGRESO" | "EGRESO",
      "categoria_sugerida": "Proveedor" | "Venta" | "Servicio" | "Otro"
    }
  ]
}

Ten en cuenta que:
- Los montos egresos deben ser reportados como números positivos en "importe", pero indicando tipo "EGRESO".
- Si no encuentras fecha en alguna fila irrelevante (ej. encabezados), ignórala.
- Sólo devuelve JSON.

Contenido a analizar:
${JSON.stringify(estructuraExtraida).substring(0, 30000)} // Limite de seguridad
`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Error en API de Gemini: ${response.status} - ${errData}`);
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiText) {
        throw new Error("Gemini no devolvió una respuesta válida.");
      }

      const parsedJSON = JSON.parse(aiText);
      return parsedJSON;
      
    } catch (error: any) {
      console.error("GeminiProcessor Error:", error);
      throw new Error(`Fallo el procesamiento con IA: ${error.message}`);
    }
  }
}
