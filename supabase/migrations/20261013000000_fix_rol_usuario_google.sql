-- Las altas por "Continuar con Google" no traen rol en user_metadata y el
-- cliente las aprovisionaba con role = 'usuario', un rol que la app no
-- reconoce (solo 'admin' y 'ventas'): el dueño de la carnicería quedaba con
-- "Acceso Denegado" en todas las pantallas. Ese rol solo se asignaba al
-- usuario que creaba su propio tenant, así que corresponde 'admin'.
UPDATE public.tenant_users
SET role = 'admin'
WHERE role = 'usuario';
