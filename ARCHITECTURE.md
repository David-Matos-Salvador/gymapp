# GymApp — Arquitectura de la plataforma

> **"La infraestructura digital de los gimnasios LATAM"**  
> **"El historial fitness universal del usuario"**

---

## 1. Stack tecnológico

| Capa        | Tecnología                             | Versión       |
| ----------- | -------------------------------------- | ------------- |
| Framework   | Next.js 16 (App Router)                | 16.2.5        |
| UI          | React 19 + Tailwind CSS v4 + shadcn/ui | —             |
| Lenguaje    | TypeScript (strict)                    | ^5            |
| ORM         | Prisma v7 + PostgreSQL 16              | 7.8.0         |
| Auth        | NextAuth.js v5 (Credentials + Google)  | 5.0.0-beta.31 |
| Validación  | Zod                                    | ^4.4          |
| Forms       | react-hook-form                        | ^7.75         |
| Animaciones | Framer Motion + Canvas                 | ^12.38        |
| Charts      | Recharts                               | ^3.8          |
| Pagos       | Stripe (preparado, modo manual actual) | ^22.1         |
| Testing     | Vitest + Playwright                    | ^4.1          |

---

## 2. Tipos de usuario

| Rol           | Descripción                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN` | Administrador global de la plataforma. Ve todos los gimnasios, usuarios, ingresos. Puede crear/desactivar gimnasios. |
| `ADMIN`       | Dueño / administrador de un gimnasio específico                                                                      |
| `TRAINER`     | Entrenador que gestiona clientes, rutinas, seguimiento                                                               |
| `MEMBER`      | Cliente final que entrena y registra su progreso                                                                     |

---

## 3. Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                    # Landing page pública
│   ├── login/page.tsx              # Login (credentials + Google OAuth)
│   ├── register/page.tsx           # Registro de usuarios
│   ├── dashboard/page.tsx          # Dashboard del miembro
│   ├── my-routine/                 # Rutina del miembro
│   │   ├── page.tsx                # Rutina activa y sus días
│   │   ├── [planId]/workout/[splitId]  # Logger de entrenamiento interactivo
│   │   └── [planId]/history        # Historial de entrenamientos
│   ├── routines/                   # Gestión de rutinas (coach y admin)
│   │   ├── page.tsx                # Lista de rutinas (propias + recomendadas)
│   │   ├── [id]/page.tsx           # Detalle de rutina (server component)
│   │   └── new/page.tsx            # Crear rutina (entrenadores)
│   ├── progress/page.tsx           # Tracking corporal + gráficos
│   ├── classes/page.tsx            # Clases grupales
│   ├── equipment/page.tsx          # Catálogo de equipos del gym
│   ├── gym-equipment/page.tsx      # Gestión de equipos (admin/trainer)
│   ├── profile/page.tsx            # Perfil de usuario
│   ├── coach/
│   │   ├── page.tsx                # Dashboard del entrenador
│   │   └── clients/[id]/page.tsx   # Ficha detallada de cliente
│   ├── admin/
│   │   ├── page.tsx                # Dashboard admin con KPIs
│   │   └── memberships/page.tsx    # Gestion de membresias
  ├── super-admin/
  │   └── page.tsx                # Panel de plataforma global
│   └── api/                        # 20+ endpoints REST
├── components/
│   ├── ui/                         # Componentes shadcn/ui
│   ├── layout/shell.tsx            # Layout responsivo (sidebar + bottom nav)
│   ├── exercise-animation.tsx      # Canvas animado de ejercicios
│   ├── coach/coach-dashboard.tsx   # Panel del entrenador
│   ├── admin/                      # Componentes del panel admin
│   ├── equipment/                  # Catálogo de equipos
│   ├── gym-equipment/              # Gestión de equipos
│   ├── routines/routines-list.tsx  # Grid de tarjetas de rutinas
│   ├── dashboard/cards.tsx         # Tarjetas del dashboard
│   └── profile-form.tsx            # Formulario de perfil
├── lib/
│   ├── auth.ts                     # Configuración NextAuth v5
│   ├── prisma.ts                   # Singleton PrismaClient
│   ├── utils.ts                    # Utilidades (cn, etc.)
│   └── sounds.ts                   # Web Audio API sound effects
├── hooks/
│   ├── use-auth.ts                 # Hook de autenticación
│   └── use-sound.ts               # Hook de sonidos
├── types/
│   └── next-auth.d.ts             # Type augmentation para NextAuth
└── providers/
    └── AuthProvider.tsx            # SessionProvider wrapper
```

---

## 4. Modelos de base de datos

### Usuarios y autenticación

| Modelo    | Descripción                                               |
| --------- | --------------------------------------------------------- |
| `User`    | Usuario con datos personales, perfil, coach asignado, gym |
| `Account` | NextAuth adapter (Google OAuth)                           |
| `Session` | NextAuth adapter (JWT)                                    |

### Gimnasio

