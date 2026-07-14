import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Testeando insert publico...");
  const { data, error } = await supabase
    .from('pedidos')
    .insert([{
      estado: 'Pendiente',
      total: 5000,
      medio_pago: 'A convenir',
      notas: 'Prueba desde script',
    }])
    .select()
    .single();
    
  if (error) {
    console.error("Error al insertar en pedidos:", error);
  } else {
    console.log("Exito pedidos:", data);
  }
}

test();
