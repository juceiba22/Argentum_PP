-- ==============================================================================
-- LICENCIAS ANUALES POR CÓDIGO DE 16 DÍGITOS
-- Archivo: 20261014000000_licencias_por_codigo.sql
-- ==============================================================================
--
-- Modelo:
--   - licencias: cada fila es un código de 16 dígitos que vale N meses
--     (12 por defecto). Lo generan los administradores de la plataforma
--     (venta manual: transferencia, efectivo) o el webhook de Mercado Pago
--     (venta online, que además lo activa sola en la carnicería que pagó).
--   - Una carnicería tiene acceso pago mientras tenga alguna licencia
--     'activada' con valida_hasta >= now(). Activar un código nuevo antes de
--     que venza el anterior lo encadena: arranca cuando termina el vigente.
--   - licencias_ordenes: cada intento de compra por Mercado Pago. Su id es el
--     external_reference de la preferencia.
--
-- Nada de esto se escribe desde el cliente: no hay policies de
-- INSERT/UPDATE/DELETE. Todo pasa por funciones SECURITY DEFINER que validan
-- quién llama. Las licencias por email de licencias_activas (Argentum-
-- Comercios) siguen valiendo; esto no las toca.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Administradores de la plataforma (los únicos que generan códigos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plataforma_admins (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plataforma_admins ENABLE ROW LEVEL SECURITY;
-- Sin policies: nadie la lee ni la escribe desde el cliente.

INSERT INTO public.plataforma_admins (email) VALUES
  ('admin@argentum.com'),
  ('juceiba22@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.es_admin_plataforma()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plataforma_admins
    WHERE email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. Tablas
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.licencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[0-9]{16}$'),
  meses integer NOT NULL DEFAULT 12 CHECK (meses BETWEEN 1 AND 36),
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'activada', 'revocada')),
  origen text NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'mercadopago')),
  notas text,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  activada_por uuid,
  activada_en timestamptz,
  valida_desde timestamptz,
  valida_hasta timestamptz,
  creada_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS licencias_tenant_idx ON public.licencias (tenant_id, estado, valida_hasta);

CREATE TABLE IF NOT EXISTS public.licencias_ordenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  monto numeric(12, 2) NOT NULL,
  meses integer NOT NULL DEFAULT 12,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'rechazada')),
  mp_payment_id text UNIQUE,
  licencia_id uuid REFERENCES public.licencias(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  pagada_en timestamptz
);

-- Intentos fallidos de activación, para frenar a quien pruebe códigos al azar.
CREATE TABLE IF NOT EXISTS public.licencias_intentos (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS licencias_intentos_user_idx ON public.licencias_intentos (user_id, created_at);

ALTER TABLE public.licencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licencias_ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licencias_intentos ENABLE ROW LEVEL SECURITY;

-- Cada carnicería ve solo sus licencias y sus órdenes (para mostrar la
-- vigencia y el comprobante). Los códigos 'disponible' no tienen tenant, así
-- que nunca son visibles para un comercio.
DROP POLICY IF EXISTS "licencias_select_propias" ON public.licencias;
CREATE POLICY "licencias_select_propias"
  ON public.licencias FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "licencias_ordenes_select_propias" ON public.licencias_ordenes;
CREATE POLICY "licencias_ordenes_select_propias"
  ON public.licencias_ordenes FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- ------------------------------------------------------------------------------
-- 3. Generación de códigos
-- ------------------------------------------------------------------------------
-- 16 dígitos uniformes a partir de bytes criptográficamente seguros
-- (descarta bytes >= 250 para no sesgar hacia los dígitos bajos).
CREATE OR REPLACE FUNCTION public._nuevo_codigo_licencia()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions
AS $$
DECLARE
  v_codigo text;
  v_bytes bytea;
  v_byte int;
  i int;
BEGIN
  LOOP
    v_codigo := '';
    WHILE length(v_codigo) < 16 LOOP
      v_bytes := gen_random_bytes(32);
      FOR i IN 0..31 LOOP
        v_byte := get_byte(v_bytes, i);
        IF v_byte < 250 AND length(v_codigo) < 16 THEN
          v_codigo := v_codigo || (v_byte % 10)::text;
        END IF;
      END LOOP;
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.licencias WHERE codigo = v_codigo);
  END LOOP;
  RETURN v_codigo;
