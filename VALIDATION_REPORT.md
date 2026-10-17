# Validation Report — 2026-10-17T22-25-15-307Z

## Resumen

- **URL:** http://localhost:3120
- **Fecha:** 2026-10-17T22:29:46.841Z
- **Pasos:** 60
- **OK:** 58
- **Fallos:** 2
- **DB antes:** {"users":14,"memberships":7,"workouts":8,"bookings":3,"notifications":9,"payments":1}
- **DB después:** {"users":16,"memberships":8,"workouts":9,"bookings":7,"notifications":13,"payments":2}

## Fallos

### 1. [valentina] valentina-sube-comprobante

- **Fase:** 14:10 Tarde
- **Esperado:** El comprobante queda pendiente de revisión y NO activa la membresía
- **Error:** El comprobante activó la membresía (paymentConfirmed=true) sin revisión del admin
- **URL:** http://localhost:3120/membresia
- **Evidencia:** /Users/work/Desktop/private/gym-app/.kilo/worktrees/validation-integration/screenshots/validation/2026-10-17T22-25-15-307Z/valentina-sube-comprobante.png

### 2. [admin] admin-rechaza-pago-valentina

- **Fase:** 14:20 Tarde
- **Esperado:** Rechazar el comprobante deja el pago FAILED y la membresía sin confirmar
- **Error:** El pago quedó FAILED pero la membresía sigue confirmada (paymentConfirmed=true)
- **URL:** http://localhost:3120/coach/payments
- **Evidencia:** /Users/work/Desktop/private/gym-app/.kilo/worktrees/validation-integration/screenshots/validation/2026-10-17T22-25-15-307Z/admin-rechaza-pago-valentina.png


## Pasos ejecutados