| Modelo         | Descripción                                               |
| -------------- | --------------------------------------------------------- |
| `Gym`          | Gimnasio con nombre, slug, dirección, contacto            |
| `GymEquipment` | Equipamiento del gym vinculado opcionalmente a ejercicios |

### Membresías (pago manual LATAM)

| Modelo           | Descripción                                                       |
| ---------------- | ----------------------------------------------------------------- |
| `MembershipPlan` | Planes de membresía (semanal, mensual, trimestral, anual, diario) |
| `Membership`     | Membresía activa con fechas, estado, pago confirmado              |

### Rutinas y entrenamiento

| Modelo            | Descripción                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `Routine`         | Rutina de ejercicios (asignable a cliente específico)                 |
| `Exercise`        | Catálogo de ejercicios con grupo muscular, equipo, datos de animación |
| `RoutineExercise` | Join table: ejercicios en rutinas con sets/reps/peso                  |
| `WorkoutLog`      | Registro de entrenamiento completado                                  |
| `WorkoutSetLog`   | Sets individuales con reps, peso, RPE, completado                     |

### Seguimiento

| Modelo            | Descripción                                  |
| ----------------- | -------------------------------------------- |
| `BodyMeasurement` | 18 campos de medidas corporales + peso + IMC |
| `ProgressPhoto`   | Fotos de progreso con categoría y fecha      |
| `CheckIn`         | Check-in diario al gimnasio                  |

### Clases

| Modelo    | Descripción                             |
| --------- | --------------------------------------- |
| `Class`   | Clases grupales con horario y capacidad |
| `Booking` | Reserva de clase por usuario            |

### Transacciones

| Modelo         | Descripción                                                  |
| -------------- | ------------------------------------------------------------ |
| `Payment`      | Pagos (Stripe preparado, modo efectivo/transferencia actual) |
| `Notification` | Notificaciones del sistema                                   |

---

## 5. API Endpoints

| Endpoint                      | Method           | Auth        | Descripción                     |
| ----------------------------- | ---------------- | ----------- | ------------------------------- |
| `/api/auth/[...nextauth]`     | GET/POST         | No          | NextAuth handlers               |
| `/api/auth/register`          | POST             | No          | Registro de usuario             |
| `/api/health`                 | GET              | No          | Health check                    |
| `/api/exercises`              | GET              | No          | Catálogo de ejercicios          |
| `/api/routines`               | GET/POST         | Sí          | Listar/Crear rutinas            |
| `/api/routines/[id]`          | GET/PATCH/DELETE | Sí          | CRUD de rutina                  |
| `/api/workout-logs`           | GET/POST         | Sí          | Listar/Registrar entrenamientos |
| `/api/workout-logs/[id]`      | GET/DELETE       | Sí          | Detalle/Eliminar log            |
| `/api/body-measurements`      | GET/POST         | Sí          | Listar/Registrar mediciones     |
| `/api/body-measurements/[id]` | PATCH/DELETE     | Sí          | Modificar/Eliminar medición     |
| `/api/check-ins`              | GET/POST         | Sí          | Listar/Check-in diario          |
| `/api/classes`                | GET/POST         | Parcial     | Listar/Crear clases             |
| `/api/bookings`               | POST/DELETE      | Sí          | Reservar/Cancelar clase         |
| `/api/admin/platform`         | GET              | SUPER_ADMIN | Stats globales de la plataforma |
| `/api/gyms`                   | GET/POST         | Parcial     | Listar/Crear gimnasio           |
| `/api/gym-equipment`          | GET/POST         | Sí          | Listar/Crear equipo             |
| `/api/gym-equipment/[id]`     | PATCH/DELETE     | Sí          | Modificar/Eliminar equipo       |
| `/api/membership-plans`       | GET/POST         | Parcial     | Listar/Crear planes             |
| `/api/membership-plans/[id]`  | PATCH/DELETE     | Sí          | Modificar/Eliminar plan         |
| `/api/memberships`            | GET/POST         | Sí          | Ver/Asignar membresía           |
| `/api/memberships/[id]`       | PATCH            | Sí          | Actualizar membresía            |
| `/api/members/search`         | GET              | TRAINER     | Buscar miembro por email        |
| `/api/trainer/clients`        | GET/POST         | TRAINER     | Listar/Asignar clientes         |
| `/api/trainer/clients/[id]`   | GET/DELETE       | TRAINER     | Detalle/Desasignar cliente      |
| `/api/coach-profile`          | GET/POST         | Sí          | Perfil del entrenador           |
| `/api/profile`                | GET/POST         | Sí          | Perfil del usuario              |

---

## 6. Animaciones de ejercicios (Canvas)

### Formato de datos de animación (`Exercise.animationData`)

```json
{
  "phases": [
    { "name": "concentric", "angle": 90, "duration": 1500 },
    { "name": "isometric_hold", "angle": 90, "duration": 500 },
    { "name": "eccentric", "angle": 0, "duration": 2000 }
  ],
  "joints": ["shoulder", "elbow"],
  "breathPattern": { "inhale": "eccentric", "exhale": "concentric" }
}
```

