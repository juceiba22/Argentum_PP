import { supabase } from '../services/supabaseClient';

// "Comprar la licencia" desde la landing obliga a crear la cuenta primero (la
// licencia es por carnicería). Recordamos esa intención para que, al entrar
// por primera vez, el usuario caiga directo en el pago y no en el POS.
//  - localStorage: cubre el alta con Google y con email en el mismo navegador.
//  - user_metadata.intencion_compra: cubre confirmar el email en otro equipo.
const CLAVE = 'argentum_intencion_compra';

export const marcarIntencionCompra = () => {
  try { localStorage.setItem(CLAVE, '1'); } catch { /* sin storage: solo queda la metadata */ }
};

export const hayIntencionCompra = (user) => {
  let local = false;
  try { local = localStorage.getItem(CLAVE) === '1'; } catch { /* idem */ }
  return local || Boolean(user?.user_metadata?.intencion_compra);
};

export const limpiarIntencionCompra = async (user) => {
  try { localStorage.removeItem(CLAVE); } catch { /* idem */ }
  if (user?.user_metadata?.intencion_compra) {
    await supabase.auth.updateUser({ data: { intencion_compra: null } }).catch(() => {});
  }
};
