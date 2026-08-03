# Plan: Dueño de gym + CRUD completo de equipamiento + máquina en ejercicios

## Contexto

Estado actual detectado:
- `/equipamiento` es una página huérfana (0 links hacia ella en todo el codebase; solo se llega por URL).
- La UI de equipamiento solo soporta **crear + borrar**. El `PATCH /api/gym-equipment/[id]` ya existe y está completo (con scoping por gym para TRAINER) pero **ningún componente lo consume**.
- No existe concepto de "dueño de gym": la relación es `User.gymId → Gym` (N-1 simple). No hay `ownerId`/`owner`.
- Bug: `POST /api/gym-equipment` no valida que el `gymId` del body pertenezca al usuario.
- El catálogo de ejercicios (workout) no muestra la máquina donde se realiza cada ejercicio, aunque `GymEquipment.exerciseId` ya vincula ambos.

## Decisiones de diseño (acordadas con el usuario)

| Decisión | Valor |
|---|---|
| Modelo de dueño | `Gym.ownerId String? @unique` → `User` (1-1). El dueño conserva su rol actual |
| Quién hace CRUD de equipamiento | Dueño del gym + `SUPER_ADMIN` + `ADMIN` del mismo gym |
| Ubicación de la gestión | Tercera pestaña "Equipamiento" en `/admin/gym-management` |
| Catálogo para miembros | Se mantiene `/equipamiento` read-only para MEMBER, con link en bottom nav |
| Máquina en ejercicios | Badge "Máquina N" en la card del workout + nombre completo en el detail sheet; respeta `showMachineNumbers`; varias máquinas → se listan todas |

Fuera de alcance: gestión multi-gym para SUPER_ADMIN (sin gymId ve empty state "Sin gimnasio asignado", como hoy). No se toca el catálogo de ejercicios del admin.

## Cambios (orden de ejecución)

### 1. Schema Prisma — `prisma/schema.prisma`

En `model Gym`:
```prisma
ownerId   String?   @unique
owner     User?     @relation("GymOwner", fields: [ownerId], references: [id])
```
En `model User`:
```prisma
ownedGym  Gym?      @relation("GymOwner")
```
Luego `npx prisma generate`.

### 2. Helper de permisos — nuevo `src/lib/gym-equipment.ts`

```ts
export function canManageGymEquipment(
  user: { id: string; role: string; gymId: string | null },
  gym: { id: string; ownerId: string | null } | null
): boolean {
  if (user.role === "SUPER_ADMIN") return true
  if (!gym) return false
  if (gym.ownerId === user.id) return true
  return user.role === "ADMIN" && user.gymId === gym.id
}
```

### 3. Auth: `isGymOwner` en la sesión

- `src/lib/auth.ts`: en el provider Credentials (que ya hace `prisma.user.findUnique`), incluir `ownedGym` y exponer `isGymOwner: !!user.ownedGym` en el objeto de sesión; copiarlo en el callback `jwt`.
- `src/types/next-auth.d.ts`: agregar `isGymOwner: boolean` a `session.user`.

### 4. APIs

- `src/app/api/gym-equipment/route.ts` (POST): verificar `canManageGymEquipment(user, gym)`. Además, si `user.role !== "SUPER_ADMIN"`, forzar `gymId = user.gymId` (fix del bug: un trainer podía crear en otro gym). Cargar el gym (`where: { id: gymId }`, `select: { id: true, ownerId: true }`).
- `src/app/api/gym-equipment/[id]/route.ts` (PATCH y DELETE): reemplazar el guard actual (`role === "TRAINER" && gymId mismatch`) por `canManageGymEquipment(user, gym)` cargando el gym del equipment (`select: { id: true, ownerId: true }`).
- `src/app/api/routine-splits/[id]/route.ts`: en `GET` (línea 38) y `PATCH` (línea 81), cambiar `include: { exercise: true }` → `include: { exercise: { include: { gymEquipments: true } } }`.

### 5. Página `/admin/gym-management/page.tsx`

- Guard ampliado: permitir entrar a `ADMIN | SUPER_ADMIN | dueño del gym` (cargar gym por `user.gymId`, aceptar si `gym.ownerId === user.id`).
- Fetch adicional: `gym` (id, ownerId, showMachineNumbers) y `equipment` (con `exercise` incluido).
- Pasar a `GymManagementTabs`: `equipment`, `gym`, `canManageEquipment`.

### 6. `src/components/admin/gym-management-tabs.tsx`

- Nueva prop `equipment`, `gym`, `canManageEquipment`.
- Tercer tab "Equipamiento" (ícono `Wrench` o `Dumbbell`) renderizado solo si `canManageEquipment`.
- `TabsContent` → `<GymEquipmentManager initialEquipment={equipment} exercises={exercises} gymId={gym?.id} showMachineNumbers={gym?.showMachineNumbers} />`.