| ID | Fase | Rol | Esperado | Resultado | Duración |
| --- | --- | --- | --- | --- | --- |
| login-multiusuario | 06:00 Apertura | todos | 12 sesiones simultáneas activas | OK | 42523 ms |
| registro-nuevo-miembro | 06:15 Apertura | anónimo | Un visitante crea una cuenta y llega al onboarding | OK | 4574 ms |
| login-credenciales-invalidas | 06:20 Apertura | anónimo | Credenciales incorrectas muestran un error claro | OK | 1210 ms |
| auth-dashboard-sin-sesion | 06:25 Apertura | anónimo | El dashboard redirige al login sin sesión | OK | 766 ms |
| auth-miembro-no-entra-admin | 06:30 Apertura | carlos | Un miembro no puede acceder a /admin ni /coach | OK | 2718 ms |
| auth-trainer-no-entra-admin | 06:35 Apertura | trainer | Un trainer no puede acceder a /admin | OK | 1343 ms |
| auth-idor-membership | 06:40 Apertura | carlos | Un miembro no puede modificar la membresía de otro usuario | OK | 1263 ms |
| admin-dashboard | 07:00 Mañana | admin | Dashboard con métricas y accesos de administración | OK | 1359 ms |
| admin-pagos-pendientes | 07:15 Mañana | admin | Lista de pagos pendientes con el comprobante de Mateo | OK | 2592 ms |
| admin-membresias | 07:30 Mañana | admin | Panel de membresías con miembros y estados | OK | 3598 ms |
| admin-gestion-gimnasio | 07:45 Mañana | admin | Gestión de ejercicios, rutinas y equipamiento | OK | 3844 ms |
| admin-crea-y-elimina-ejercicio | 07:50 Mañana | admin | Crear un ejercicio y luego eliminarlo | OK | 5908 ms |
| admin-crea-y-elimina-equipo | 07:55 Mañana | admin | Crear un equipo y luego eliminarlo | OK | 5147 ms |
| coach-panel | 08:00 Mañana | trainer | Panel de Coach con clientes, rutinas y clases | OK | 1047 ms |
| coach-clientes | 08:15 Mañana | trainer | Listado de clientes asignados | OK | 3063 ms |
| coach-crea-rutina | 08:20 Mañana | trainer | El coach crea una rutina nueva con un ejercicio | OK | 6387 ms |
| coach-crea-cliente | 08:25 Mañana | trainer | El coach registra un cliente nuevo desde el dashboard | OK | 2564 ms |
| coach-crea-invitacion | 08:30 Mañana | trainer | El coach genera un link de invitación y el invitado lo abre | OK | 7593 ms |
| coach-crea-clase | 08:35 Mañana | trainer | El coach crea una clase con capacidad 1 | OK | 2879 ms |
| clase-capacidad-y-cancelacion | 08:40 Mañana | carlos/ana | Carlos reserva, Ana ve clase llena, Carlos cancela y Ana reserva | OK | 9127 ms |
| clase-concurrencia | 08:45 Mañana | carlos/ana | Con capacidad 1, solo una de dos reservas simultáneas debe ganar | OK | 80 ms |
| coach-asignar-rutina | 08:30 Mañana | trainer | Asignar una rutina a Carlos desde su ficha | OK | 6142 ms |
| member-ve-rutina-asignada | 08:45 Mañana | carlos | Carlos ve la rutina recién asignada por su coach | OK | 1265 ms |
| trainer2-solicita-roberto | 09:30 Mañana | trainer2 | Trainer2 envía una solicitud de coaching a Roberto | OK | 2377 ms |
| roberto-acepta-solicitud | 09:45 Mañana | roberto | Roberto recibe y acepta la solicitud desde notificaciones | OK | 7049 ms |
| trainer2-ve-roberto | 10:00 Mañana | trainer2 | Roberto aparece como cliente de Trainer2 tras aceptar | OK | 3507 ms |
| onboarding-inicio | 10:15 Mañana | laura | Onboarding inicia en el paso de objetivo | OK | 2340 ms |
| onboarding-primeros-pasos | 10:30 Mañana | laura | Avanzar objetivo, historial, nivel y frecuencia hasta condiciones físicas | OK | 3816 ms |
| onboarding-completo | 10:45 Mañana | laura | Completar peso, altura, medidas, horario, confirmación y elegir rutina | OK | 11395 ms |
| workout-carlos | 11:00 Mediodía | carlos | Completar un entrenamiento, persistirlo y volver a la lista de rutinas | OK | 22473 ms |
| workout-historial | 11:15 Mediodía | carlos | El historial del plan carga (actualmente es un placeholder) | OK | 4041 ms |
| progress-carlos | 11:30 Mediodía | carlos | Página de progreso con historial de mediciones | OK | 7487 ms |
| routine-mateo | 11:45 Mediodía | mateo | Miembro con plan activo ve sus entrenamientos | OK | 1373 ms |
| progress-ana | 12:00 Mediodía | ana | Miembro activa ve su progreso e historial | OK | 1472 ms |
| profile-actualiza-datos | 12:15 Mediodía | carlos | Carlos actualiza nombre y teléfono | OK | 4521 ms |
| profile-avatar | 12:20 Mediodía | carlos | Carlos sube una foto de perfil | OK | 2233 ms |
| settings-tema-y-sonido | 12:25 Mediodía | carlos | Cambiar tema a oscuro/claro y alternar sonidos | OK | 3696 ms |
| progress-nueva-medicion | 12:30 Mediodía | carlos | Registrar una nueva medición corporal | OK | 2062 ms |
| timer-funciona | 12:35 Mediodía | carlos | El temporizador inicia, cuenta y pausa | OK | 8804 ms |
| superadmin-dashboard | 12:45 Mediodía | superadmin | Super Admin entra al dashboard sin errores | OK | 3870 ms |
| requests-redirect | 12:50 Mediodía | superadmin | /requests redirige al dashboard | OK | 2894 ms |
| error-404 | 12:55 Mediodía | carlos | Una ruta inexistente devuelve 404 | OK | 10664 ms |
| responsive-mobile | 13:00 Tarde | carlos | Mi Rutina usable en viewport móvil sin overflow horizontal | OK | 2294 ms |
| mateo-dashboard-pre-pago | 13:00 Tarde | mateo | Mateo tiene el dashboard abierto antes de la confirmación | OK | 3588 ms |
| admin-confirma-pago | 13:15 Tarde | admin | Confirmar el pago pendiente de Mateo | OK | 6004 ms |
| mateo-notificacion-sse | 13:30 Tarde | mateo | El badge de notificaciones de Mateo se actualiza sin recargar | OK | 126 ms |
| valentina-membresia-pendiente | 14:00 Tarde | valentina | Valentina tiene una membresía esperando comprobante | OK | 3719 ms |
| valentina-sube-comprobante | 14:10 Tarde | valentina | El comprobante queda pendiente de revisión y NO activa la membresía | FALLO | 2589 ms |
| admin-rechaza-pago-valentina | 14:20 Tarde | admin | Rechazar el comprobante deja el pago FAILED y la membresía sin confirmar | FALLO | 1385 ms |
| valentina-historial-pagos | 14:30 Tarde | valentina | Valentina ve su historial de pagos | OK | 4237 ms |
| sofia-membresia-vencida | 15:00 Tarde | sofia | Miembro con membresía vencida no puede reservar clase | OK | 1699 ms |
| sofia-renovacion-y-reserva | 15:30 Tarde | sofia | Tras renovar +30 días, la reserva de clase funciona | OK | 1454 ms |
| ricardo-membresia-inactiva | 16:00 Tarde | ricardo | Miembro inactivo no puede reservar clase | OK | 1494 ms |
| admin-ricardo-inactiva-visible | 16:15 Tarde | admin | La membresía INACTIVA de Ricardo aparece en el panel de admin | OK | 1360 ms |
| admin-renueva-ricardo | 16:30 Tarde | admin | El admin renueva una membresía vencida desde el panel | OK | 1245 ms |
| invite-expirada | 17:00 Tarde | trainer2 | Una invitación vencida responde 410 | OK | 76 ms |
| notificaciones-carlos | 18:00 Tarde | carlos | Listado de notificaciones accesible | OK | 3201 ms |
| admin-membresia-sofia-renovada | 18:30 Tarde | admin | Sofía aparece como activa tras la renovación | OK | 1183 ms |
| health-check | 19:00 Cierre | admin | API de salud responde 200 | OK | 138 ms |
| sin-errores-500 | 19:00 Cierre | todos | Ninguna sesión registró errores HTTP 5xx | OK | 2 ms |

