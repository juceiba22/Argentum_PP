-- Migration: 20260811000003_rubro_and_starter_products.sql
-- Agregar columna de Rubro a la tabla tenants

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS rubro TEXT DEFAULT 'Carnicería';
