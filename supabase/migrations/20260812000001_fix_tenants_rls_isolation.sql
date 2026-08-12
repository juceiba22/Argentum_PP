-- ==============================================================================
-- FIX DE RLS: aislamiento real de la tabla tenants
-- Archivo: 20260812000001_fix_tenants_rls_isolation.sql
-- ==============================================================================
--
-- CONTEXTO: las policies de SELECT y UPDATE sobre public.tenants usaban
-- USING (true) para el rol "authenticated". Eso significa que CUALQUIER
-- usuario logueado (incluido un registro de trial gratuito recien creado)
-- podia leer y escribir la fila de CUALQUIER OTRO tenant del sistema,
-- incluyendo mp_access_token / mp_point_device_id (credenciales reales de
-- Mercado Pago Point en texto plano) y afip_cuit_delegado. Con eso, un
-- usuario cualquiera podia:
--   - Leer las credenciales de MP de todos los comercios de la plataforma.
--   - Sobreescribir el mp_access_token/mp_point_device_id de OTRO comercio
--     con el suyo propio, redirigiendo los cobros de esa terminal Point.
--   - Tocar is_active, trial_ends_at, afip_cuit_delegado, etc. de cualquiera.
--
-- Este script restringe SELECT y UPDATE a los tenants a los que el usuario
-- esta vinculado via tenant_users (mismo patron que ya se usa correctamente
-- en la propia tabla tenant_users). Se preserva una excepcion de SOLO
-- LECTURA para el admin principal (ADMIN_PRINCIPAL_EMAIL en AuthContext.jsx
-- del frontend), que necesita poder ubicar el tenant historico mas antiguo
-- ANTES de tener un vinculo en tenant_users.
--
-- INSERT queda sin cambios (WITH CHECK true): el alta de un tenant nuevo
-- ocurre antes de que exista ese vinculo, y un INSERT no puede pisar datos
-- de un tenant existente (choca con la primary key).
--
-- IMPORTANTE: esto NO alcanza para cerrar el hueco del todo. Los endpoints
-- serverless de /api/mercadopago/* y /api/arca/* usan la Service Role Key,
-- que bypassea RLS por diseno de Supabase, y hoy no validan que quien llama
-- este autorizado para el tenantId que mandan. Ese es un fix aparte
-- (verificar sesion + pertenencia al tenant en cada endpoint).
-- ==============================================================================

DROP POLICY IF EXISTS "Permitir lectura de tenants a usuarios autenticados" ON public.tenants;
DROP POLICY IF EXISTS "Lectura de tenants a autenticados" ON public.tenants;
DROP POLICY IF EXISTS "Permitir actualizacion de tenants propios" ON public.tenants;

CREATE POLICY "tenants_select_propio_o_admin_principal"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
    OR (auth.jwt() ->> 'email') = 'admin@argentum.com'
  );

CREATE POLICY "tenants_update_propio"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
