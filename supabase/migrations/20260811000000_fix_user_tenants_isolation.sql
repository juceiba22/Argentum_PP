-- Script de corrección para desvincular usuarios duplicados del tenant del admin.
-- Ejecutar en el SQL Editor de Supabase si algún usuario secundario (ej: juceiba@argentum.com)
-- quedó erróneamente enlazado al tenant_id del usuario principal (admin@argentum.com).

-- 1. Eliminar asignaciones incorrectas donde múltiples usuarios distintos de admin comparten el mismo tenant
-- (Permite que AuthContext re-genere su tenant aislado automáticamente al volver a iniciar sesión)
DELETE FROM public.tenant_users
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'juceiba@argentum.com'
);

-- 2. Asegurar que las políticas RLS permitan consulta e inserción aislada
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de tenants a autenticados" ON public.tenants;
CREATE POLICY "Lectura de tenants a autenticados" ON public.tenants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insercion de tenants a autenticados" ON public.tenants;
CREATE POLICY "Insercion de tenants a autenticados" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura de tenant_users por usuario" ON public.tenant_users;
CREATE POLICY "Lectura de tenant_users por usuario" ON public.tenant_users FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Insercion de tenant_users por usuario" ON public.tenant_users;
CREATE POLICY "Insercion de tenant_users por usuario" ON public.tenant_users FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
