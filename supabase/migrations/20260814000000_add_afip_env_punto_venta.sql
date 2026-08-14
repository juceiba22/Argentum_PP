-- Migration: 20260814000000_add_afip_env_punto_venta.sql
-- ConfiguracionFiscal.jsx y api/arca/afip-client.ts leen/escriben
-- tenants.afip_env y tenants.afip_punto_de_venta, pero ninguna migracion
-- del repo los creaba (20260810000000_delegacion_afip.sql solo agrego
-- afip_cuit_delegado y afip_delegacion_verificada). Si estas columnas no
-- existen en la base real, el primer "Guardar Configuracion" de cualquier
-- comercio en la pantalla de ARCA falla con un error de Postgres antes de
-- llegar siquiera a hablar con AFIP. ADD COLUMN IF NOT EXISTS lo hace
-- idempotente: no rompe nada si ya existian.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS afip_punto_de_venta INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS afip_env TEXT NOT NULL DEFAULT 'development';
