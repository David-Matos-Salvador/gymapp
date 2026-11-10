# Validation Report — 2026-10-24T19-18-54-608Z

## Resumen

- **URL:** http://localhost:3120
- **Fecha:** 2026-10-24T19:22:13.044Z
- **Pasos:** 65
- **OK:** 65
- **Fallos:** 0
- **DB antes:** {"users":14,"memberships":7,"workouts":8,"bookings":3,"notifications":9,"payments":1}
- **DB después:** {"users":16,"memberships":8,"workouts":9,"bookings":7,"notifications":13,"payments":2}

## Fallos

No se detectaron fallos.

## Pasos ejecutados

| ID | Fase | Rol | Esperado | Resultado | Duración |
| --- | --- | --- | --- | --- | --- |
| login-multiusuario | 06:00 Apertura | todos | 12 sesiones simultáneas activas | OK | 36873 ms |
| registro-nuevo-miembro | 06:15 Apertura | anónimo | Un visitante con el link del gimnasio crea su cuenta y llega al onboarding | OK | 3370 ms |
| login-credenciales-invalidas | 06:20 Apertura | anónimo | Credenciales incorrectas muestran un error claro | OK | 918 ms |
| auth-dashboard-sin-sesion | 06:25 Apertura | anónimo | El dashboard redirige al login sin sesión | OK | 399 ms |
| auth-miembro-no-entra-admin | 06:30 Apertura | carlos | Un miembro no puede acceder a /admin ni /coach | OK | 2174 ms |
| auth-trainer-no-entra-admin | 06:35 Apertura | trainer | Un trainer no puede acceder a /admin | OK | 990 ms |
| auth-idor-membership | 06:40 Apertura | carlos | Un miembro no puede modificar la membresía de otro usuario | OK | 747 ms |
| admin-dashboard | 07:00 Mañana | admin | Dashboard con métricas y accesos de administración | OK | 1612 ms |
| admin-pagos-pendientes | 07:15 Mañana | admin | Lista de pagos pendientes con el comprobante de Mateo | OK | 1101 ms |
| admin-membresias | 07:30 Mañana | admin | Panel de membresías con miembros y estados | OK | 1245 ms |
| admin-gestion-gimnasio | 07:45 Mañana | admin | Gestión de ejercicios, rutinas y equipamiento | OK | 1466 ms |
| admin-crea-y-elimina-ejercicio | 07:50 Mañana | superadmin | El superadmin crea un ejercicio global y lo elimina | OK | 3851 ms |
| admin-crea-y-elimina-equipo | 07:55 Mañana | admin | Crear un equipo y luego eliminarlo | OK | 3665 ms |
| coach-panel | 08:00 Mañana | trainer | Panel de Coach con clientes, rutinas y clases | OK | 1398 ms |
| coach-clientes | 08:15 Mañana | trainer | Listado de clientes asignados | OK | 1626 ms |
| coach-crea-rutina | 08:20 Mañana | trainer | El coach crea una rutina nueva con un ejercicio | OK | 4025 ms |
| coach-crea-cliente | 08:25 Mañana | trainer | El coach invita clientes; no puede crear contraseñas desde el panel | OK | 3139 ms |
| coach-crea-invitacion | 08:30 Mañana | trainer | El coach genera un link de invitación y el invitado lo abre | OK | 5495 ms |
| coach-crea-clase | 08:35 Mañana | trainer | El coach crea una clase con capacidad 1 | OK | 1951 ms |
| clase-capacidad-y-cancelacion | 08:40 Mañana | carlos/ana | Carlos reserva, Ana ve clase llena, Carlos cancela y Ana reserva | OK | 9447 ms |
| clase-concurrencia | 08:45 Mañana | carlos/ana | Con capacidad 1, solo una de dos reservas simultáneas debe ganar | OK | 130 ms |
| coach-asignar-rutina | 08:30 Mañana | trainer | Asignar una rutina a Carlos desde su ficha | OK | 4087 ms |
| member-ve-rutina-asignada | 08:45 Mañana | carlos | Carlos ve la rutina recién asignada por su coach | OK | 1124 ms |
| trainer2-solicita-roberto | 09:30 Mañana | trainer2 | Trainer2 envía una solicitud de coaching a Roberto | OK | 2115 ms |
| roberto-acepta-solicitud | 09:45 Mañana | roberto | Roberto recibe y acepta la solicitud desde notificaciones | OK | 2705 ms |
| trainer2-ve-roberto | 10:00 Mañana | trainer2 | Roberto aparece como cliente de Trainer2 tras aceptar | OK | 938 ms |
| onboarding-inicio | 10:15 Mañana | laura | Onboarding inicia en el paso de gimnasio | OK | 1353 ms |
| onboarding-primeros-pasos | 10:30 Mañana | laura | Avanzar objetivo, historial, nivel y frecuencia hasta condiciones físicas | OK | 3784 ms |
| onboarding-completo | 10:45 Mañana | laura | Completar peso, altura, medidas, horario, confirmación y elegir rutina | OK | 10530 ms |
| workout-carlos | 11:00 Mediodía | carlos | Completar un entrenamiento, persistirlo y volver a la lista de rutinas | OK | 15191 ms |
| workout-historial | 11:15 Mediodía | carlos | El historial del plan muestra las sesiones registradas | OK | 2819 ms |
| progress-carlos | 11:30 Mediodía | carlos | Página de progreso con historial de mediciones | OK | 2612 ms |
| routine-mateo | 11:45 Mediodía | mateo | Miembro con plan activo ve sus entrenamientos | OK | 1213 ms |
| progress-ana | 12:00 Mediodía | ana | Miembro activa ve su progreso e historial | OK | 1065 ms |
| profile-actualiza-datos | 12:15 Mediodía | carlos | Carlos actualiza nombre y teléfono | OK | 1368 ms |
| profile-avatar | 12:20 Mediodía | carlos | Carlos sube una foto de perfil | OK | 1951 ms |
| settings-tema-y-sonido | 12:25 Mediodía | carlos | Cambiar tema a oscuro/claro y alternar sonidos | OK | 1251 ms |
| progress-nueva-medicion | 12:30 Mediodía | carlos | Registrar una nueva medición corporal | OK | 1439 ms |
| timer-funciona | 12:35 Mediodía | carlos | El temporizador inicia, cuenta y pausa | OK | 4706 ms |
| superadmin-dashboard | 12:45 Mediodía | superadmin | Super Admin entra al dashboard sin errores | OK | 2009 ms |
| requests-redirect | 12:50 Mediodía | superadmin | /requests redirige al dashboard | OK | 1561 ms |
| superadmin-crea-gym | 12:51 Mediodía | superadmin | Crear un gym desde la plataforma con provisioning | OK | 1830 ms |
| superadmin-edita-gym | 12:52 Mediodía | superadmin | Editar los datos de un gym | OK | 1256 ms |
| superadmin-crea-admin | 12:53 Mediodía | superadmin | Crear un admin para el gym desde la plataforma | OK | 841 ms |
| superadmin-toggle-gym | 12:54 Mediodía | superadmin | Desactivar y reactivar un gym | OK | 1068 ms |
| superadmin-plan | 12:55 Mediodía | superadmin | Crear, desactivar y eliminar un plan de membresía | OK | 4162 ms |
| error-404 | 12:55 Mediodía | carlos | Una ruta inexistente devuelve 404 | OK | 404 ms |
| responsive-mobile | 13:00 Tarde | carlos | Mi Rutina usable en viewport móvil sin overflow horizontal | OK | 1006 ms |
| mateo-dashboard-pre-pago | 13:00 Tarde | mateo | Mateo tiene el dashboard abierto antes de la confirmación | OK | 2941 ms |
| admin-confirma-pago | 13:15 Tarde | admin | Confirmar el pago pendiente de Mateo | OK | 3177 ms |
| mateo-notificacion-sse | 13:30 Tarde | mateo | El badge de notificaciones de Mateo se actualiza sin recargar | OK | 54 ms |
| valentina-membresia-pendiente | 14:00 Tarde | valentina | Valentina tiene una membresía esperando comprobante | OK | 7933 ms |
| valentina-sube-comprobante | 14:10 Tarde | valentina | El comprobante queda pendiente de revisión y NO activa la membresía | OK | 1992 ms |
| admin-rechaza-pago-valentina | 14:20 Tarde | admin | Rechazar el comprobante deja el pago FAILED y la membresía sin confirmar | OK | 1473 ms |
| valentina-historial-pagos | 14:30 Tarde | valentina | Valentina ve su historial de pagos | OK | 2863 ms |
| sofia-membresia-vencida | 15:00 Tarde | sofia | Miembro con membresía vencida no puede reservar clase | OK | 1286 ms |
| sofia-renovacion-y-reserva | 15:30 Tarde | sofia | Tras renovar +30 días, la reserva de clase funciona | OK | 1097 ms |
| ricardo-membresia-inactiva | 16:00 Tarde | ricardo | Miembro inactivo no puede reservar clase | OK | 1099 ms |
| admin-ricardo-inactiva-visible | 16:15 Tarde | admin | La membresía INACTIVA de Ricardo aparece en el panel de admin | OK | 1108 ms |
| admin-renueva-ricardo | 16:30 Tarde | admin | El admin renueva una membresía vencida desde el panel | OK | 1202 ms |
| invite-expirada | 17:00 Tarde | trainer2 | Una invitación vencida responde 410 | OK | 61 ms |
| notificaciones-carlos | 18:00 Tarde | carlos | Listado de notificaciones accesible | OK | 2786 ms |
| admin-membresia-sofia-renovada | 18:30 Tarde | admin | Sofía aparece como activa tras la renovación | OK | 1348 ms |
| health-check | 19:00 Cierre | admin | API de salud responde 200 | OK | 341 ms |
| sin-errores-500 | 19:00 Cierre | todos | Ninguna sesión registró errores HTTP 5xx | OK | 1 ms |

