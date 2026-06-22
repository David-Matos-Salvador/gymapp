# Business Rules

## Un usuario solo puede tener un coach

Cada miembro puede tener **un solo entrenador asignado**. Esto está implementado a nivel de schema mediante el campo `assignedTrainerId: String?` en el modelo `User`.

- Un `MEMBER` puede tener `assignedTrainerId` apuntando a un `TRAINER`.
- Un `TRAINER` puede tener muchos `clients` (usuarios cuyo `assignedTrainerId` apunta a él).
- Para reasignar un miembro a otro coach, se actualiza `assignedTrainerId`.
- No hay relación muchos-a-muchos. Un miembro no puede tener múltiples coaches simultáneamente.

## Trainers disponibles

| Email | Nombre | Clientes |
|---|---|---|
| trainer@gymapp.com | Coach Martínez | Sí (miembros seed) |
| trainer2@gymapp.com | Coach Andrea | **Ninguno** — agregar manualmente |