## Errores de consola / red

Los 403 de sofia y ricardo son esperados: corresponden a los tests negativos de reserva con membresía vencida/inactiva.

### carlos

- console: Failed to load resource: the server responded with a status of 404 (Not Found)
- console: ClientFetchError: Failed to fetch. Read more at https://errors.authjs.dev#autherror
    at fetchData (http://localhost:3120/_next/static/chunks/103._118q7g3._.js:1836:22)
    at async getSession (http://localhost:3120/_next/static/chunks/103._118q7g3._.js:2003:21)
    at async SessionProvider.useEffect [as _getSession] (http://localhost:3120/_next/static/chunks/103._118q7g3._.js:2146:51)

### sofia

- console: Failed to load resource: the server responded with a status of 403 (Forbidden)

### ricardo

- console: Failed to load resource: the server responded with a status of 403 (Forbidden)

### superadmin

- console: ClientFetchError: Failed to fetch. Read more at https://errors.authjs.dev#autherror
    at fetchData (http://localhost:3120/_next/static/chunks/103._118q7g3._.js:1836:22)
    at async getSession (http://localhost:3120/_next/static/chunks/103._118q7g3._.js:2003:21)
    at async SessionProvider.useEffect [as _getSession] (http://localhost:3120/_next/static/chunks/103._118q7g3._.js:2146:51)

## Hallazgos adicionales

### F-01 — La contraseña puede terminar en la URL si el formulario se envía antes de hidratar

- **Severidad:** Alta
- **Área:** Autenticación
- **Detalle:** El formulario de /login no define method y depende de onSubmit. Si el usuario envía antes de que React hidrate, el navegador hace un GET nativo y expone email/password en el query string, historial y logs.
- **Evidencia:** Run 2026-10-17T13-48-04-133Z: /login?email=...&password=...
- **Archivo probable:** `src/app/login/page.tsx`
- **Fix sugerido:** Agregar method="post" al <form> y mantener onSubmit; opcionalmente deshabilitar el submit hasta que el componente esté montado.

### F-02 — Recharts advierte width(-1) y height(-1) al montar los gráficos

- **Severidad:** Baja
- **Área:** Progreso
- **Detalle:** Los gráficos de /progress renderizan, pero Recharts emite warnings de dimensiones inválidas durante el montaje. Puede causar parpadeo o gráficos incompletos en pantallas pequeñas.
- **Evidencia:** Consola del dev server durante la fase de progreso
- **Archivo probable:** `src/components/charts/progress-chart.tsx`
- **Fix sugerido:** Definir una altura mínima/explícita en el contenedor de los charts o usar ResponsiveContainer con height fijo.

### F-03 — El historial de entrenamientos es un placeholder

- **Severidad:** Baja
- **Área:** Historial
- **Detalle:** La ruta /rutinas/[planId]/historial muestra 'en construcción' en lugar del historial real de sesiones.
- **Evidencia:** Paso workout-historial
- **Archivo probable:** `src/app/rutinas/[planId]/historial/page.tsx`
- **Fix sugerido:** Implementar la consulta de WorkoutLog del plan y renderizar el historial.

### F-04 — Las membresías INACTIVE no aparecen en ningún tab

- **Severidad:** Media
- **Área:** Admin / Membresías
- **Detalle:** El panel de admin filtra Pendientes/Activas/Vencidas; una membresía con status INACTIVE queda fuera de los tres filtros y es invisible para el admin.
- **Evidencia:** Paso admin-ricardo-inactiva-visible
- **Archivo probable:** `src/components/admin/membership-panel.tsx`
- **Fix sugerido:** Incluir INACTIVE en el filtro de vencidas o agregar un tab/estado 'Inactiva'.

### F-05 — Subir comprobante confirma la membresía sin revisión

- **Severidad:** Alta
- **Área:** Pagos / Membresías
- **Detalle:** POST /api/payments/receipt crea el Payment en PENDING pero actualiza la Membership con paymentConfirmed=true. El miembro queda activo antes de que el admin revise.
- **Evidencia:** Paso valentina-sube-comprobante
- **Archivo probable:** `src/app/api/payments/receipt/route.ts`
- **Fix sugerido:** No tocar paymentConfirmed en el upload; confirmar la membresía solo al aprobar el Payment.

### F-06 — Rechazar el comprobante no revierte la membresía

- **Severidad:** Alta
- **Área:** Pagos / Membresías
- **Detalle:** PUT /api/payments/[id] con REJECT marca el Payment como FAILED, pero la Membership ya fue confirmada por el upload y sigue activa.
- **Evidencia:** Paso admin-rechaza-pago-valentina
- **Archivo probable:** `src/app/api/payments/[id]/route.ts`
- **Fix sugerido:** Al rechazar un pago de tipo MEMBERSHIP, revertir paymentConfirmed/estado de la membresía.

### F-07 — Renovar membresía muestra éxito pero no extiende la fecha

- **Severidad:** Alta
- **Área:** Admin / Membresías
- **Detalle:** El panel envía startDate/endDate al PATCH /api/memberships/[id], pero el schema Zod no incluye esas fechas y las descarta. La API responde 200 y el toast dice 'renovada', pero endDate queda en el pasado.
- **Evidencia:** Paso admin-renueva-ricardo: endDate recibido = ayer, esperado > ahora
- **Archivo probable:** `src/app/api/memberships/[id]/route.ts`
- **Fix sugerido:** Agregar startDate/endDate al updateMembershipSchema y validar que endDate > startDate.

### F-08 — La generación de rutina falla con 500 por nombre de ejercicio duplicado

- **Severidad:** Alta
- **Área:** Onboarding / Rutinas
- **Detalle:** POST /api/fitness-coach hace findFirst + create de Exercise sin manejar concurrencia. Si el nombre ya existe (o dos requests compiten), Prisma lanza P2002 y el onboarding no genera planes. Es intermitente: ocurrió en el run 2026-10-17T20-12-53-320Z y no se reprodujo en la corrida final.
- **Evidencia:** Run 2026-10-17T20-12-53-320Z: POST /api/fitness-coach 500 (P2002 Exercise.name); paso onboarding-completo
- **Archivo probable:** `src/app/api/fitness-coach/route.ts:488`
- **Fix sugerido:** Usar upsert por name o capturar P2002 y volver a consultar el ejercicio existente.

### F-09 — Dos reservas simultáneas pueden exceder la capacidad

- **Severidad:** Alta
- **Área:** Clases / Reservas
- **Detalle:** POST /api/bookings cuenta las reservas y luego crea, sin transacción ni lock. Con capacidad 1, dos requests concurrentes devolvieron 201 y dejaron 2 reservas confirmadas.
- **Evidencia:** Paso clase-concurrencia: statuses [201, 201] en vez de [201, 409]
- **Archivo probable:** `src/app/api/bookings/route.ts`
- **Fix sugerido:** Hacer count+create en una transacción serializable o agregar un constraint/upsert atómico por cupo.

### F-10 — CardTitle no renderiza un heading semántico

- **Severidad:** Baja
- **Área:** Accesibilidad
- **Detalle:** El componente CardTitle usa un div. Títulos importantes como 'Únete como cliente' o 'Confirmar pago' no son headings para lectores de pantalla ni para getByRole('heading').
- **Evidencia:** La página /invite/[token] no exponía el título como heading
- **Archivo probable:** `src/components/ui/card.tsx`
- **Fix sugerido:** Renderizar CardTitle como h2 (o exponer asChild) y usar h1 en títulos de página.

### F-11 — IDOR: cualquier usuario autenticado puede modificar membresías ajenas

- **Severidad:** Alta
- **Área:** Auth / API
- **Detalle:** PATCH /api/memberships/[id] solo valida que haya sesión; no verifica rol ni ownership. Un MEMBER puede cambiar status/paymentConfirmed de la membresía de otro usuario.
- **Evidencia:** Paso auth-idor-membership: Carlos modifica la membresía de Ana
- **Archivo probable:** `src/app/api/memberships/[id]/route.ts`
- **Fix sugerido:** Exigir ADMIN/SUPER_ADMIN para cambios arbitrarios; si se permite auto-renovación, limitarla a la propia membresía y nunca aceptar paymentConfirmed=true desde el cliente.


## Notas de cobertura

- 12 usuarios con sesiones simultáneas, cada uno en su propio contexto de navegador.
- Time travel aplicado en BD: membresía de Sofía vencida → renovada +30 días, Ricardo INACTIVE → EXPIRED → renovado, e invitación expirada.
- Se verificó persistencia real: WorkoutLog, BodyMeasurement, Booking, Notification y Payment.
- Se cubrieron CRUDs de admin (ejercicio/equipo), coach (rutina/cliente/invitación/clase), onboarding completo y timer.
- El E2E existente e2e/workout.spec.ts no verificaba la persistencia del entrenamiento; este runner sí lo hace.

## No validado

- Google OAuth (requiere una cuenta real de Google)
- Stripe checkout y webhook (claves vacías en .env)
- Envío real de emails y push notifications
- Subida de archivos fuera del filesystem local
- Comportamiento real de SSE durante horas (solo se probó el evento de pago)
- Landing público /gym/[slug] y detalle /exercise/[id]
- Gestión de plataforma del super-admin más allá del dashboard

## Reproducir

```bash
npm run db:reset
npm run test:validation
```