END;
$$;

REVOKE ALL ON FUNCTION public._nuevo_codigo_licencia() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.generar_licencias(
  p_cantidad integer DEFAULT 1,
  p_meses integer DEFAULT 12,
  p_notas text DEFAULT NULL
)
RETURNS TABLE (id uuid, codigo text, meses integer, notas text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad < 1 OR p_cantidad > 50 THEN
    RAISE EXCEPTION 'La cantidad debe estar entre 1 y 50';
  END IF;

  FOR i IN 1..p_cantidad LOOP
    RETURN QUERY
    INSERT INTO public.licencias (codigo, meses, notas, origen, creada_por)
    VALUES (public._nuevo_codigo_licencia(), coalesce(p_meses, 12), p_notas, 'manual', lower(auth.jwt() ->> 'email'))
    RETURNING licencias.id, licencias.codigo, licencias.meses, licencias.notas, licencias.created_at;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_licencias()
RETURNS TABLE (
  id uuid, codigo text, meses integer, estado text, origen text, notas text,
  tenant_id uuid, nombre_comercio text, activada_en timestamptz,
  valida_desde timestamptz, valida_hasta timestamptz, creada_por text, created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.id, l.codigo, l.meses, l.estado, l.origen, l.notas,
         l.tenant_id, t.nombre_comercio, l.activada_en,
         l.valida_desde, l.valida_hasta, l.creada_por, l.created_at
  FROM public.licencias l
  LEFT JOIN public.tenants t ON t.id = l.tenant_id
  ORDER BY l.created_at DESC
  LIMIT 500;
END;
$$;

CREATE OR REPLACE FUNCTION public.revocar_licencia(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  UPDATE public.licencias SET estado = 'revocada' WHERE id = p_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Activación (la usa el carnicero desde "Mi Licencia")
-- ------------------------------------------------------------------------------
-- Aplica una licencia ya bloqueada (FOR UPDATE) a un tenant, encadenándola
-- detrás de la que esté vigente. Uso interno.
CREATE OR REPLACE FUNCTION public._aplicar_licencia(p_licencia_id uuid, p_tenant_id uuid, p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meses int;
  v_desde timestamptz;
  v_hasta timestamptz;
BEGIN
  -- Serializa activaciones concurrentes del mismo tenant.
  PERFORM pg_advisory_xact_lock(hashtext('licencias:' || p_tenant_id::text));

  SELECT meses INTO v_meses FROM public.licencias WHERE id = p_licencia_id;

  SELECT greatest(now(), coalesce(max(valida_hasta), now())) INTO v_desde
  FROM public.licencias
  WHERE tenant_id = p_tenant_id AND estado = 'activada';

  v_hasta := v_desde + make_interval(months => v_meses);

  UPDATE public.licencias
  SET estado = 'activada',
      tenant_id = p_tenant_id,
      activada_por = p_user_id,
      activada_en = now(),
      valida_desde = v_desde,
      valida_hasta = v_hasta
  WHERE id = p_licencia_id;

  RETURN v_hasta;
END;
$$;

REVOKE ALL ON FUNCTION public._aplicar_licencia(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Devuelve {ok, valida_hasta} o {ok:false, error}. No lanza excepciones a
-- propósito: un RAISE desharía el registro del intento fallido y el límite
-- de intentos no serviría.
CREATE OR REPLACE FUNCTION public.activar_licencia(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant uuid;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '[^0-9]', '', 'g');
  v_licencia public.licencias%ROWTYPE;
  v_hasta timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tenés que iniciar sesión.');
  END IF;

  SELECT tenant_id INTO v_tenant
  FROM public.tenant_users
  WHERE user_id = v_user AND coalesce(role, 'admin') <> 'ventas'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo el dueño de la carnicería puede activar una licencia.');
  END IF;

  IF (SELECT count(*) FROM public.licencias_intentos
      WHERE user_id = v_user AND created_at > now() - interval '1 hour') >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Demasiados intentos fallidos. Probá de nuevo en una hora.');
  END IF;

  SELECT * INTO v_licencia
  FROM public.licencias
  WHERE codigo = v_codigo AND estado = 'disponible'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.licencias_intentos (user_id) VALUES (v_user);
    RETURN jsonb_build_object('ok', false, 'error', 'El código no es válido o ya fue usado.');
  END IF;

  v_hasta := public._aplicar_licencia(v_licencia.id, v_tenant, v_user);

  RETURN jsonb_build_object('ok', true, 'valida_hasta', v_hasta, 'meses', v_licencia.meses);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Emisión por pago de Mercado Pago (solo el webhook, con Service Role)
-- ------------------------------------------------------------------------------
-- Idempotente: si MP reenvía la notificación, devuelve la licencia ya emitida.
CREATE OR REPLACE FUNCTION public.emitir_licencia_por_pago(
  p_orden_id uuid,
  p_mp_payment_id text,
  p_monto numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orden public.licencias_ordenes%ROWTYPE;
  v_licencia_id uuid;
  v_codigo text;
  v_hasta timestamptz;
BEGIN
  SELECT * INTO v_orden FROM public.licencias_ordenes WHERE id = p_orden_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden inexistente: %', p_orden_id;
  END IF;

  IF v_orden.licencia_id IS NOT NULL THEN
    SELECT codigo, valida_hasta INTO v_codigo, v_hasta FROM public.licencias WHERE id = v_orden.licencia_id;
    RETURN jsonb_build_object('codigo', v_codigo, 'valida_hasta', v_hasta, 'ya_emitida', true, 'email', v_orden.email);
  END IF;

  IF p_monto < v_orden.monto THEN
    RAISE EXCEPTION 'Monto pagado (%) menor al de la orden (%)', p_monto, v_orden.monto;
  END IF;

  INSERT INTO public.licencias (codigo, meses, origen, notas, creada_por)
  VALUES (public._nuevo_codigo_licencia(), v_orden.meses, 'mercadopago', 'Pago MP ' || p_mp_payment_id, 'mercadopago')
  RETURNING id, codigo INTO v_licencia_id, v_codigo;

  v_hasta := public._aplicar_licencia(v_licencia_id, v_orden.tenant_id, v_orden.user_id);

  UPDATE public.licencias_ordenes
  SET estado = 'pagada', mp_payment_id = p_mp_payment_id, licencia_id = v_licencia_id, pagada_en = now()
  WHERE id = p_orden_id;

  RETURN jsonb_build_object('codigo', v_codigo, 'valida_hasta', v_hasta, 'ya_emitida', false, 'email', v_orden.email);
END;
$$;

REVOKE ALL ON FUNCTION public.emitir_licencia_por_pago(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emitir_licencia_por_pago(uuid, text, numeric) TO service_role;

-- ------------------------------------------------------------------------------
-- 6. Cierre: el comercio no puede extenderse la prueba ni reactivarse solo
-- ------------------------------------------------------------------------------
-- La policy "tenants_update_propio" deja que cada comercio edite su fila (la
-- usan Perfil, Config. Fiscal y Config. MP), pero eso incluía trial_ends_at
-- e is_active: cualquiera con la anon key podía darse prueba gratis eterna.
-- Desde el cliente (roles anon/authenticated) esos campos quedan fijos.
CREATE OR REPLACE FUNCTION public._proteger_campos_acceso_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_campos_acceso_tenant ON public.tenants;
CREATE TRIGGER proteger_campos_acceso_tenant
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public._proteger_campos_acceso_tenant();
