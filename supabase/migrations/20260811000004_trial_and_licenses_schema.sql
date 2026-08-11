-- ==============================================================================
-- MIGRACIÓN DE SCHEMAS DE SUPABASE: PRUEBA GRATUITA DE 15 DÍAS
-- Archivo: 20260811000004_trial_and_licenses_schema.sql
-- ==============================================================================

-- Agregar columnas trial_ends_at e is_active a la tabla tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '15 days'),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
