Configura la base de datos con Prisma:

1. Define el schema de Prisma completo en `prisma/schema.prisma` con todos los modelos:
   - User, Account, Session (para NextAuth.js)
   - Routine, Exercise, RoutineExercise
   - WorkoutLog, Class, Booking
   - Payment, Notification
   - Enums: Role, MembershipStatus, DayOfWeek, MuscleGroup, Equipment, BookingStatus, PaymentStatus, PlanType, NotificationType

2. Ejecuta la migración inicial:
```bash
npx prisma migrate dev --name init
```

3. Crea el seed en `prisma/seed.ts`:
   - 30+ ejercicios con muscleGroup, equipo, descripción
   - 5 rutinas de ejemplo (push, pull, legs, full body, upper)
   - 2 clases de prueba
   - Datos demo de workout logs

4. Ejecuta el seed:
```bash
npx prisma db seed
```

5. Verifica con Prisma Studio:
```bash
npx prisma studio
```
