import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
})

async function main() {
  console.log("🌱 Seeding database...")

  const passwordHash = await bcrypt.hash("demo123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@gymapp.com" },
    update: {},
    create: {
      email: "admin@gymapp.com",
      name: "Admin Gym",
      password: passwordHash,
      role: "ADMIN",
      membershipStatus: "ACTIVE",
      phone: "+1234567890",
    },
  })

  const trainer = await prisma.user.upsert({
    where: { email: "trainer@gymapp.com" },
    update: {},
    create: {
      email: "trainer@gymapp.com",
      name: "Coach Martínez",
      password: passwordHash,
      role: "TRAINER",
      membershipStatus: "ACTIVE",
      phone: "+1234567891",
    },
  })

  const member = await prisma.user.upsert({
    where: { email: "member@gymapp.com" },
    update: {},
    create: {
      email: "member@gymapp.com",
      name: "Carlos Rodríguez",
      password: passwordHash,
      role: "MEMBER",
      membershipStatus: "ACTIVE",
      phone: "+1234567892",
    },
  })

  console.log("✅ Users created")

  const exercises = await Promise.all([
    prisma.exercise.create({ data: { name: "Press de banca", description: "Press de banca con barra en banco plano. Ejercicio compuesto fundamental para el desarrollo del pectoral mayor.", category: "Strength", muscleGroup: "CHEST", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Press inclinado con mancuernas", description: "Press con mancuernas en banco inclinado a 30-45°. Mayor énfasis en el pectoral superior.", category: "Strength", muscleGroup: "CHEST", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Aperturas con mancuernas", description: "Aperturas en banco plano con mancuernas. Ejercicio de aislamiento para el pectoral.", category: "Strength", muscleGroup: "CHEST", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Fondos en paralelas", description: "Fondos en barras paralelas inclinando el torso hacia adelante para enfatizar pecho.", category: "Strength", muscleGroup: "CHEST", equipment: "BODYWEIGHT" } }),
    prisma.exercise.create({ data: { name: "Cruce de poleas", description: "Cruce de poleas altas para trabajar la parte inferior e interna del pectoral.", category: "Strength", muscleGroup: "CHEST", equipment: "CABLE" } }),
    prisma.exercise.create({ data: { name: "Dominadas", description: "Dominadas con agarre prono. Ejercicio fundamental para el desarrollo de la espalda.", category: "Strength", muscleGroup: "BACK", equipment: "BODYWEIGHT" } }),
    prisma.exercise.create({ data: { name: "Remo con barra", description: "Remo con barra inclinado. Trabaja toda la musculatura de la espalda.", category: "Strength", muscleGroup: "BACK", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Jalón al pecho", description: "Jalón en polea alta con agarre amplio. Excelente para desarrollar amplitud de espalda.", category: "Strength", muscleGroup: "BACK", equipment: "CABLE" } }),
    prisma.exercise.create({ data: { name: "Remo con mancuerna a una mano", description: "Remo unilateral con mancuerna apoyando rodilla en banco. Buen aislamiento dorsal.", category: "Strength", muscleGroup: "BACK", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Peso muerto", description: "Peso muerto convencional con barra. Ejercicio compuesto que trabaja toda la cadena posterior.", category: "Strength", muscleGroup: "BACK", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Press militar", description: "Press militar con barra de pie. Ejercicio fundamental para el desarrollo del hombro.", category: "Strength", muscleGroup: "SHOULDERS", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Elevaciones laterales", description: "Elevaciones laterales con mancuernas. Aislamiento para el deltoides lateral.", category: "Strength", muscleGroup: "SHOULDERS", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Pájaro posterior", description: "Elevaciones posteriores con mancuernas inclinado. Trabaja el deltoides posterior.", category: "Strength", muscleGroup: "SHOULDERS", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Remo al cuello", description: "Remo vertical con barra. Trabaja trapecios y deltoides.", category: "Strength", muscleGroup: "SHOULDERS", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Curl con barra", description: "Curl de bíceps con barra recta de pie. Ejercicio clásico para bíceps.", category: "Strength", muscleGroup: "BICEPS", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Curl martillo", description: "Curl alterno con mancuernas en agarre neutro. Trabaja bíceps y braquial.", category: "Strength", muscleGroup: "BICEPS", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Curl predicador", description: "Curl en banco predicador con barra EZ. Aísla el bíceps eliminando impulso.", category: "Strength", muscleGroup: "BICEPS", equipment: "EZ_BAR" } }),
    prisma.exercise.create({ data: { name: "Press francés", description: "Extensión de tríceps en banco plano con barra EZ. Excelente para el desarrollo del tríceps.", category: "Strength", muscleGroup: "TRICEPS", equipment: "EZ_BAR" } }),
    prisma.exercise.create({ data: { name: "Extensión en polea", description: "Extensión de tríceps en polea alta con cuerda. Buen aislamiento y bombeo.", category: "Strength", muscleGroup: "TRICEPS", equipment: "CABLE" } }),
    prisma.exercise.create({ data: { name: "Fondos en banco", description: "Fondos entre bancos para tríceps con peso corporal o lastre.", category: "Strength", muscleGroup: "TRICEPS", equipment: "BODYWEIGHT" } }),
    prisma.exercise.create({ data: { name: "Sentadilla", description: "Sentadilla libre con barra. El rey de los ejercicios para el desarrollo de piernas.", category: "Strength", muscleGroup: "LEGS", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Prensa de piernas", description: "Prensa inclinada en máquina. Permite cargar mucho peso con seguridad.", category: "Strength", muscleGroup: "LEGS", equipment: "MACHINE" } }),
    prisma.exercise.create({ data: { name: "Extensión de cuádriceps", description: "Extensión de piernas en máquina. Aislamiento para cuádriceps.", category: "Strength", muscleGroup: "LEGS", equipment: "MACHINE" } }),
    prisma.exercise.create({ data: { name: "Curl femoral", description: "Curl de piernas en máquina tumbado. Aislamiento para isquiotibiales.", category: "Strength", muscleGroup: "LEGS", equipment: "MACHINE" } }),
    prisma.exercise.create({ data: { name: "Zancadas con mancuernas", description: "Zancadas alternas caminando con mancuernas. Excelente para piernas y glúteos.", category: "Strength", muscleGroup: "LEGS", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Hip thrust", description: "Empuje de cadera con barra. El mejor ejercicio para el desarrollo del glúteo.", category: "Strength", muscleGroup: "GLUTES", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Peso muerto rumano", description: "Peso muerto con piernas semirrígidas. Énfasis en isquiotibiales y glúteos.", category: "Strength", muscleGroup: "GLUTES", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Elevación de talones", description: "Elevación de talones en máquina o step. Trabaja los gemelos.", category: "Strength", muscleGroup: "CALVES", equipment: "MACHINE" } }),
    prisma.exercise.create({ data: { name: "Plancha", description: "Plancha isométrica en el suelo. Fortalece todo el core.", category: "Core", muscleGroup: "ABS", equipment: "BODYWEIGHT" } }),
    prisma.exercise.create({ data: { name: "Crunch en polea", description: "Crunch abdominal arrodillado en polea alta. Añade resistencia al trabajo abdominal.", category: "Core", muscleGroup: "ABS", equipment: "CABLE" } }),
    prisma.exercise.create({ data: { name: "Elevaciones de piernas", description: "Elevaciones de piernas colgado de barra de dominadas. Excelente para abdominales inferiores.", category: "Core", muscleGroup: "ABS", equipment: "BODYWEIGHT" } }),
    prisma.exercise.create({ data: { name: "Encogimientos con barra", description: "Encogimientos de hombros con barra. Aislamiento para trapecios.", category: "Strength", muscleGroup: "TRAPS", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Press de banca con agarre cerrado", description: "Press de banca con agarre estrecho. Variante que enfatiza el tríceps.", category: "Strength", muscleGroup: "TRICEPS", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Remo al mentón", description: "Remo vertical con barra o polea. Trabaja deltoides y trapecios.", category: "Strength", muscleGroup: "SHOULDERS", equipment: "CABLE" } }),
    prisma.exercise.create({ data: { name: "Curl concentrado", description: "Curl de bíceps concentrado sentado con mancuerna. Máximo aislamiento.", category: "Strength", muscleGroup: "BICEPS", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Burpees", description: "Ejercicio completo de peso corporal que combina sentadilla, plancha y salto.", category: "Cardio", muscleGroup: "FULL_BODY", equipment: "BODYWEIGHT" } }),
    prisma.exercise.create({ data: { name: "Kettlebell swing", description: "Balanceo con kettlebell. Excelente ejercicio de potencia y cardio.", category: "Cardio", muscleGroup: "FULL_BODY", equipment: "KETTLEBELL" } }),
    prisma.exercise.create({ data: { name: "Press de hombro con mancuernas", description: "Press sentado con mancuernas. Alternativa al press militar para hombros.", category: "Strength", muscleGroup: "SHOULDERS", equipment: "DUMBBELL" } }),
    prisma.exercise.create({ data: { name: "Tirón facial", description: "Tirón facial en polea con cuerda. Excelente para salud del manguito rotador y deltoides posterior.", category: "Strength", muscleGroup: "SHOULDERS", equipment: "CABLE" } }),
    prisma.exercise.create({ data: { name: "Sentadilla búlgara", description: "Sentadilla búlgara con pie trasero elevado en banco. Intenso trabajo unilateral de pierna.", category: "Strength", muscleGroup: "LEGS", equipment: "BODYWEIGHT" } }),
  ])

  console.log(`✅ ${exercises.length} exercises created`)

  const routines = [
    {
      user: admin,
      name: "Push (Empuje)",
      description: "Rutina enfocada en pecho, hombros y tríceps. Ideal para día de empuje en split PPL.",
      exercises: [
        { exercise: exercises[0], sets: 4, reps: 8, weight: 80, restSeconds: 90, order: 0 },
        { exercise: exercises[1], sets: 3, reps: 10, weight: 30, restSeconds: 75, order: 1 },
        { exercise: exercises[10], sets: 4, reps: 8, weight: 50, restSeconds: 90, order: 2 },
        { exercise: exercises[11], sets: 3, reps: 12, weight: 12, restSeconds: 60, order: 3 },
        { exercise: exercises[17], sets: 3, reps: 12, weight: 25, restSeconds: 60, order: 4 },
        { exercise: exercises[18], sets: 3, reps: 15, weight: 20, restSeconds: 45, order: 5 },
      ],
    },
    {
      user: admin,
      name: "Pull (Tracción)",
      description: "Rutina enfocada en espalda y bíceps. Complementa el día de empuje en split PPL.",
      exercises: [
        { exercise: exercises[5], sets: 4, reps: 8, weight: 0, restSeconds: 90, order: 0 },
        { exercise: exercises[6], sets: 4, reps: 8, weight: 60, restSeconds: 90, order: 1 },
        { exercise: exercises[7], sets: 3, reps: 10, weight: 55, restSeconds: 75, order: 2 },
        { exercise: exercises[14], sets: 3, reps: 12, weight: 30, restSeconds: 60, order: 3 },
        { exercise: exercises[15], sets: 3, reps: 12, weight: 14, restSeconds: 60, order: 4 },
        { exercise: exercises[38], sets: 3, reps: 15, weight: 15, restSeconds: 45, order: 5 },
      ],
    },
    {
      user: admin,
      name: "Legs (Piernas)",
      description: "Rutina completa de piernas incluyendo cuádriceps, isquiotibiales, glúteos y gemelos.",
      exercises: [
        { exercise: exercises[20], sets: 4, reps: 8, weight: 100, restSeconds: 120, order: 0 },
        { exercise: exercises[21], sets: 3, reps: 10, weight: 160, restSeconds: 90, order: 1 },
        { exercise: exercises[24], sets: 3, reps: 12, weight: 24, restSeconds: 75, order: 2 },
        { exercise: exercises[22], sets: 3, reps: 12, weight: 55, restSeconds: 60, order: 3 },
        { exercise: exercises[23], sets: 3, reps: 12, weight: 45, restSeconds: 60, order: 4 },
        { exercise: exercises[27], sets: 4, reps: 15, weight: 80, restSeconds: 60, order: 5 },
      ],
    },
    {
      user: admin,
      name: "Full Body",
      description: "Rutina de cuerpo completo ideal para principiantes o días con poco tiempo.",
      exercises: [
        { exercise: exercises[0], sets: 3, reps: 10, weight: 60, restSeconds: 75, order: 0 },
        { exercise: exercises[20], sets: 3, reps: 10, weight: 80, restSeconds: 90, order: 1 },
        { exercise: exercises[6], sets: 3, reps: 10, weight: 50, restSeconds: 75, order: 2 },
        { exercise: exercises[10], sets: 3, reps: 10, weight: 40, restSeconds: 75, order: 3 },
        { exercise: exercises[25], sets: 3, reps: 10, weight: 70, restSeconds: 75, order: 4 },
        { exercise: exercises[28], sets: 3, reps: 1, weight: 0, restSeconds: 60, order: 5 },
      ],
    },
    {
      user: admin,
      name: "Upper Body",
      description: "Rutina de tren superior combinando pecho, espalda, hombros y brazos.",
      exercises: [
        { exercise: exercises[1], sets: 3, reps: 10, weight: 28, restSeconds: 75, order: 0 },
        { exercise: exercises[8], sets: 3, reps: 10, weight: 30, restSeconds: 75, order: 1 },
        { exercise: exercises[12], sets: 3, reps: 12, weight: 10, restSeconds: 60, order: 2 },
        { exercise: exercises[16], sets: 3, reps: 12, weight: 20, restSeconds: 60, order: 3 },
        { exercise: exercises[19], sets: 3, reps: 12, weight: 0, restSeconds: 60, order: 4 },
        { exercise: exercises[37], sets: 3, reps: 12, weight: 22, restSeconds: 60, order: 5 },
      ],
    },
  ]

  const createdRoutines = []

  for (const r of routines) {
    const routine = await prisma.routine.create({
      data: {
        name: r.name,
        description: r.description,
        userId: r.user.id,
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
    createdRoutines.push(routine)
    console.log(`  📋 Routine: ${routine.name}`)
  }

  console.log("✅ Routines created")

  const classSchedule1 = new Date()
  classSchedule1.setHours(7, 0, 0, 0)
  classSchedule1.setDate(classSchedule1.getDate() + ((1 + 7 - classSchedule1.getDay()) % 7 || 7))

  const classSchedule2 = new Date()
  classSchedule2.setHours(18, 0, 0, 0)
  classSchedule2.setDate(classSchedule2.getDate() + ((3 + 7 - classSchedule2.getDay()) % 7 || 7))

  const class1 = await prisma.class.create({
    data: {
      name: "HIIT Intenso",
      description: "Entrenamiento interválico de alta intensidad. Combina ejercicios de cardio y fuerza en circuitos cronometrados.",
      trainerId: trainer.id,
      capacity: 15,
      duration: 45,
      dayOfWeek: "MONDAY",
      schedule: classSchedule1,
    },
  })

  const class2 = await prisma.class.create({
    data: {
      name: "Yoga Vinyasa",
      description: "Fluidez de posturas sincronizadas con la respiración. Mejora flexibilidad, equilibrio y conexión mente-cuerpo.",
      trainerId: trainer.id,
      capacity: 20,
      duration: 60,
      dayOfWeek: "WEDNESDAY",
      schedule: classSchedule2,
    },
  })

  console.log("✅ Classes created")

  await prisma.booking.create({
    data: {
      userId: member.id,
      classId: class1.id,
      status: "CONFIRMED",
    },
  })

  const workoutLogs = await Promise.all([
    prisma.workoutLog.create({
      data: {
        userId: member.id,
        routineId: createdRoutines[0].id,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        duration: 65,
        notes: "Buen entrenamiento. Subí peso en press de banca.",
      },
    }),
    prisma.workoutLog.create({
      data: {
        userId: member.id,
        routineId: createdRoutines[1].id,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: 55,
        notes: "Dominadas más fáciles que la semana pasada.",
      },
    }),
    prisma.workoutLog.create({
      data: {
        userId: member.id,
        routineId: createdRoutines[2].id,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        duration: 70,
        notes: "Piernas pesadas. Buena congestión en cuádriceps.",
      },
    }),
    prisma.workoutLog.create({
      data: {
        userId: admin.id,
        routineId: createdRoutines[3].id,
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        duration: 50,
        notes: "Full body rápido pero efectivo.",
      },
    }),
  ])

  console.log(`✅ ${workoutLogs.length} workout logs created`)

  await prisma.notification.createMany({
    data: [
      {
        userId: member.id,
        title: "¡Bienvenido a GymApp!",
        message: "Gracias por registrarte. Explora tus rutinas y reserva tu primera clase.",
        type: "INFO",
      },
      {
        userId: member.id,
        title: "Clase confirmada",
        message: `Tu reserva para ${class1.name} el lunes a las 7:00 ha sido confirmada.`,
        type: "CLASS",
      },
      {
        userId: member.id,
        title: "Recordatorio de entrenamiento",
        message: "No olvides tu rutina de piernas de mañana. ¡Tus gains te esperan!",
        type: "REMINDER",
      },
    ],
  })

  console.log("✅ Notifications created")
  console.log("\n🎉 Seed completed!")
  console.log("\n📋 Users:")
  console.log("  Admin:   admin@gymapp.com / demo123")
  console.log("  Trainer: trainer@gymapp.com / demo123")
  console.log("  Member:  member@gymapp.com / demo123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
