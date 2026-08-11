-- ==============================================================================
-- MIGRACIÓN DE SCHEMAS DE SUPABASE: REGISTRO Y ONBOARDING DE 6 PASOS
-- Archivo: 20260811000002_onboarding_schema.sql
-- ==============================================================================

-- 1. Agregar campos de comercio, datos fiscales y avance de onboarding a 'tenants'
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS condicion_fiscal TEXT DEFAULT 'Monotributista',
  ADD COLUMN IF NOT EXISTS domicilio_fiscal TEXT,
  ADD COLUMN IF NOT EXISTS provincia TEXT,
  ADD COLUMN IF NOT EXISTS localidad TEXT,
  ADD COLUMN IF NOT EXISTS codigo_postal TEXT,
  ADD COLUMN IF NOT EXISTS necesita_crear_pto_venta BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_paso_actual INTEGER DEFAULT 1;

-- 2. Agregar datos personales de contacto a la tabla 'tenant_users'
ALTER TABLE public.tenant_users
  ADD COLUMN IF NOT EXISTS nombre TEXT,
  ADD COLUMN IF NOT EXISTS apellido TEXT,
  ADD COLUMN IF NOT EXISTS telefono TEXT;

-- 3. Habilitar políticas RLS para permitir consulta, registro y actualización
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de tenants a usuarios autenticados" ON public.tenants;
CREATE POLICY "Permitir lectura de tenants a usuarios autenticados"
  ON public.tenants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insercion de tenants a usuarios autenticados" ON public.tenants;
CREATE POLICY "Permitir insercion de tenants a usuarios autenticados"
  ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de tenants propios" ON public.tenants;
CREATE POLICY "Permitir actualizacion de tenants propios"
  ON public.tenants FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de tenant_users al propio usuario" ON public.tenant_users;
CREATE POLICY "Permitir lectura de tenant_users al propio usuario"
  ON public.tenant_users FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Permitir vinculacion de tenant_users al propio usuario" ON public.tenant_users;
CREATE POLICY "Permitir vinculacion de tenant_users al propio usuario"
  ON public.tenant_users FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Permitir actualizacion de tenant_users al propio usuario" ON public.tenant_users;
CREATE POLICY "Permitir actualizacion de tenant_users al propio usuario"
  ON public.tenant_users FOR UPDATE TO authenticated USING (user_id = auth.uid());
