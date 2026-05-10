import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  console.log("🌱 Seeding database...")
  const passwordHash = await bcrypt.hash("demo123", 10)

  // ── Gym ──────────────────────────────────────────────
  const gym = await prisma.gym.upsert({
    where: { slug: "fitness-total" },
    update: {},
    create: {
      name: "Fitness Total",
      slug: "fitness-total",
      address: "Av. Revolución 123, CDMX",
      phone: "+525512345678",
      email: "info@fitnesstotal.mx",
    },
  })

  // ── Users ───────────────────────────────────────────
  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@gymapp.com" },
    update: {},
    create: {
      email: "superadmin@gymapp.com", name: "Super Admin", password: passwordHash, role: "SUPER_ADMIN",
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: "admin@gymapp.com" },
    update: {},
    create: {
      email: "admin@gymapp.com", name: "Admin Gym", password: passwordHash, role: "ADMIN",
      phone: "+5255999112233", sex: "MALE", gymId: gym.id,
    },
  })

  const trainer = await prisma.user.upsert({
    where: { email: "trainer@gymapp.com" },
    update: {},
    create: {
      email: "trainer@gymapp.com", name: "Coach Martínez", password: passwordHash, role: "TRAINER",
      phone: "+5255988776655", sex: "MALE", gymId: gym.id, birthDate: new Date("1990-06-15"),
    },
  })

  const member1 = await prisma.user.upsert({
    where: { email: "carlos@gymapp.com" },
    update: {},
    create: {
      email: "carlos@gymapp.com", name: "Carlos Rodríguez", password: passwordHash, role: "MEMBER",
      phone: "+5255112233445", sex: "MALE", birthDate: new Date("1995-03-22"),
      objective: "MUSCLE_GAIN", experienceLevel: "INTERMEDIATE",
      medicalNotes: "Lesión de rodilla izquierda en 2022. Evitar impacto alto.",
      emergencyContact: "María Rodríguez", emergencyPhone: "+5255111223344",
      assignedTrainerId: trainer.id, gymId: gym.id,
    },
  })

  const member2 = await prisma.user.upsert({
    where: { email: "ana@gymapp.com" },
    update: {},
    create: {
      email: "ana@gymapp.com", name: "Ana López", password: passwordHash, role: "MEMBER",
      phone: "+5255667788990", sex: "FEMALE", birthDate: new Date("1998-11-08"),
      objective: "WEIGHT_LOSS", experienceLevel: "BEGINNER",
      emergencyContact: "Sofía López", emergencyPhone: "+5255998877665",
      assignedTrainerId: trainer.id, gymId: gym.id,
    },
  })

  const member3 = await prisma.user.upsert({
    where: { email: "pedro@gymapp.com" },
    update: {},
    create: {
      email: "pedro@gymapp.com", name: "Pedro Sánchez", password: passwordHash, role: "MEMBER",
      phone: "+5255443322110", sex: "MALE", birthDate: new Date("1988-07-14"),
      objective: "STRENGTH", experienceLevel: "ADVANCED",
      assignedTrainerId: trainer.id, gymId: gym.id,
    },
  })

  console.log("✅ Users created")

  // ── Membership Plans ────────────────────────────────
  const plans = await Promise.all([
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Plan Semanal", price: 150, currency: "MXN", durationDays: 7 } }),
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Plan Mensual", price: 500, currency: "MXN", durationDays: 30 } }),
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Plan Trimestral", price: 1200, currency: "MXN", durationDays: 90 } }),
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Plan Anual", price: 4000, currency: "MXN", durationDays: 365, description: "Ahorra 33% vs mensual" } }),
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Pase Diario", price: 50, currency: "MXN", durationDays: 1 } }),
  ])

  // ── Memberships ─────────────────────────────────────
  const startDate = new Date()
  const endDate30 = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  const endDate90 = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000)
  const expiredDate = new Date(startDate.getTime() - 5 * 24 * 60 * 60 * 1000)

  await prisma.membership.createMany({
    data: [
      { userId: member1.id, planId: plans[3].id, status: "ACTIVE", startDate, endDate: new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000), paymentConfirmed: true, paymentMethod: "CASH" },
      { userId: member2.id, planId: plans[1].id, status: "ACTIVE", startDate, endDate: endDate30, paymentConfirmed: true, paymentMethod: "TRANSFER", paymentRef: "TRF-001" },
      { userId: member3.id, planId: plans[2].id, status: "ACTIVE", startDate, endDate: endDate90, paymentConfirmed: true, paymentMethod: "CASH" },
    ],
  })

  console.log("✅ Membership plans and memberships created")

  // ── Exercises ───────────────────────────────────────
  const exercises = await Promise.all([
    prisma.exercise.create({ data: { name: "Press de banca", description: "Press con barra en banco plano.", muscleGroup: "CHEST", equipment: "BARBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Press inclinado con mancuernas", description: "Press en banco inclinado 30-45°.", muscleGroup: "CHEST", equipment: "DUMBBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Aperturas con mancuernas", description: "Aislamiento para pectoral.", muscleGroup: "CHEST", equipment: "DUMBBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Fondos en paralelas", description: "Fondos enfatizando pecho.", muscleGroup: "CHEST", equipment: "BODYWEIGHT", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Dominadas", description: "Dominadas con agarre prono.", muscleGroup: "BACK", equipment: "BODYWEIGHT", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Remo con barra", description: "Remo inclinado con barra.", muscleGroup: "BACK", equipment: "BARBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Jalón al pecho", description: "Jalón en polea alta.", muscleGroup: "BACK", equipment: "CABLE", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Peso muerto", description: "Peso muerto convencional.", muscleGroup: "BACK", equipment: "BARBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Press militar", description: "Press de hombro con barra.", muscleGroup: "SHOULDERS", equipment: "BARBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Elevaciones laterales", description: "Para deltoides lateral.", muscleGroup: "SHOULDERS", equipment: "DUMBBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Curl con barra", description: "Curl de bíceps clásico.", muscleGroup: "BICEPS", equipment: "BARBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Curl martillo", description: "Curl alterno neutro.", muscleGroup: "BICEPS", equipment: "DUMBBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Press francés", description: "Extensión de tríceps con EZ.", muscleGroup: "TRICEPS", equipment: "EZ_BAR", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Extensión en polea", description: "Tríceps en polea con cuerda.", muscleGroup: "TRICEPS", equipment: "CABLE", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Sentadilla", description: "Sentadilla libre con barra.", muscleGroup: "LEGS", equipment: "BARBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Prensa de piernas", description: "Prensa inclinada.", muscleGroup: "LEGS", equipment: "MACHINE", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Extensión de cuádriceps", description: "Aislamiento cuádriceps.", muscleGroup: "LEGS", equipment: "MACHINE", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Curl femoral", description: "Aislamiento isquiotibiales.", muscleGroup: "LEGS", equipment: "MACHINE", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Zancadas con mancuernas", description: "Zancadas alternas.", muscleGroup: "LEGS", equipment: "DUMBBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Hip thrust", description: "Empuje de cadera con barra.", muscleGroup: "GLUTES", equipment: "BARBELL", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Elevación de talones", description: "Gemelos en máquina.", muscleGroup: "CALVES", equipment: "MACHINE", category: "Strength" } }),
    prisma.exercise.create({ data: { name: "Plancha", description: "Plancha isométrica core.", muscleGroup: "ABS", equipment: "BODYWEIGHT", category: "Core" } }),
    prisma.exercise.create({ data: { name: "Elevaciones de piernas", description: "Colgado de barra.", muscleGroup: "ABS", equipment: "BODYWEIGHT", category: "Core" } }),
    prisma.exercise.create({ data: { name: "Burpees", description: "Full body + cardio.", muscleGroup: "FULL_BODY", equipment: "BODYWEIGHT", category: "Cardio" } }),
    prisma.exercise.create({ data: { name: "Kettlebell swing", description: "Potencia y cardio.", muscleGroup: "FULL_BODY", equipment: "KETTLEBELL", category: "Cardio" } }),
  ])
  console.log(`✅ ${exercises.length} exercises created`)

  // ── Platform Routines (SUPER_ADMIN templates) ────────
  const platformRoutines = [
    {
      userId: superadmin.id,
      name: "Principiante - Cuerpo Completo",
      description: "Rutina ideal para empezar. Trabaja todo el cuerpo en cada sesión con ejercicios básicos controlados.",
      targetObjective: "GENERAL_FITNESS",
      difficulty: "BEGINNER",
      exercises: [
        { exercise: exercises[0], sets: 3, reps: 10, weight: 20, restSeconds: 75, order: 0 },
        { exercise: exercises[14], sets: 3, reps: 10, weight: 30, restSeconds: 90, order: 1 },
        { exercise: exercises[5], sets: 3, reps: 10, weight: 15, restSeconds: 75, order: 2 },
        { exercise: exercises[8], sets: 3, reps: 10, weight: 15, restSeconds: 75, order: 3 },
        { exercise: exercises[21], sets: 3, reps: 30, weight: 0, restSeconds: 60, order: 4 },
        { exercise: exercises[22], sets: 3, reps: 10, weight: 0, restSeconds: 60, order: 5 },
      ],
    },
    {
      userId: superadmin.id,
      name: "Quema Grasa",
      description: "Circuito metabólico para maximizar quema calórica. Alta intensidad, poco descanso.",
      targetObjective: "WEIGHT_LOSS",
      difficulty: "INTERMEDIATE",
      exercises: [
        { exercise: exercises[23], sets: 4, reps: 12, weight: 0, restSeconds: 45, order: 0 },
        { exercise: exercises[24], sets: 4, reps: 15, weight: 16, restSeconds: 45, order: 1 },
        { exercise: exercises[14], sets: 3, reps: 15, weight: 40, restSeconds: 60, order: 2 },
        { exercise: exercises[18], sets: 3, reps: 12, weight: 12, restSeconds: 60, order: 3 },
        { exercise: exercises[3], sets: 3, reps: 10, weight: 0, restSeconds: 60, order: 4 },
        { exercise: exercises[5], sets: 3, reps: 12, weight: 25, restSeconds: 60, order: 5 },
        { exercise: exercises[21], sets: 3, reps: 45, weight: 0, restSeconds: 45, order: 6 },
      ],
    },
    {
      userId: superadmin.id,
      name: "Hipertrofia Push-Pull-Legs",
      description: "Split PPL para ganancia muscular. Volumen óptimo con sobrecarga progresiva.",
      targetObjective: "MUSCLE_GAIN",
      difficulty: "ADVANCED",
      exercises: [
        { exercise: exercises[0], sets: 4, reps: 8, weight: 60, restSeconds: 90, order: 0 },
        { exercise: exercises[1], sets: 3, reps: 10, weight: 22, restSeconds: 75, order: 1 },
        { exercise: exercises[14], sets: 4, reps: 8, weight: 80, restSeconds: 120, order: 2 },
        { exercise: exercises[15], sets: 3, reps: 10, weight: 100, restSeconds: 90, order: 3 },
        { exercise: exercises[5], sets: 4, reps: 8, weight: 40, restSeconds: 90, order: 4 },
        { exercise: exercises[4], sets: 3, reps: 8, weight: 0, restSeconds: 90, order: 5 },
        { exercise: exercises[8], sets: 4, reps: 8, weight: 40, restSeconds: 90, order: 6 },
        { exercise: exercises[10], sets: 3, reps: 10, weight: 25, restSeconds: 60, order: 7 },
      ],
    },
    {
      userId: superadmin.id,
      name: "Tonificación y Definición",
      description: "Enfoque en definición muscular con pesos moderados y altas repeticiones.",
      targetObjective: "UNSURE",
      difficulty: "BEGINNER",
      exercises: [
        { exercise: exercises[0], sets: 3, reps: 12, weight: 15, restSeconds: 60, order: 0 },
        { exercise: exercises[14], sets: 3, reps: 12, weight: 20, restSeconds: 75, order: 1 },
        { exercise: exercises[9], sets: 3, reps: 15, weight: 6, restSeconds: 60, order: 2 },
        { exercise: exercises[2], sets: 3, reps: 12, weight: 8, restSeconds: 60, order: 3 },
        { exercise: exercises[19], sets: 3, reps: 12, weight: 30, restSeconds: 60, order: 4 },
        { exercise: exercises[11], sets: 3, reps: 12, weight: 8, restSeconds: 60, order: 5 },
        { exercise: exercises[10], sets: 3, reps: 12, weight: 12, restSeconds: 60, order: 6 },
      ],
    },
    {
      userId: superadmin.id,
      name: "Fuerza 5x5",
      description: "Rutina de fuerza básica. Pocos ejercicios, mucho peso, resultados comprobados.",
      targetObjective: "MUSCLE_GAIN",
      difficulty: "INTERMEDIATE",
      exercises: [
        { exercise: exercises[14], sets: 5, reps: 5, weight: 100, restSeconds: 180, order: 0 },
        { exercise: exercises[0], sets: 5, reps: 5, weight: 70, restSeconds: 180, order: 1 },
        { exercise: exercises[7], sets: 5, reps: 5, weight: 100, restSeconds: 180, order: 2 },
        { exercise: exercises[8], sets: 5, reps: 5, weight: 45, restSeconds: 150, order: 3 },
        { exercise: exercises[5], sets: 5, reps: 5, weight: 35, restSeconds: 150, order: 4 },
      ],
    },
    {
      userId: superadmin.id,
      name: "Cuerpo en Movimiento",
      description: "Rutina funcional con ejercicios corporales y pesos libres. Ideal para mejorar forma física general.",
      targetObjective: "GENERAL_FITNESS",
      difficulty: "BEGINNER",
      exercises: [
        { exercise: exercises[18], sets: 3, reps: 10, weight: 10, restSeconds: 60, order: 0 },
        { exercise: exercises[3], sets: 3, reps: 8, weight: 0, restSeconds: 60, order: 1 },
        { exercise: exercises[4], sets: 3, reps: 6, weight: 0, restSeconds: 75, order: 2 },
        { exercise: exercises[9], sets: 3, reps: 12, weight: 8, restSeconds: 60, order: 3 },
        { exercise: exercises[12], sets: 3, reps: 12, weight: 15, restSeconds: 60, order: 4 },
        { exercise: exercises[23], sets: 3, reps: 10, weight: 0, restSeconds: 60, order: 5 },
        { exercise: exercises[21], sets: 3, reps: 30, weight: 0, restSeconds: 45, order: 6 },
      ],
    },
  ]

  for (const r of platformRoutines) {
    await prisma.routine.create({
      data: {
        name: r.name,
        description: r.description,
        userId: r.userId,
        exercises: {
          create: r.exercises.map((e) => ({
            exerciseId: e.exercise.id,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            restSeconds: e.restSeconds,
            order: e.order,
          })),
        },
      },
    })
  }
  console.log(`✅ ${platformRoutines.length} platform routines created`)


  // ── Routines ────────────────────────────────────────
  const routines = [
    {
      userId: trainer.id, name: "Push (Empuje)", description: "Pecho, hombros y tríceps. Split PPL.",
      exercises: [
        { exercise: exercises[0], sets: 4, reps: 8, weight: 80, restSeconds: 90, order: 0 },
        { exercise: exercises[1], sets: 3, reps: 10, weight: 30, restSeconds: 75, order: 1 },
        { exercise: exercises[2], sets: 3, reps: 12, weight: 14, restSeconds: 60, order: 2 },
        { exercise: exercises[8], sets: 4, reps: 8, weight: 50, restSeconds: 90, order: 3 },
        { exercise: exercises[9], sets: 3, reps: 12, weight: 10, restSeconds: 60, order: 4 },
        { exercise: exercises[12], sets: 3, reps: 12, weight: 25, restSeconds: 60, order: 5 },
        { exercise: exercises[13], sets: 3, reps: 15, weight: 18, restSeconds: 45, order: 6 },
      ],
    },
    {
      userId: trainer.id, name: "Pull (Tracción)", description: "Espalda y bíceps. Split PPL.",
      exercises: [
        { exercise: exercises[4], sets: 4, reps: 8, weight: 0, restSeconds: 90, order: 0 },
        { exercise: exercises[5], sets: 4, reps: 8, weight: 60, restSeconds: 90, order: 1 },
        { exercise: exercises[6], sets: 3, reps: 10, weight: 50, restSeconds: 75, order: 2 },
        { exercise: exercises[10], sets: 3, reps: 12, weight: 30, restSeconds: 60, order: 3 },
        { exercise: exercises[11], sets: 3, reps: 12, weight: 14, restSeconds: 60, order: 4 },
      ],
    },
    {
      userId: trainer.id, name: "Legs (Piernas)", description: "Cuádriceps, isquiotibiales, glúteos y gemelos.",
      exercises: [
        { exercise: exercises[14], sets: 4, reps: 8, weight: 100, restSeconds: 120, order: 0 },
        { exercise: exercises[15], sets: 3, reps: 10, weight: 140, restSeconds: 90, order: 1 },
        { exercise: exercises[16], sets: 3, reps: 12, weight: 55, restSeconds: 60, order: 2 },
        { exercise: exercises[17], sets: 3, reps: 12, weight: 45, restSeconds: 60, order: 3 },
        { exercise: exercises[19], sets: 4, reps: 10, weight: 80, restSeconds: 75, order: 4 },
        { exercise: exercises[20], sets: 4, reps: 15, weight: 60, restSeconds: 60, order: 5 },
      ],
    },
    {
      userId: trainer.id, name: "Full Body", description: "Rutina completa para principiantes.", assignedToId: member2.id,
      exercises: [
        { exercise: exercises[0], sets: 3, reps: 10, weight: 30, restSeconds: 75, order: 0 },
        { exercise: exercises[14], sets: 3, reps: 10, weight: 40, restSeconds: 90, order: 1 },
        { exercise: exercises[5], sets: 3, reps: 10, weight: 25, restSeconds: 75, order: 2 },
        { exercise: exercises[8], sets: 3, reps: 10, weight: 20, restSeconds: 75, order: 3 },
        { exercise: exercises[22], sets: 3, reps: 1, weight: 0, restSeconds: 60, order: 4 },
      ],
    },
    {
      userId: trainer.id, name: "Fuerza Avanzada", description: "Rutina de fuerza 5x5 modificada.", assignedToId: member3.id,
      exercises: [
        { exercise: exercises[14], sets: 5, reps: 5, weight: 120, restSeconds: 180, order: 0 },
        { exercise: exercises[0], sets: 5, reps: 5, weight: 90, restSeconds: 180, order: 1 },
        { exercise: exercises[7], sets: 5, reps: 5, weight: 140, restSeconds: 180, order: 2 },
        { exercise: exercises[8], sets: 5, reps: 5, weight: 55, restSeconds: 150, order: 3 },
        { exercise: exercises[4], sets: 5, reps: 5, weight: 0, restSeconds: 150, order: 4 },
      ],
    },
  ]

  const createdRoutines = []
  for (const r of routines) {
    const routine = await prisma.routine.create({
      data: {
        name: r.name, description: r.description, userId: r.userId,
        assignedToId: (r as { assignedToId?: string }).assignedToId,
        exercises: {
          create: r.exercises.map((e) => ({
            exerciseId: e.exercise.id, sets: e.sets, reps: e.reps, weight: e.weight,
            restSeconds: e.restSeconds, order: e.order,
          })),
        },
      },
    })
    createdRoutines.push(routine)
  }
  console.log("✅ Routines created")

  // ── Classes ─────────────────────────────────────────
  const class1 = await prisma.class.create({
    data: {
      name: "HIIT Intenso", description: "Entrenamiento interválico de alta intensidad.",
      trainerId: trainer.id, gymId: gym.id, capacity: 15, duration: 45,
      dayOfWeek: "MONDAY", schedule: new Date("2026-05-11T07:00:00-06:00"),
    },
  })
  const class2 = await prisma.class.create({
    data: {
      name: "Yoga Vinyasa", description: "Fluidez de posturas sincronizadas.",
      trainerId: trainer.id, gymId: gym.id, capacity: 20, duration: 60,
      dayOfWeek: "WEDNESDAY", schedule: new Date("2026-05-13T18:00:00-06:00"),
    },
  })
  console.log("✅ Classes created")

  // ── Bookings ────────────────────────────────────────
  await prisma.booking.create({ data: { userId: member1.id, classId: class1.id, status: "CONFIRMED" } })
  await prisma.booking.create({ data: { userId: member2.id, classId: class2.id, status: "CONFIRMED" } })
  console.log("✅ Bookings created")

  // ── Workout Logs ────────────────────────────────────
  const log1 = await prisma.workoutLog.create({
    data: {
      userId: member1.id, routineId: createdRoutines[0].id,
      date: new Date(Date.now() - 3 * 86400000), duration: 65, notes: "Subí peso en press de banca.",
    },
  })
  const log2 = await prisma.workoutLog.create({
    data: {
      userId: member1.id, routineId: createdRoutines[1].id,
      date: new Date(Date.now() - 2 * 86400000), duration: 55, notes: "Dominadas más fáciles.",
    },
  })
  const log3 = await prisma.workoutLog.create({
    data: {
      userId: member1.id, routineId: createdRoutines[2].id,
      date: new Date(Date.now() - 86400000), duration: 70, notes: "Piernas pesadas. Buena congestión.",
    },
  })

  await prisma.workoutSetLog.createMany({
    data: [
      { workoutLogId: log1.id, exerciseId: exercises[0].id, exerciseName: "Press de banca", setNumber: 1, reps: 8, weight: 80 },
      { workoutLogId: log1.id, exerciseId: exercises[0].id, exerciseName: "Press de banca", setNumber: 2, reps: 8, weight: 82.5 },
      { workoutLogId: log1.id, exerciseId: exercises[0].id, exerciseName: "Press de banca", setNumber: 3, reps: 7, weight: 85 },
      { workoutLogId: log1.id, exerciseId: exercises[0].id, exerciseName: "Press de banca", setNumber: 4, reps: 6, weight: 85 },
      { workoutLogId: log2.id, exerciseId: exercises[4].id, exerciseName: "Dominadas", setNumber: 1, reps: 10, weight: 0 },
      { workoutLogId: log2.id, exerciseId: exercises[4].id, exerciseName: "Dominadas", setNumber: 2, reps: 9, weight: 0 },
      { workoutLogId: log2.id, exerciseId: exercises[4].id, exerciseName: "Dominadas", setNumber: 3, reps: 8, weight: 0 },
      { workoutLogId: log2.id, exerciseId: exercises[4].id, exerciseName: "Dominadas", setNumber: 4, reps: 7, weight: 0 },
    ],
  })
  console.log("✅ Workout logs created")

  // ── Check-ins ───────────────────────────────────────
  for (let i = 6; i >= 0; i--) {
    await prisma.checkIn.create({ data: { userId: member1.id, gymId: gym.id, date: new Date(Date.now() - i * 86400000) } })
  }
  for (let i = 4; i >= 0; i--) {
    await prisma.checkIn.create({ data: { userId: member2.id, gymId: gym.id, date: new Date(Date.now() - i * 86400000) } })
  }
  console.log("✅ Check-ins created")

  // ── Body Measurements ───────────────────────────────
  const weeksAgo = [28, 21, 14, 7]
  for (const d of weeksAgo) {
    const baseWeight = 78 + (28 - d) * 0.3
    await prisma.bodyMeasurement.create({
      data: {
        userId: member1.id, date: new Date(Date.now() - d * 86400000),
        weight: baseWeight, bodyFat: 18.5 - (28 - d) * 0.15,
        chest: 98, waist: 86 - (28 - d) * 0.2, leftArm: 35 + (28 - d) * 0.1, leftThigh: 56,
      },
    })
  }

  for (const d of weeksAgo) {
    const baseWeight = 68 - (28 - d) * 0.25
    await prisma.bodyMeasurement.create({
      data: {
        userId: member2.id, date: new Date(Date.now() - d * 86400000),
        weight: baseWeight, bodyFat: 28 - (28 - d) * 0.2,
        waist: 80 - (28 - d) * 0.3, hips: 98 - (28 - d) * 0.2,
      },
    })
  }
  console.log("✅ Body measurements created")

  // ── Notifications ───────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: member1.id, title: "¡Bienvenido a Fitness Total!", message: "Gracias por registrarte. Explora tus rutinas y reserva tu primera clase.", type: "INFO" },
      { userId: member2.id, title: "Bienvenida Ana", message: "Coach Martínez es tu entrenador asignado.", type: "INFO" },
      { userId: member3.id, title: "Bienvenido Pedro", message: "Tu rutina de fuerza avanzada está lista.", type: "INFO" },
    ],
  })
  console.log("✅ Notifications created")

  console.log("\n🎉 Seed completed!")
  console.log("\n📋 Login credentials (password: demo123):")
  console.log('  Super:  superadmin@gymapp.com')
  console.log("  Admin:   admin@gymapp.com")
  console.log("  Trainer: trainer@gymapp.com")
  console.log("  Carlos:  carlos@gymapp.com")
  console.log("  Ana:     ana@gymapp.com")
  console.log("  Pedro:   pedro@gymapp.com")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
