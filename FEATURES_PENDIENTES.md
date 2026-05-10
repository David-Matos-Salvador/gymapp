# Características Pendientes de Implementar

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

## Racha diaria

- **Descripción**: Mostrar días consecutivos entrenando (streak diario).
- **Estado actual**: Existe función `calculateStreak()` en el dashboard pero no se muestra en `/rutina`. Se priorizó la racha semanal.