## Errores de consola / red

Los 403 de sofia y ricardo son esperados: corresponden a los tests negativos de reserva con membresía vencida/inactiva.

### carlos

- console: Failed to load resource: the server responded with a status of 404 (Not Found)

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

### F-03 — El historial de entrenamientos es un placeholder

- **Severidad:** Baja
- **Área:** Historial
- **Detalle:** La ruta /my-routine/[planId]/history muestra 'en construcción' en lugar del historial real de sesiones.
- **Evidencia:** Paso workout-historial
- **Archivo probable:** `src/app/my-routine/[planId]/history/page.tsx`
- **Fix sugerido:** Implementar la consulta de WorkoutLog del plan y renderizar el historial.

### F-10 — CardTitle no renderiza un heading semántico

- **Severidad:** Baja
- **Área:** Accesibilidad
- **Detalle:** El componente CardTitle usa un div. Títulos importantes como 'Únete como cliente' o 'Confirmar pago' no son headings para lectores de pantalla ni para getByRole('heading').
- **Evidencia:** La página /invite/[token] no exponía el título como heading
- **Archivo probable:** `src/components/ui/card.tsx`
- **Fix sugerido:** Renderizar CardTitle como h2 (o exponer asChild) y usar h1 en títulos de página.


## Resueltos

- **F-01** — La contraseña puede terminar en la URL si el formulario se envía antes de hidratar (commit `9f574d8`)
- **F-02** — Recharts advierte width(-1) y height(-1) al montar los gráficos (commit `9f574d8`)
- **F-04** — Las membresías INACTIVE no aparecen en ningún tab (commit `74721a2`)
- **F-05** — Subir comprobante confirma la membresía sin revisión (commit `0c9071d`)
- **F-06** — Rechazar el comprobante no revierte la membresía (commit `0c9071d`)
- **F-07** — Renovar membresía muestra éxito pero no extiende la fecha (commit `74721a2`)
- **F-08** — La generación de rutina falla con 500 por nombre de ejercicio duplicado (commit `3c8a548`)
- **F-09** — Dos reservas simultáneas pueden exceder la capacidad (commit `e184800`)
- **F-11** — IDOR: cualquier usuario autenticado puede modificar membresías ajenas (commit `74721a2`)

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
