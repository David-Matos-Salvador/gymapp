# Características Pendientes de Implementar

---

## Diferidos de la ronda de validación (2026-10-17)

Quedan fuera de alcance por decisión D-06 de `docs/decisions/validation-fixes.md`:

- **F-03 — Historial real de entrenamientos**: `/rutinas/[planId]/historial` sigue mostrando el placeholder "en construcción". Implementar la consulta de `WorkoutLog` del plan y renderizar el historial en una ronda aparte.
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
