-- 1. Agregar campos fiscales a la tabla de clientes (si no existen)
ALTER TABLE clientes 
  ADD COLUMN IF NOT EXISTS cuit text,
  ADD COLUMN IF NOT EXISTS doc_tipo integer DEFAULT 99,
  ADD COLUMN IF NOT EXISTS doc_nro text DEFAULT '0',
  ADD COLUMN IF NOT EXISTS condicion_iva text DEFAULT 'CF';

-- 2. Agregar campos de facturación electrónica a la tabla de pedidos (si no existen)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS is_fiscal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cae_number text,
  ADD COLUMN IF NOT EXISTS cae_expiration text,
  ADD COLUMN IF NOT EXISTS voucher_number text,
  ADD COLUMN IF NOT EXISTS voucher_type text,
  ADD COLUMN IF NOT EXISTS alicuota_iva numeric DEFAULT 21;

-- 3. Crear índices para optimizar las búsquedas de facturas
CREATE INDEX IF NOT EXISTS idx_pedidos_is_fiscal ON pedidos(is_fiscal);
CREATE INDEX IF NOT EXISTS idx_pedidos_voucher_number ON pedidos(voucher_number);
