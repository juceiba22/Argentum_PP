import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { importacion_id } = await req.json()
    if (!importacion_id) {
      throw new Error('importacion_id es requerido')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Obtener registro
    const { data: record, error: fetchError } = await supabaseClient
      .from('importaciones_bancarias')
      .select('*')
      .eq('id', importacion_id)
      .single()

    if (fetchError || !record) {
      throw new Error('Importación no encontrada')
    }

    // 2. Marcar como Procesando
    await supabaseClient
      .from('importaciones_bancarias')
      .update({ estado: 'Procesando' })
      .eq('id', importacion_id)

    // 3. Descargar archivo
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('importaciones')
      .download(record.ruta_storage)

    if (downloadError || !fileData) {
      throw new Error('No se pudo descargar el archivo')
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const tipo = record.tipo_archivo.toLowerCase()
    
    let cantidadFilas = 0
    let columnasEncontradas: string[] = []
    let textoExtraido = ''
    let erroresEncontrados: string[] = []

    try {
      if (tipo === 'csv' || record.nombre_archivo.toLowerCase().endsWith('.csv')) {
        const text = new TextDecoder().decode(arrayBuffer)
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        cantidadFilas = lines.length
        if (cantidadFilas > 0) {
          columnasEncontradas = lines[0].split(',')
        }
      } else if (tipo === 'xlsx' || tipo === 'xls' || record.nombre_archivo.toLowerCase().match(/\.xlsx?$/)) {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        cantidadFilas = json.length
        if (cantidadFilas > 0) {
          columnasEncontradas = json[0].map(String)
        }
      } else if (tipo === 'pdf' || record.nombre_archivo.toLowerCase().endsWith('.pdf')) {
        // En Deno extraer texto nativamente de PDF es complejo sin librerias pesadas.
        // Haremos un mock o extracción simple de prueba.
        textoExtraido = "Extracción de PDF no implementada completamente en Edge aún."
        cantidadFilas = 0
      } else {
        throw new Error('Tipo de archivo no soportado')
      }
    } catch (parseError: any) {
      erroresEncontrados.push(parseError.message)
    }

    const resultado = {
      tipo_detectado: tipo,
      cantidad_filas: cantidadFilas,
      columnas_encontradas: columnasEncontradas,
      texto_extraido: textoExtraido,
      errores: erroresEncontrados
    }

    const estadoFinal = erroresEncontrados.length > 0 ? 'Error' : 'Procesado'

    // 4. Actualizar registro final
    await supabaseClient
      .from('importaciones_bancarias')
      .update({ 
        estado: estadoFinal,
        resultado_procesamiento: resultado,
        cantidad_movimientos: cantidadFilas
      })
      .eq('id', importacion_id)

    return new Response(JSON.stringify({ success: true, estado: estadoFinal, resultado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