- **Fase concéntrica**: contracción del músculo (subir el peso)
- **Fase isométrica**: sostener en el punto máximo
- **Fase excéntrica**: estiramiento controlado (bajar el peso)
- **BreathPattern**: indica cuándo inhalar y exhalar

### Componente `ExerciseAnimation`

- Renderiza en HTML5 Canvas con `requestAnimationFrame`
- Dibuja stick figure anatómico con articulaciones
- Colorea en rojo el grupo muscular objetivo
- Indicador de respiración (círculo verde/azul)
- Responsive: `min-h-[250px] max-w-[300px]`
- Fallback estático si no hay datos de animación

### Cómo agregar animaciones a ejercicios

1. Crear el JSON de animación con las fases del movimiento
2. Actualizar el ejercicio vía PATCH `/api/exercises/[id]` con el campo `animationData`
3. Opcional: agregar `videoUrl` para video embebido de YouTube

---

## 7. Flujo de membresías (pago manual LATAM)

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│ Admin crea   │────▶│ Cliente paga │────▶│ Admin confirma │
│ plan de      │     │ en efectivo/ │     │ pago en panel │
│ membresía    │     │ transferencia│     │ de membresías │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
                    ┌──────────────────────────────┘
                    ▼
              ┌──────────────┐
              │ Membresía    │
              │ ACTIVA con   │
              │ fecha de     │
              │ vencimiento  │
              └──────┬───────┘
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
  Alerta 7d     Alerta 3d     Alerta 1d
  antes de       antes de       antes de
  vencer         vencer         vencer
```

---

## 8. Check-in con QR

- Cada usuario tiene un QR único (basado en `userId`)
- El admin/trainer escanea desde el panel de control
- POST `/api/check-ins` registra fecha/hora/gymId
- Reportes de asistencia: semanal, mensual, por usuario

---

## 9. Futuras integraciones

| Feature                                         | Estado                                                      |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Videos de ejercicios embebidos (YouTube/Vimeo)  | Campo `videoUrl` listo, UI pendiente                        |
| Subida de videos propios (bucket S3/Cloudinary) | Planificado                                                 |
| Canvas animados para todos los ejercicios       | 6 ejercicios priorizados, resto pendiente                   |
| Stripe pagos automáticos                        | SDK instalado, endpoints sin implementar                    |
| Landing pública por gimnasio con SEO            | Modelo Gym con slug, rutas pendientes                       |
| Notificaciones push/email                       | Modelo Notification, sin integración con servicios externos |
| Multi-idioma (PT-BR para Brasil)                | Preparado con labels traducibles                            |
| App móvil (React Native)                        | No iniciado                                                 |

---

## 10. Seed data

El seed (`prisma/seed.ts`) crea datos de prueba realistas para LATAM:

- **1 gym**: "Fitness Total" en CDMX
- **5 usuarios**: Admin, Trainer, Carlos (intermedio), Ana (principiante), Pedro (avanzado)
- **5 planes**: Semanal ($150), Mensual ($500), Trimestral ($1200), Anual ($4000), Diario ($50)
- **3 membresías activas** asignadas a Carlos, Ana y Pedro
- **25 ejercicios** con grupos musculares y equipo
- **5 rutinas**: Push, Pull, Legs, Full Body (para Ana), Fuerza Avanzada (para Pedro)
- **2 clases**: HIIT y Yoga Vinyasa
- **Workout logs** con sets individuales para Carlos
- **Mediciones corporales** semanales para Carlos y Ana
- **Check-ins** diarios de 7 días para Carlos, 5 para Ana

**Credenciales**: todas las cuentas usan password `demo123`

| Email                   | Rol         | Acceso                     |
| ----------------------- | ----------- | -------------------------- |
| `superadmin@gymapp.com` | SUPER_ADMIN | Panel global de plataforma |
| `admin@gymapp.com`      | ADMIN       | Panel de su gimnasio       |
| `trainer@gymapp.com`    | TRAINER     | Panel de coach             |
| `carlos@gymapp.com`     | MEMBER      | Dashboard de entrenamiento |

---

## 11. Patrones de código

### Auth en Server Components

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
const session = await auth()
if (!session?.user?.email) redirect("/login")
```

### Auth en API Routes

```typescript
const session = await auth()
if (!session?.user?.email) {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}
const user = await prisma.user.findUnique({ where: { email: session.user.email } })
```

### Validación con Zod

```typescript
import { z } from "zod"
const schema = z.object({ name: z.string().min(1), price: z.number().positive() })
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json(
    { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
    { status: 400 }
  )
}
```

### Params en Next.js 16

```typescript
interface RouteParams {
  params: Promise<{ id: string }>
}
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params
}
```

### Mutaciones Server Action

```typescript
async function deleteRoutine(formData: FormData) {
  "use server"
  const session = await auth()
  // ...prisma delete...
  revalidatePath("/routines")
  redirect("/routines")
}
```
