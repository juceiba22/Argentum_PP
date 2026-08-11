-- Script de restauración para reconectar permanentemente al usuario admin@argentum.com
-- con su tenant histórico original donde residen todas las ventas, facturas e interacciones del último mes.

DO $$
DECLARE
  v_admin_id UUID;
  v_original_tenant_id UUID;
BEGIN
  -- 1. Obtener el ID del usuario admin@argentum.com en Supabase Auth
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@argentum.com' LIMIT 1;
  
  -- 2. Obtener el tenant histórico principal (el primer tenant creado en la tabla tenants)
  SELECT id INTO v_original_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  
  -- 3. Vincular permanentemente al admin con su tenant histórico original en la tabla tenant_users
  IF v_admin_id IS NOT NULL AND v_original_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (v_original_tenant_id, v_admin_id, 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET tenant_id = EXCLUDED.tenant_id, role = 'admin';
  END IF;
END $$;
