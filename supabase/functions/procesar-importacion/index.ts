import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ImportProcessor } from './services/ImportProcessor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { id_importacion } = await req.json();
    
    if (!id_importacion) {
      throw new Error('id_importacion es requerido');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. Obtener registro de la tabla importaciones
    const { data: record, error: fetchError } = await supabaseClient
      .from('importaciones')
      .select('*')
      .eq('id', id_importacion)
      .single();

    if (fetchError || !record) {
      throw new Error(`Importación no encontrada o error de permisos: ${fetchError?.message}`);
    }

    // 2. Marcar como Procesando
    await supabaseClient
      .from('importaciones')
      .update({ estado: 'Procesando' })
      .eq('id', id_importacion);

    try {
      // 3. Descargar archivo
      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from('importaciones')
        .download(record.ruta_storage);

      if (downloadError || !fileData) {
        throw new Error(`No se pudo descargar el archivo físico: ${downloadError?.message}`);
      }

      const arrayBuffer = await fileData.arrayBuffer();

      // 4. Procesar el archivo a formato intermedio JSON
      const resultadoJSON = await ImportProcessor.processFile(
        arrayBuffer, 
        record.nombre_archivo, 
        record.tipo_archivo
      );

      // 5. Actualizar registro final con éxito
      await supabaseClient
        .from('importaciones')
        .update({ 
          estado: 'Procesado',
          resultado_procesamiento: resultadoJSON,
          cantidad_registros: resultadoJSON.estadisticas.filas,
          error: null
        })
        .eq('id', id_importacion);

      return new Response(JSON.stringify({ success: true, estado: 'Procesado', data: resultadoJSON }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (processingError: any) {
      console.error('Error durante el procesamiento:', processingError);
      // Guardar el error en DB
      await supabaseClient
        .from('importaciones')
        .update({ 
          estado: 'Error',
          error: processingError.message || 'Error inesperado durante el procesamiento'
        })
        .eq('id', id_importacion);

      throw processingError;
    }

  } catch (error: any) {
    console.error('Error global:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
