# Checklist de QA manual — antes de deployar

Basado en la auditoría del 2026-09-01. Probar contra un proyecto de
**staging** de Supabase si es posible (no contra producción con datos reales).

## 1. Alta nueva por email/contraseña (Bug #1 y #4)
- [ ] Completar los 4 pasos del wizard con un email nuevo, eligiendo un rubro
      distinto de "General / Otro" (ej. "Ferretería").
- [ ] Confirmar el email (clic en el link del mail).
- [ ] Verificar que el login automático post-confirmación entra directo al
      Market con los 15 productos del rubro elegido (no "General / Otro", no
      vacío).
- [ ] Abrir Supabase Studio → tabla `tenants` → confirmar que existe **una
      sola** fila para ese usuario (buscar por `nombre_comercio`), con
      `rubro` = el elegido y `onboarding_completado = true`.
- [ ] Agregar manualmente 2-3 productos nuevos desde Inventario.
- [ ] Cerrar sesión y volver a iniciar sesión. **Los productos agregados a
      mano deben seguir ahí** (este es el bug reportado).
- [ ] Repetir el ciclo logout/login 3-4 veces seguidas rápido para forzar el
      timing de la carrera que se corrigió.

## 2. Alta nueva por Google (Bug #2 y #4)
- [ ] "Continuar con Google" con una cuenta de Google que **nunca** se usó
      antes en el sistema.
- [ ] Debe aparecer la pantalla **"¡Un último paso!"** (RubroGate) pidiendo
      elegir un rubro — no debe entrar directo al Market.
- [ ] Elegir un rubro y confirmar. Verificar que carga los 15 productos
      correctos de ese rubro (no duplicados, no genéricos).
- [ ] Cerrar sesión, volver a entrar con Google. Debe entrar directo al
      Market (sin volver a pedir el rubro) y con los mismos productos.

## 3. Cuenta duplicada Google vs email/password (Bug #2 — requiere revisar
   configuración en el Dashboard de Supabase, ver sección "Pendiente" abajo)
- [ ] Crear una cuenta con email/password (ej. `prueba@gmail.com`) y
      **confirmar el email**.
- [ ] Cerrar sesión. Intentar "Continuar con Google" usando esa MISMA
      dirección `prueba@gmail.com`.
- [ ] Verificar que entra a la MISMA cuenta/tenant que ya existía (no crea un
      comercio nuevo vacío).
- [ ] Si Supabase no puede vincularlas, ahora debe aparecer un mensaje de
      error explicando qué pasó (antes quedaba en blanco, sin explicación).
- [ ] Repetir a la inversa: Google primero, luego intentar crear cuenta con
      password con el mismo email.

## 4. Pago / licencia (Bug #3 — repo Argentum-Comercios)

**Causa raíz confirmada**: `api/mercadopago/webhook.js` recibe el evento
`payment` de MercadoPago para **todos** los pagos de la cuenta, no solo las
compras de licencia — incluyendo un cobro hecho con la terminal Point del
POS (`jolly-turing/api/mercadopago/index.js`, `handleCreatePointPayment`).
Antes, si el `external_reference` del pago no matcheaba ningún registro en
`licencias_pagos`, el código solo lo logueaba como warning y **seguía
procesando igual**: si el pago estaba `approved` (por ejemplo, una venta real
del mostrador), terminaba activando/renovando una licencia y mandando el
mail "¡Pago Confirmado!" para un cobro que no tenía nada que ver con la
compra de una licencia. Fix aplicado: ahora, si no hay un `licencias_pagos`
pendiente que matchee, el webhook corta ahí y no hace nada. También se
agregó validación de firma (`x-signature`) como capa adicional.

- [ ] En Vercel (proyecto Argentum-Comercios) → Settings → Environment
      Variables: agregar `MP_WEBHOOK_SECRET` con el "Secret Key" del panel
      de Mercado Pago (Tu negocio → Configuración → Webhooks). Sin esto, la
      validación de firma queda deshabilitada (con un warning en los logs)
      pero el fix principal (bloquear pagos sin `licencias_pagos` pendiente)
      igual funciona.
- [ ] Hacer una compra de licencia de prueba real (o con credenciales de
      test de Mercado Pago) desde el flujo de checkout real y confirmar que
      SÍ llega el mail y se activa la licencia.
- [ ] Hacer un cobro de prueba con la terminal Point del POS (venta normal,
      no licencia) y confirmar que **NO** llega ningún mail de "Pago
      Confirmado" ni se toca `licencias_activas`.
- [ ] Revisar los logs del webhook después de ese cobro POS: debe aparecer
      "No se encontró pago pendiente de licencia... Ignorando." y responder
      200 sin más acción.
- [ ] Si configuraste `MP_WEBHOOK_SECRET`: pegarle al endpoint del webhook
      manualmente sin firma válida y confirmar que responde 401 sin activar
      nada.

## 5. Regresión general
- [ ] Login con el usuario admin histórico (`admin@argentum.com`) — debe
      seguir viendo el tenant original con todos sus datos.
- [ ] Un usuario "ventas" (`*ventas*@...`) sigue yendo a `/ventas-home` y no
      ve rutas de admin.
- [ ] Trial/paywall: un tenant con `trial_ends_at` vencido y sin licencia
      sigue mostrando el Paywall (no se rompió con los cambios).
- [ ] `npm run build` sin errores (ya verificado).

---

## Pendiente — requiere acceso al Dashboard de Supabase (no visible en el repo)
Estos puntos no se pueden confirmar leyendo el código; hay que revisarlos
directamente en **supabase.com/dashboard → tu proyecto → Authentication**:

- [ ] **Authentication → Sign In / Providers → Email**: ¿"Confirm email" está
      activado en producción? (el `config.toml` local lo tiene en `false`,
      pero eso es solo el default de desarrollo local, no necesariamente lo
      que corre en producción).
- [ ] **Authentication → Sign In / Providers**: ¿el auto-linking de
      identidades (vincular Google a una cuenta existente con el mismo email
      verificado) está habilitado?
- [ ] **Authentication → URL Configuration**: ¿el dominio de producción real
      está en "Redirect URLs"? (el `config.toml` local solo lista
      `127.0.0.1:3000`).
- [ ] **Google Cloud Console → OAuth consent screen / Credentials**: ¿el
      dominio de producción está en "Authorized redirect URIs" y "Authorized
      JavaScript origins"?