### 7. `src/components/gym-equipment/gym-equipment-manager.tsx` — CRUD completo

Replicar el patrón de `exercise-management.tsx`:
- Estado `editingId: string | null` + `dialogOpen` + `saving`.
- `openCreate()` → form vacío; `openEdit(item)` → pre-llenar form campo a campo.
- Un solo Dialog con título/CTA condicional: "Agregar equipo" / "Editar equipo", botón "Guardar" / "Guardar cambios".
- `handleSave()` ramifica: `editingId` → `PATCH /api/gym-equipment/${id}`, si no → `POST /api/gym-equipment`; actualizar estado local con `.map()`/push y `router.refresh()`.
- Botón `Pencil` (lucide) en cada card junto al `Trash2`.
- Delete con Dialog de confirmación (patrón exercise-management) en vez de borrar directo.
- Mantener: campo "Número de máquina", badges de número (imagen + header), categorías, ubicación, ejercicio vinculado.

### 8. `/equipamiento/page.tsx` — solo catálogo de miembros

- `MEMBER` → `EquipmentCatalog` (sin cambios).
- Staff con `canManageGymEquipment` → `redirect("/admin/gym-management")`.
- TRAINER sin permiso → `redirect("/dashboard")`.

### 9. Bottom nav — `src/components/layout/shell.tsx`

- `MEMBER`: link "Equipamiento" → `/equipamiento` (ícono `Wrench`/`Settings2`, no `Dumbbell` que ya usa "Mi Rutina").
- Link "Admin" (línea 67): mostrar también si `isGymOwner` (dueño con rol TRAINER/MEMBER necesita llegar a `/admin/gym-management`): `if (isAdmin || isSuperAdmin || isGymOwner)`.

### 10. Ejercicios muestran máquina

- `src/types/exercise.ts`: agregar a `Exercise`:
  ```ts
  gymEquipments?: {
    id: string; name: string; machineNumber: number | null;
    location: string | null; gymId: string
  }[]
  ```
- `src/components/workout/exercise-card.tsx`: junto al grupo muscular (líneas ~343-356), si hay `gymEquipments` del gym del usuario, mostrar badge "Máquina N" (si `showMachineNumbers` y `machineNumber != null`) o el nombre del equipo; múltiples → "Máquinas 1, 2" o "Máquinas: nombre1, nombre2".
- `src/components/workout/exercise-detail-sheet.tsx`: mostrar la máquina del gym del usuario (nombre + número si `showMachineNumbers`).
- Workout player `src/app/rutinas/[planId]/entrenar/[splitId]/page.tsx` (server component): cargar `gym` del usuario (`showMachineNumbers`) y pasar `userGymId` + `showMachineNumbers` a las cards/sheet. Filtrar `gymEquipments` por `gymId === userGymId` en el render.

### 11. Register + seed

- `src/app/api/auth/register/route.ts`: al crear gym para un `ADMIN` (líneas 48-63), reordenar para que el creador sea el owner: crear el `User` primero, crear el `Gym` con `ownerId: user.id`, luego `update` de `user.gymId`. (Alternativa simple: crear gym sin ownerId y luego `prisma.gym.update({ where: { id: gym.id }, data: { ownerId: user.id } })`).
- `prisma/seed.ts`: tras crear el admin seed (`admin@gymapp.com`, que ya tiene `gymId: gym.id`), agregar `await prisma.gym.update({ where: { id: gym.id }, data: { ownerId: admin.id } })`.

### 12. Validación

1. `npx prisma generate`
2. `npm run db:reset` (debe mostrar seed completo + owner asignado)
3. `npm run lint` (sin errores nuevos; el error existente de `.kilo/worktrees` es irrelevante)
4. `npm run test -- --run` (144 tests deben pasar)
5. Verificación manual con Playwright:
   - Login `admin@gymapp.com` → `/admin/gym-management` → tab "Equipamiento" → crear/editar/borrar equipo + número de máquina.
   - Login `trainer@gymapp.com` → sin tab "Equipamiento"; `/equipamiento` redirige a `/dashboard`.
   - Login `superadmin@gymapp.com` → tab "Equipamiento" visible (empty state sin gym).
   - Login miembro (ej. `carlos@gymapp.com`) → link "Equipamiento" en nav → catálogo con números; workout muestra "Máquina N" en ejercicios vinculados.

## Riesgos / notas

- Cambio de schema → requerido `prisma generate` + `db:reset` (pierde datos locales; el seed los repone).
- `@unique` en `ownerId` fuerza 1 gym por dueño (decisión acordada).
- El tab "Equipamiento" opera sobre el gym del usuario (`gymId`); SUPER_ADMIN sin gym ve empty state (multi-gym queda fuera de alcance).
- PATCH de routine-splits también incluye `gymEquipments` por consistencia de tipo, aunque el player solo usa el GET.
