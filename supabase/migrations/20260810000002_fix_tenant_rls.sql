-- Migration: 20260810000002_fix_tenant_rls.sql
-- Asegura que usuarios autenticados puedan consultar y vincular su tenant_user e insertar su comercio inicial sin ser bloqueados por RLS.

-- 1. Habilitar RLS en la tabla tenants si no estaba activo
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Política de lectura para tenants (usuarios autenticados pueden ver su tenant)
DROP POLICY IF EXISTS "Permitir lectura de tenants a usuarios autenticados" ON public.tenants;
CREATE POLICY "Permitir lectura de tenants a usuarios autenticados"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de inserción para auto-creación de tenants nuevos
DROP POLICY IF EXISTS "Permitir creacion de tenants a usuarios autenticados" ON public.tenants;
CREATE POLICY "Permitir creacion de tenants a usuarios autenticados"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Habilitar RLS en tenant_users
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- Política de lectura para tenant_users
DROP POLICY IF EXISTS "Permitir lectura de tenant_users al propio usuario" ON public.tenant_users;
CREATE POLICY "Permitir lectura de tenant_users al propio usuario"
  ON public.tenant_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Política de inserción para vinculación inicial de tenant_users
DROP POLICY IF EXISTS "Permitir vinculacion de tenant_users al propio usuario" ON public.tenant_users;
CREATE POLICY "Permitir vinculacion de tenant_users al propio usuario"
  ON public.tenant_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
