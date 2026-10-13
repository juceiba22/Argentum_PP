-- ==============================================================================
-- INVITACIONES DE VENDEDORES
-- Archivo: 20261015000000_invitaciones_vendedores.sql
-- ==============================================================================
--
-- El dueño de una carnicería invita por email a sus vendedores. Cuando esa
-- persona entra por primera vez con ESE email (Google o email+contraseña),
-- provision_tenant_for_current_user la suma a la carnicería que la invitó con
-- rol 'ventas', en vez de crearle una carnicería propia.
--
-- Nada se escribe desde el cliente: todo pasa por funciones SECURITY DEFINER
-- que validan que quien llama sea el dueño (rol distinto de 'ventas').
-- Requiere 20260901000000_secure_tenant_provisioning.sql aplicada.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.invitaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  rol text NOT NULL DEFAULT 'ventas' CHECK (rol IN ('ventas')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'cancelada')),
  invitado_por uuid,
  aceptada_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  aceptada_en timestamptz
);

-- Una sola invitación pendiente por email y carnicería.
CREATE UNIQUE INDEX IF NOT EXISTS invitaciones_pendiente_unica
  ON public.invitaciones (tenant_id, email) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS invitaciones_email_idx ON public.invitaciones (email) WHERE estado = 'pendiente';

ALTER TABLE public.invitaciones ENABLE ROW LEVEL SECURITY;
-- Sin policies: se lee y escribe solo por las funciones de abajo.

-- ------------------------------------------------------------------------------
-- Carnicería de la que el usuario actual es dueño (null si no lo es).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tenant_del_dueno_actual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tu.tenant_id
  FROM public.tenant_users tu
  WHERE tu.user_id = auth.uid() AND coalesce(tu.role, 'admin') <> 'ventas'
  ORDER BY tu.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._tenant_del_dueno_actual() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- Invitar (idempotente: si ya hay una pendiente para ese email, la devuelve)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invitar_vendedor(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant uuid := public._tenant_del_dueno_actual();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
  v_usuario uuid;
BEGIN
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo el dueño de la carnicería puede invitar vendedores.');
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El email no es válido.');
  END IF;
  IF v_email = lower(coalesce(auth.jwt() ->> 'email', '')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No podés invitarte a vos mismo.');
  END IF;

  -- Una cuenta ya vinculada a una carnicería (la propia o como vendedor de
  -- otra) no puede sumarse: cada usuario pertenece a una sola.
  SELECT u.id INTO v_usuario FROM auth.users u WHERE lower(u.email) = v_email LIMIT 1;
  IF v_usuario IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = v_usuario AND tenant_id = v_tenant) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Esa persona ya forma parte de tu equipo.');
    END IF;
    IF EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = v_usuario) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ese email ya tiene una cuenta de Argentum con su propia carnicería. Pedile que use otro email.');
    END IF;
  END IF;

  SELECT id INTO v_id FROM public.invitaciones
  WHERE tenant_id = v_tenant AND email = v_email AND estado = 'pendiente';

  IF v_id IS NULL THEN
    IF (SELECT count(*) FROM public.invitaciones WHERE tenant_id = v_tenant AND estado = 'pendiente') >= 20 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Tenés demasiadas invitaciones pendientes. Cancelá alguna antes de seguir.');
    END IF;
    INSERT INTO public.invitaciones (tenant_id, email, invitado_por)
    VALUES (v_tenant, v_email, auth.uid())
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'email', v_email);
END;
$$;

