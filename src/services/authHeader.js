import { supabase } from './supabaseClient';

// Los endpoints de /api/mercadopago y /api/arca verifican este header contra
// tenant_users (ver api/_shared/verifyTenantAuth.js) antes de operar en
// nombre de un tenant. Sin él, el request se rechaza con 401.
export const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};
