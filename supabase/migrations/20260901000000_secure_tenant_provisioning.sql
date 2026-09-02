-- ==============================================================================
-- FIX CRÍTICO DE SEGURIDAD: aislamiento entre tenants roto en tenant_users
-- Archivo: 20260901000000_secure_tenant_provisioning.sql
-- ==============================================================================
--
-- HALLAZGO (auditoría 2026-09-01): la policy "tenant_users_insert_propio"
-- (20260812000002_fix_tenant_users_rls_recursion.sql) es:
--
--   CREATE POLICY "tenant_users_insert_propio" ON public.tenant_users
--     FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
--
-- Esto SOLO valida que user_id sea el propio -- NUNCA valida tenant_id. Eso
-- significa que cualquier usuario autenticado puede, llamando directo al
-- REST API de Supabase (sin pasar por la UI de la app):
--
--   POST /rest/v1/tenant_users
--   { "user_id": "<mi propio auth.uid()>", "tenant_id": "<UUID de OTRO comercio>" }
--
-- Esa fila se inserta sin problema (pasa el WITH CHECK), y a partir de ahí
-- la policy de SELECT/UPDATE de "tenants" ("id IN (SELECT tenant_id FROM
-- tenant_users WHERE user_id = auth.uid())") le da a ese usuario acceso de
-- lectura Y escritura a TODOS los datos de ese comercio ajeno (ventas,
-- clientes, inventario, facturación, todo lo que cuelgue de tenant_id).
-- Alcanza con conocer o adivinar un UUID de tenant (se filtran fácil: por
-- ejemplo cualquier request de red de la propia app expone tenant_id en
-- headers/payloads).
--
-- FIX: mover el alta de tenant a una función SECURITY DEFINER que corre en
-- el servidor con sus propias reglas (nunca confía en un tenant_id que
-- mande el cliente) y sacarle al rol "authenticated" el permiso de INSERT
-- directo sobre tenant_users y tenants. De paso, esta función resuelve
-- también la condición de carrera del Bug #1 (productos que desaparecen):
-- todo el "verificar si ya tengo tenant -> si no, crear uno" ahora ocurre
-- en una sola transacción atómica con un advisory lock por usuario, así que
-- ni dos pestañas ni dos eventos de auth concurrentes pueden crear dos
-- tenants para el mismo usuario.
--
-- IMPORTANTE -- este archivo NO se aplicó todavía a producción. Requiere:
--   1. Revisar/probar en un proyecto de staging primero.
--   2. Actualizar src/context/AuthContext.jsx para llamar a
--      supabase.rpc('provision_tenant_for_current_user', {...}) en vez de
--      hacer el INSERT directo a "tenants" + "tenant_users" (ver comentario
--      al final de este archivo con el reemplazo sugerido).
--   3. Correrlo recién después de confirmar con el equipo, porque cambia
--      permisos sobre tablas con datos de producción.
-- ==============================================================================

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
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_existing_tenant_id uuid;
  v_new_tenant_id uuid;
  v_admin_principal_email constant text := 'admin@argentum.com';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Serializa altas concurrentes del MISMO usuario (dos pestañas, doble
  -- evento de auth, reintentos de red) sin necesidad de coordinación en el
  -- cliente. El lock se libera solo al terminar la transacción.
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

  -- Único email que hereda el tenant histórico original (mismo criterio que
  -- ADMIN_PRINCIPAL_EMAIL en AuthContext.jsx: whitelist exacta, no substring).
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

  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (v_new_tenant_id, v_user_id, coalesce(p_role, 'usuario'));

  RETURN QUERY SELECT v_new_tenant_id, true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_tenant_for_current_user(
  text, text, text, text, text, text, text, text, text, integer, boolean, text
) TO authenticated;

-- Ya no hace falta (ni es seguro) permitir que el cliente inserte
-- directamente: todo alta de tenant pasa por la función de arriba.
DROP POLICY IF EXISTS "tenant_users_insert_propio" ON public.tenant_users;
DROP POLICY IF EXISTS "Permitir vinculacion de tenant_users al propio usuario" ON public.tenant_users;

DROP POLICY IF EXISTS "tenants_insert_autenticados" ON public.tenants;
DROP POLICY IF EXISTS "Permitir insercion de tenants a usuarios autenticados" ON public.tenants;

-- ==============================================================================
-- Reemplazo sugerido en src/context/AuthContext.jsx (fetchTenantAndRole),
-- una vez que este archivo se haya aplicado y probado:
--
--   const { data, error } = await supabase.rpc('provision_tenant_for_current_user', {
--     p_nombre_comercio: nombreNuevoComercio,
--     p_razon_social: meta.razon_social || nombreNuevoComercio,
--     p_rubro: rubroParaSeed,
--     p_cuit: userCuit,
--     p_condicion_fiscal: meta.condicion_fiscal || 'Monotributista',
--     p_domicilio_fiscal: meta.domicilio_fiscal || null,
--     p_provincia: meta.provincia || null,
--     p_localidad: meta.localidad || null,
--     p_codigo_postal: meta.codigo_postal || null,
--     p_afip_punto_de_venta: Number(meta.afip_punto_de_venta || 1),
--     p_necesita_crear_pto_venta: Boolean(meta.necesita_crear_pto_venta),
--     p_role: defaultRole
--   });
--   // data es un array de una fila: [{ tenant_id, is_new_tenant }]
--   const { tenant_id: assignedTenantId, is_new_tenant: isNewTenant } = data?.[0] || {};
--
-- Esto reemplaza los pasos 2, 3 y 3.5 actuales (SELECT tenants + INSERT
-- tenants + INSERT tenant_users) por una única llamada atómica. El paso 3.6
-- (seedProductosIniciales) se mantiene igual, condicionado a isNewTenant.
-- ==============================================================================