-- ------------------------------------------------------------------------------
-- Equipo: miembros + invitaciones pendientes de la carnicería del dueño
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_equipo()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant uuid := public._tenant_del_dueno_actual();
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'miembros', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', tu.user_id,
        'email', u.email,
        'nombre', trim(coalesce(u.raw_user_meta_data ->> 'nombre', u.raw_user_meta_data ->> 'full_name', '') || ' ' || coalesce(u.raw_user_meta_data ->> 'apellido', '')),
        'rol', CASE WHEN coalesce(tu.role, 'admin') = 'ventas' THEN 'ventas' ELSE 'admin' END,
        'soy_yo', tu.user_id = auth.uid(),
        'desde', tu.created_at
      ) ORDER BY tu.created_at)
      FROM public.tenant_users tu
      LEFT JOIN auth.users u ON u.id = tu.user_id
      WHERE tu.tenant_id = v_tenant
    ), '[]'::jsonb),
    'invitaciones', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'created_at', i.created_at) ORDER BY i.created_at DESC)
      FROM public.invitaciones i
      WHERE i.tenant_id = v_tenant AND i.estado = 'pendiente'
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_invitacion(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invitaciones
  SET estado = 'cancelada'
  WHERE id = p_id AND estado = 'pendiente' AND tenant_id = public._tenant_del_dueno_actual();
END;
$$;

-- Solo se pueden quitar vendedores (nunca al dueño ni a uno mismo).
CREATE OR REPLACE FUNCTION public.quitar_vendedor(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public._tenant_del_dueno_actual();
BEGIN
  IF v_tenant IS NULL OR p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.tenant_users
  WHERE tenant_id = v_tenant AND user_id = p_user_id AND role = 'ventas';
END;
$$;

-- Datos públicos de una invitación para la pantalla de ingreso (sin sesión).
-- El id es un UUID aleatorio que solo viaja en el link de la invitación.
CREATE OR REPLACE FUNCTION public.ver_invitacion(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('nombre_comercio', t.nombre_comercio, 'email', i.email)
  FROM public.invitaciones i
  JOIN public.tenants t ON t.id = i.tenant_id
  WHERE i.id = p_id AND i.estado = 'pendiente';
$$;

GRANT EXECUTE ON FUNCTION public.ver_invitacion(uuid) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- Alta en el primer ingreso: igual que 20260901000000, más la rama de
-- invitación (antes de crear una carnicería nueva).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_tenant_for_current_user(
  p_nombre_comercio text,
  p_razon_social text DEFAULT NULL,
  p_rubro text DEFAULT NULL,
  p_cuit text DEFAULT '00-00000000-0',
  p_condicion_fiscal text DEFAULT 'Monotributista',
  p_domicilio_fiscal text DEFAULT NULL,
  p_provincia text DEFAULT NULL,
  p_localidad text DEFAULT NULL,
  p_codigo_postal text DEFAULT NULL,
  p_afip_punto_de_venta integer DEFAULT 1,
  p_necesita_crear_pto_venta boolean DEFAULT false,
  p_role text DEFAULT 'usuario'
) RETURNS TABLE (tenant_id uuid, is_new_tenant boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_existing_tenant_id uuid;
  v_new_tenant_id uuid;
  v_invitacion public.invitaciones%ROWTYPE;
  v_admin_principal_email constant text := 'admin@argentum.com';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  SELECT tu.tenant_id INTO v_existing_tenant_id
  FROM public.tenant_users tu
  WHERE tu.user_id = v_user_id
  ORDER BY tu.created_at ASC
  LIMIT 1;

  IF v_existing_tenant_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_tenant_id, false;
    RETURN;
  END IF;

  -- Invitación pendiente para este email: se suma como vendedor. Solo con el
  -- email verificado (confirmación por mail o Google), para que nadie pueda
  -- registrarse con un email ajeno y quedarse con la invitación.
  IF v_email <> '' AND EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = v_user_id AND u.email_confirmed_at IS NOT NULL
  ) THEN
    SELECT * INTO v_invitacion
    FROM public.invitaciones i
    WHERE i.email = v_email AND i.estado = 'pendiente'
    ORDER BY i.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      INSERT INTO public.tenant_users (tenant_id, user_id, role)
      VALUES (v_invitacion.tenant_id, v_user_id, 'ventas');

      UPDATE public.invitaciones
      SET estado = 'aceptada', aceptada_por = v_user_id, aceptada_en = now()
      WHERE id = v_invitacion.id;

      -- Otras invitaciones al mismo email ya no aplican.
      UPDATE public.invitaciones
      SET estado = 'cancelada'
      WHERE email = v_email AND estado = 'pendiente';

      RETURN QUERY SELECT v_invitacion.tenant_id, false;
      RETURN;
    END IF;
  END IF;

  IF v_email = v_admin_principal_email THEN
    SELECT t.id INTO v_existing_tenant_id
    FROM public.tenants t
    ORDER BY t.created_at ASC
    LIMIT 1;

    IF v_existing_tenant_id IS NOT NULL THEN
      INSERT INTO public.tenant_users (tenant_id, user_id, role)
      VALUES (v_existing_tenant_id, v_user_id, coalesce(p_role, 'admin'));

      RETURN QUERY SELECT v_existing_tenant_id, false;
      RETURN;
    END IF;
  END IF;

  v_new_tenant_id := gen_random_uuid();

  INSERT INTO public.tenants (
    id, nombre_comercio, razon_social, rubro, cuit, afip_cuit_delegado,
    condicion_fiscal, domicilio_fiscal, provincia, localidad, codigo_postal,
    afip_punto_de_venta, necesita_crear_pto_venta, trial_ends_at, is_active,
    onboarding_completado, onboarding_paso_actual
  ) VALUES (
    v_new_tenant_id,
    coalesce(p_nombre_comercio, 'Comercio'),
    coalesce(p_razon_social, p_nombre_comercio, 'Comercio'),
    p_rubro,
    coalesce(p_cuit, '00-00000000-0'),
    coalesce(p_cuit, '00-00000000-0'),
    coalesce(p_condicion_fiscal, 'Monotributista'),
    p_domicilio_fiscal,
    p_provincia,
    p_localidad,
    p_codigo_postal,
    coalesce(p_afip_punto_de_venta, 1),
    coalesce(p_necesita_crear_pto_venta, false),
    now() + interval '15 days',
    true,
    (p_rubro IS NOT NULL),
    CASE WHEN p_rubro IS NOT NULL THEN 4 ELSE 1 END
  );

  -- El que crea su carnicería es siempre su dueño. Los vendedores entran solo
  -- por invitación (rama de arriba); p_role ya no decide nada acá (antes un
  -- email con "ventas" creaba una carnicería sin dueño, y las altas por
  -- Google quedaban como 'usuario', ver 20261013000000).
  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (v_new_tenant_id, v_user_id, 'admin');

  RETURN QUERY SELECT v_new_tenant_id, true;
END;
$$;
