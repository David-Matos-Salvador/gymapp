# Características Pendientes de Implementar

---

## Diferidos de la ronda de validación (2026-10-17)

Quedan fuera de alcance por decisión D-06 de `docs/decisions/validation-fixes.md`:

- **F-03 — Historial real de entrenamientos**: `/my-routine/[planId]/history` sigue mostrando el placeholder "en construcción". Implementar la consulta de `WorkoutLog` del plan y renderizar el historial en una ronda aparte.
- **F-10 — `CardTitle` semántico**: `src/components/ui/card.tsx` renderiza un `div`; evaluar el cambio transversal a `h2`/`asChild` junto con una revisión de accesibilidad de títulos, sin bloquear la ronda actual.

---

## Compartir Progreso

- **Descripción**: Permitir al usuario compartir su resumen de entrenamiento al completar un workout.
- **Opciones consideradas**:
  - Generar imagen y compartir vía Web Share API (navigator.share)
  - Copiar texto motivacional al portapapeles
- **Prioridad**: Media
- **Notas**: Evaluar librerías como html2canvas para generar imagen. Web Share API no está disponible en todos los navegadores.

---

## Imágenes / GIFs de ejercicios

- **Descripción**: Mostrar imagen o GIF animado de cada ejercicio en lugar del ícono de pesa genérico.
- **Estado actual**: El modelo `Exercise` ya tiene campo `imageUrl` (String) listo para usar.
- **Prioridad**: Media
- **Notas**: Se puede usar un placeholder (ícono Dumbbell) hasta tener las imágenes reales. Guardar imágenes en `/public/exercises/`.

---

## Fotos de perfil / Avatar

- **Descripción**: El campo `User.image` y `ProgressPhoto` ya existen. Falta UI de subida de foto al crear/completar mediciones.

---

## Encuestas de satisfacción post-workout

- **Descripción**: Preguntar al usuario "¿Cómo te sentiste?" después del entrenamiento (escala 1-5 o emojis).

---

## Planificación inteligente de splits por día

- **Descripción**: Asignar splits a días fijos de la semana (ej: Lunes = Push, Miércoles = Pull) en lugar de rotación secuencial.
- **Estado actual**: Rotación secuencial implementada.

---

## Stripe Payments

- **Descripción**: Integrar pagos con Stripe para membresías automáticas.
- **Estado actual**: SDK instalado, `Payment` y `Membership` models listos. Endpoints sin implementar.

---

## Notificaciones Push / Email

- **Descripción**: Recordatorios de entrenamiento, membresía por vencer, etc.
- **Estado actual**: Modelo `Notification` en DB. Sin integración con servicios externos.

---

## Multi-idioma (PT-BR)

- **Descripción**: Soporte para portugués (Brasil) como segundo idioma.
- **Estado actual**: Preparado con labels traducibles en componentes.

---

## App Móvil (React Native)

- **Descripción**: Versión nativa de la app para iOS/Android.
- **Estado actual**: No iniciada.

---

## Página de detalle de ejercicio

- **Descripción**: Al tocar un ejercicio en el workout log, expandir en nueva pestaña/ruta con: video/GIF del ejercicio, editor de pesos y reps, anotaciones, historial de sets anteriores.
- **Prioridad**: Media
- **Notas**: Componente `ExerciseCard` actual soporta un botón "editar" (colapsable). Reemplazar por link a `/exercise/[id]` con página dedicada. Modelo `Exercise` ya tiene `videoUrl`, `animationData`, `imageUrl`.

---

## Racha diaria

- **Descripción**: Mostrar días consecutivos entrenando (streak diario).
- **Estado actual**: Existe función `calculateStreak()` en el dashboard pero no se muestra en `/rutina`. Se priorizó la racha semanal.

---

## Badge de pagos pendientes — tiempo real

- **Descripción**: El badge rojo en el nav "Pagos" se actualiza con polling (setInterval 30s). Migrar a WebSocket / SSE para actualización instantánea sin polling.
- **Estado actual**: Funcional con polling cada 30s en `src/components/layout/shell.tsx:41-52`.
- **Tecnologías candidatas**: Server-Sent Events (SSE) nativo de Next.js, WebSockets con Pusher/Socket.io, o React Query con `refetchInterval` + `staleTime`.
- **Prioridad**: Baja — el polling actual es suficiente para MVP.

---

## Integración de calendarios del coach (Google/Gmail + iCloud)

- **Descripción**: Permitir que un coach conecte su calendario para leer sus bloques ocupados (free/busy) y bloquear automáticamente esas horas al agendar clases o sesiones 1:1. Debe soportar Google Calendar (cuenta Gmail/Google Workspace) e iCloud Calendar.
- **Estado actual**: Hecho para Google Calendar (issue #16). Agenda 1:1 con disponibilidad del coach (`/coach/schedule`, `/sessions`) y conexión de Google Calendar por OAuth en solo lectura (alcance `calendar.freebusy`): refresh token cifrado (`src/lib/calendar-crypto.ts`), caché de horas ocupadas de 5 minutos (`CalendarBusyBlock`, `src/lib/calendar-sync.ts`), sincronizar y desconectar desde "Mi agenda". Variables: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `CALENDAR_TOKEN_ENCRYPTION_KEY` (ver `.env.example`). **Fuera por ahora:** iCloud/CalDAV (descartado el 9/11/2026), selector de calendarios (solo se lee el principal), bloqueos manuales y verificación de la app de Google para producción.
- **Prioridad**: Media.
- **Esfuerzo**: XL.
- **Dependencias**: agenda/citas 1:1 de clientes, modelo de disponibilidad, OAuth/CalDAV y cifrado de credenciales.
- **Alcance propuesto**:
  - **Google Calendar (Gmail)**: OAuth 2.0 con scope `calendar.freebusy` (preferido) o `calendar.readonly`; refresh token por coach; consulta `freebusy.query`; timezone del calendario; verificación de la app de Google para producción.
  - **iCloud Calendar**: CalDAV con contraseña específica de app (app-specific password); descubrimiento de principal y calendarios; `free-busy-query`/`REPORT`; credenciales cifradas en reposo; manejo de 2FA y rate limits.
  - **Modelo**: `CoachCalendarConnection` (provider, credenciales cifradas, calendarId, timezone, status, lastSyncAt) y caché `BusyBlock`/`Availability` para no consultar el proveedor en cada request.
  - **API**: `/api/coach/calendar/connect`, `/callback`, `/sync`, `/availability`, `/disconnect`; validación de conflictos al crear `Class` o cita.
  - **UI**: sección “Calendario” en `/profile/settings` o `/coach/agenda`: conectar/desconectar, estado, última sincronización, selector de calendarios y fallback manual de bloqueos.
  - **Privacidad**: leer solo free/busy, no títulos ni detalles de eventos; explicar el scope; permitir revocar el acceso; no guardar credenciales en texto plano.
  - **Casos borde**: zonas horarias/DST, eventos de todo el día, calendarios compartidos, token expirado, proveedor caído, sync incremental y fallback si no hay conexión.
  - **Fases sugeridas**: (1) bloqueos manuales + clases internas del coach; (2) Google freebusy; (3) iCloud CalDAV.
- **Tests**: parsing de free/busy, conflicto de horario, token refresh/revoke, cifrado/descifrado, integración con proveedores mockeados y E2E conectar → sincronizar → intentar agendar en horario ocupado → bloqueo.
