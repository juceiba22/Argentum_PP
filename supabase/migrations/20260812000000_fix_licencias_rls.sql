-- ==============================================================================
-- FIX DE RLS: licencias_activas / licencias_pagos
-- Archivo: 20260812000000_fix_licencias_rls.sql
-- ==============================================================================
--
-- CONTEXTO DEL BUG QUE ESTO ARREGLA:
-- licencias_activas tenía RLS activo con dos policies para el rol
-- "authenticated": una de SELECT y una de ALL (gestión completa). El webhook
-- de MercadoPago que activa la licencia corre server-side sin sesión de
-- usuario, así que hace sus consultas como rol "anon" — al que ninguna de
-- esas policies cubría. Resultado: el UPSERT que activa la licencia fallaba
-- SIEMPRE, en silencio (el código solo lo logueaba), y ningún comprador
-- terminaba con licencia activa aunque el pago se hubiera aprobado.
--
-- Además, la policy "ALL para authenticated" no distinguía de quién era cada
-- fila: cualquier usuario logueado en el sistema podía leer o escribir la
-- licencia de CUALQUIER email (incluida la propia, con fecha de vencimiento
-- arbitraria), autoasignándose una licencia falsa.
--
-- Este script dejar las tablas así:
--   - INSERT/UPDATE/DELETE: sin policies para anon/authenticated → quedan
--     denegados por default. Los webhooks (server-side) deben escribir con
--     la Service Role Key, que bypassa RLS por diseño de Supabase.
--   - SELECT: el usuario autenticado solo puede leer la fila de su propio
--     email (comparando contra el email del JWT).
--
-- REQUISITO PREVIO: Argentum-Comercios (el proyecto de Vercel que corre
-- api/mercadopago/webhook.js y api/mercadopago/create-preference.js) debe
-- tener configurada la variable de entorno SUPABASE_SERVICE_ROLE_KEY antes
-- de correr este script. Si no, después de este script esos endpoints
-- quedan totalmente bloqueados para escribir (ya lo estaban para
-- licencias_activas; con este script también lo van a estar para
-- licencias_pagos).
-- ==============================================================================

-- ============================== licencias_activas ==============================
ALTER TABLE public.licencias_activas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitir gestion de licencias a usuarios autenticados" ON public.licencias_activas;
DROP POLICY IF EXISTS "permitir lectura de licencias a usuarios autenticados" ON public.licencias_activas;

CREATE POLICY "licencias_activas_select_propia"
  ON public.licencias_activas
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- ============================== licencias_pagos ==============================
-- Hoy no tiene RLS: cualquiera con la anon key (pública, va en el bundle del
-- frontend) puede leer/escribir montos y estados de pago de cualquier email.
ALTER TABLE public.licencias_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "licencias_pagos_select_propia"
  ON public.licencias_pagos
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));
