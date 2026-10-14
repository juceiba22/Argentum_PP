import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con la Service Role Key, compartido por todas las
 * funciones de /api.
 *
 * Se crea recién en el primer uso (no al importar el módulo): antes cada
 * archivo hacía createClient() a nivel de módulo y, si faltaba la variable de
 * entorno, la función entera explotaba al cargar (FUNCTION_INVOCATION_FAILED
 * en Vercel, sin ningún mensaje útil). Ahora el error llega al handler como
 * una excepción normal con el nombre de la variable que falta.
 */
let cliente = null;

export function getSupabaseAdmin() {
  if (cliente) return cliente;

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim();

  if (!url || !key) {
    throw new Error(
      `Configuración incompleta en el servidor: falta ${!url ? 'SUPABASE_URL (o VITE_SUPABASE_URL)' : 'SUPABASE_SERVICE_ROLE_KEY'} en las variables de entorno de Vercel (Production).`
    );
  }

  cliente = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}

// Mismo uso que un cliente normal (supabase.from(...), supabase.auth...),
// pero sin conectarse hasta la primera llamada.
export const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    const real = getSupabaseAdmin();
    const valor = real[prop];
    return typeof valor === 'function' ? valor.bind(real) : valor;
  }
});
