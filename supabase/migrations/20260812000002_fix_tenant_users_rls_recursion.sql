-- ==============================================================================
-- FIX DE RLS: recursión infinita en tenant_users
-- Archivo: 20260812000002_fix_tenant_users_rls_recursion.sql
-- ==============================================================================
--
-- CONTEXTO: confirmado empíricamente (sesión real de un usuario de prueba,
-- no service role) que un simple `SELECT * FROM tenant_users WHERE user_id =
-- auth.uid()` -sin tocar ninguna otra tabla- devuelve:
--   "infinite recursion detected in policy for relation tenant_users" (42P17)
--
-- Esto es un bug PREEXISTENTE, anterior a cualquier cambio reciente sobre
-- tenants: explica por qué hay 36 filas en tenants pero solo 2 en
-- tenant_users (esas 2 se insertaron via script SQL corriendo como
-- postgres/superuser, que bypassea RLS -ver 20260811000001_restore_admin_
-- tenant.sql-, nunca desde la app). Cada usuario nuevo terminaba con un
-- tenant huerfano en cada login porque el INSERT/SELECT contra tenant_users
-- desde la app (rol authenticated) fallaba siempre, en silencio.
--
-- Ninguna policy de tenant_users en los migrations de este repo referencia
-- a la propia tenant_users ni a ninguna otra tabla (son todas `user_id =
-- auth.uid()` simples), así que la policy que causa la recursión real fue
-- creada a mano en el Studio de Supabase y nunca quedó documentada en el
-- repo -mismo patron que ya paso con licencias_activas-. En vez de adivinar
-- su nombre, este script descubre y borra TODAS las policies existentes de
-- tenant_users y tenants dinámicamente (via pg_policies), sea cual sea su
-- origen, y las reconstruye limpias.
-- ==============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tenant_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_users', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tenants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenants', pol.policyname);
  END LOOP;
END $$;

-- ============================== tenant_users ==============================
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_users_select_propio"
  ON public.tenant_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "tenant_users_insert_propio"
  ON public.tenant_users FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_users_update_propio"
  ON public.tenant_users FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================== tenants ==============================
-- Mismas reglas que la migracion 20260812000001, reconstruidas acá porque
-- el DO block de arriba también las borró (junto con cualquier policy
-- suelta creada a mano que no supiéramos que existía).
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select_propio_o_admin_principal"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
    OR (auth.jwt() ->> 'email') = 'admin@argentum.com'
  );

CREATE POLICY "tenants_insert_autenticados"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "tenants_update_propio"
  ON public.tenants FOR UPDATE TO authenticated
  USING (id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
