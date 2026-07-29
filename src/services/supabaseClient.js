import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan variables de entorno de Supabase. Asegúrate de configurar .env correctamente.');
}

// Lock "no bloqueante": reemplaza el navigatorLock por defecto de supabase-js
// (basado en navigator.locks), que puede quedar tomado indefinidamente por una
// pestaña y bloquear a todas las demás (incluyendo pestañas nuevas y refrescos).
// Esta versión simplemente ejecuta la función sin esperar ningún lock global,
// evitando el deadlock a costa de una sincronización estricta entre pestañas
// (aceptable para la mayoría de apps de un solo usuario/sesión por dispositivo).
const noopLock = async (_name, _acquireTimeout, fn) => {
  return await fn();
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: noopLock,
  },
});