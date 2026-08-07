-- Migration: 20260810000001_mercadopago_point_tenant.sql
-- Soporte multi-tenant para terminales físicas Mercado Pago Point

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS mp_access_token TEXT,
  ADD COLUMN IF NOT EXISTS mp_point_device_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_integracion_verificada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mp_integracion_verificada_at TIMESTAMPTZ;
