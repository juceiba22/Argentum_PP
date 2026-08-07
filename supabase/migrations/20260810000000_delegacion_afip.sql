-- Migration: 20260810000000_delegacion_afip.sql
-- Modificación de la tabla tenants para soporte de Delegación AFIP / ARCA

ALTER TABLE public.tenants
  DROP COLUMN IF EXISTS afip_cert,
  DROP COLUMN IF EXISTS afip_private_key;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS afip_cuit_delegado TEXT,
  ADD COLUMN IF NOT EXISTS afip_delegacion_verificada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS afip_delegacion_verificada_at TIMESTAMPTZ;
