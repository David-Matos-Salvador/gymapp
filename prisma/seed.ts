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

  // ── Staff ───────────────────────────────────────────
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

  // Trainer 2: sin clientes — el usuario los agregará manualmente
  const trainer2 = await prisma.user.upsert({
    where: { email: "trainer2@gymapp.com" },
    update: {},
    create: {
      email: "trainer2@gymapp.com", name: "Coach Andrea", password: passwordHash, role: "TRAINER",
      phone: "+5255988776644", sex: "FEMALE", gymId: gym.id, birthDate: new Date("1992-03-22"),
      bio: "Especialista en rehabilitación y entrenamiento funcional",
      specialties: ["REHABILITATION", "FUNCTIONAL", "STRENGTH"],
      certifications: ["NSCA-CSCS", "CrossFit Level 2"],
      yearsExperience: 8,
      onboardingCompleted: true,
    },
  })

  // ── Members (each a different scenario) ─────────────
  //
  // Scenario 1: Fresh signup — no onboarding, no coach, no plan
  const laura = await prisma.user.upsert({
    where: { email: "laura@gymapp.com" },
    update: {},
    create: {
      email: "laura@gymapp.com", name: "Laura Gómez", password: passwordHash, role: "MEMBER",
      phone: "+5255100112233", sex: "FEMALE", gymId: gym.id,
      onboardingCompleted: false,
    },
  })

  // Scenario 2: Coach assigned before onboarding — has plan, no onboarding
  const diego = await prisma.user.upsert({
    where: { email: "diego@gymapp.com" },
    update: {},
    create: {
      email: "diego@gymapp.com", name: "Diego Vargas", password: passwordHash, role: "MEMBER",
      phone: "+5255100223344", sex: "MALE", gymId: gym.id,
      assignedTrainerId: trainer.id,
      onboardingCompleted: false,
    },
  })

  // Scenario 3: Onboarding done but no plan chosen yet
  const valentina = await prisma.user.upsert({
    where: { email: "valentina@gymapp.com" },
    update: {},
    create: {
      email: "valentina@gymapp.com", name: "Valentina Ríos", password: passwordHash, role: "MEMBER",
      phone: "+5255100334455", sex: "FEMALE", gymId: gym.id, birthDate: new Date("1999-08-12"),
      objective: "GENERAL_FITNESS", experienceLevel: "BEGINNER", trainingFrequency: 3,
      height: 165, weight: 63,
      onboardingCompleted: true, onboardingCompletedAt: new Date(),
      onboardingData: { objective: "GENERAL_FITNESS", experienceLevel: "BEGINNER", trainingFrequency: 3, height: 165, weight: 63 },
    },
  })

  // Scenario 4: Active plan, 0 workouts
  const mateo = await prisma.user.upsert({
    where: { email: "mateo@gymapp.com" },
    update: {},
    create: {
      email: "mateo@gymapp.com", name: "Mateo Herrera", password: passwordHash, role: "MEMBER",
      phone: "+5255100445566", sex: "MALE", gymId: gym.id, birthDate: new Date("1993-11-03"),
      objective: "MUSCLE_GAIN", experienceLevel: "INTERMEDIATE", trainingFrequency: 4,
      height: 178, weight: 78,
      onboardingCompleted: true, onboardingCompletedAt: new Date(),
      onboardingData: { objective: "MUSCLE_GAIN", experienceLevel: "INTERMEDIATE", trainingFrequency: 4, height: 178, weight: 78 },
    },
  })

  // Scenario 5: Expired membership
  const sofia = await prisma.user.upsert({
    where: { email: "sofia@gymapp.com" },
    update: {},
    create: {
      email: "sofia@gymapp.com", name: "Sofía Castillo", password: passwordHash, role: "MEMBER",
      phone: "+5255100556677", sex: "FEMALE", gymId: gym.id, birthDate: new Date("2000-01-25"),
      objective: "WEIGHT_LOSS", experienceLevel: "BEGINNER", trainingFrequency: 3,
      height: 160, weight: 85,
      assignedTrainerId: trainer.id,
      onboardingCompleted: true, onboardingCompletedAt: new Date(Date.now() - 30 * 86400000),
      onboardingData: { objective: "WEIGHT_LOSS", experienceLevel: "BEGINNER", trainingFrequency: 3, height: 160, weight: 85 },
    },
  })

  // Scenario 6: Inactive / suspended membership
  const ricardo = await prisma.user.upsert({
    where: { email: "ricardo@gymapp.com" },
    update: {},
    create: {
      email: "ricardo@gymapp.com", name: "Ricardo Medina", password: passwordHash, role: "MEMBER",
      phone: "+5255100667788", sex: "MALE", gymId: gym.id, birthDate: new Date("1985-05-17"),
      objective: "STRENGTH", experienceLevel: "ADVANCED", trainingFrequency: 4,
      height: 182, weight: 92,
      assignedTrainerId: trainer.id,
      onboardingCompleted: true, onboardingCompletedAt: new Date(Date.now() - 60 * 86400000),
      onboardingData: { objective: "STRENGTH", experienceLevel: "ADVANCED", trainingFrequency: 4, height: 182, weight: 92 },
    },
  })

  // Scenario 7: Power user — active plan, several workouts (Carlos)
  const carlos = await prisma.user.upsert({
    where: { email: "carlos@gymapp.com" },
    update: {},
    create: {
      email: "carlos@gymapp.com", name: "Carlos Rodríguez", password: passwordHash, role: "MEMBER",
      phone: "+5255112233445", sex: "MALE", birthDate: new Date("1995-03-22"),
      objective: "MUSCLE_GAIN", experienceLevel: "INTERMEDIATE", trainingFrequency: 3,
      height: 175, weight: 82,
      medicalNotes: "Lesión de rodilla izquierda en 2022. Evitar impacto alto.",
      emergencyContact: "María Rodríguez", emergencyPhone: "+5255111223344",
      assignedTrainerId: trainer.id, gymId: gym.id,
      onboardingCompleted: true, onboardingCompletedAt: new Date(Date.now() - 14 * 86400000),
      onboardingData: { objective: "MUSCLE_GAIN", experienceLevel: "INTERMEDIATE", trainingFrequency: 3, height: 175, weight: 82 },
    },
  })

  // Scenario 8: Regular active user (Ana)
  const ana = await prisma.user.upsert({
    where: { email: "ana@gymapp.com" },
    update: {},
    create: {
      email: "ana@gymapp.com", name: "Ana López", password: passwordHash, role: "MEMBER",
      phone: "+5255667788990", sex: "FEMALE", birthDate: new Date("1998-11-08"),
      objective: "WEIGHT_LOSS", experienceLevel: "BEGINNER", trainingFrequency: 3,
      height: 168, weight: 72,
      emergencyContact: "Sofía López", emergencyPhone: "+5255998877665",
      assignedTrainerId: trainer.id, gymId: gym.id,
      onboardingCompleted: true, onboardingCompletedAt: new Date(Date.now() - 10 * 86400000),
      onboardingData: { objective: "WEIGHT_LOSS", experienceLevel: "BEGINNER", trainingFrequency: 3, height: 168, weight: 72 },
    },
  })

  // Scenario 9: Active with advanced plan (Pedro)
  const pedro = await prisma.user.upsert({
    where: { email: "pedro@gymapp.com" },
    update: {},
    create: {
      email: "pedro@gymapp.com", name: "Pedro Sánchez", password: passwordHash, role: "MEMBER",
      phone: "+5255443322110", sex: "MALE", birthDate: new Date("1988-07-14"),
      objective: "STRENGTH", experienceLevel: "ADVANCED", trainingFrequency: 3,
      height: 185, weight: 95,
      assignedTrainerId: trainer.id, gymId: gym.id,
      onboardingCompleted: true, onboardingCompletedAt: new Date(Date.now() - 21 * 86400000),
      onboardingData: { objective: "STRENGTH", experienceLevel: "ADVANCED", trainingFrequency: 3, height: 185, weight: 95 },
    },
  })

  // Scenario 10: Onboarding done, no coach — ideal para trainer2
  const roberto = await prisma.user.upsert({
    where: { email: "roberto@gymapp.com" },
    update: {},
    create: {
      email: "roberto@gymapp.com", name: "Roberto Navarro", password: passwordHash, role: "MEMBER",
      phone: "+5255999887766", sex: "MALE", birthDate: new Date("1996-01-30"),
      objective: "MUSCLE_GAIN", experienceLevel: "INTERMEDIATE", trainingFrequency: 4,
      height: 172, weight: 70, gymId: gym.id,
      onboardingCompleted: true, onboardingCompletedAt: new Date(),
      onboardingData: { objective: "MUSCLE_GAIN", experienceLevel: "INTERMEDIATE", trainingFrequency: 4, height: 172, weight: 70 },
    },
  })

  console.log("✅ Users created (10 members + 3 staff)")

  // ── Membership Plans ────────────────────────────────
  const plans = await Promise.all([
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Plan Semanal", price: 150, currency: "MXN", durationDays: 7 } }),
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Plan Mensual", price: 500, currency: "MXN", durationDays: 30 } }),
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Plan Trimestral", price: 1200, currency: "MXN", durationDays: 90 } }),
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Plan Anual", price: 4000, currency: "MXN", durationDays: 365, description: "Ahorra 33% vs mensual" } }),
    prisma.membershipPlan.create({ data: { gymId: gym.id, name: "Pase Diario", price: 50, currency: "MXN", durationDays: 1 } }),
  ])

  // ── Memberships (varied statuses) ───────────────────
  const now = new Date()
  const endDate30 = new Date(now.getTime() + 30 * 86400000)
  const endDate90 = new Date(now.getTime() + 90 * 86400000)
  const endDate365 = new Date(now.getTime() + 365 * 86400000)
  const expiredDate = new Date(now.getTime() - 5 * 86400000)

  const memberships = [
    // ACTIVE memberships
    { userId: carlos.id, planId: plans[3].id, status: "ACTIVE" as const, startDate: now, endDate: endDate365, paymentConfirmed: true, paymentMethod: "CASH" as const },
    { userId: ana.id, planId: plans[1].id, status: "ACTIVE" as const, startDate: now, endDate: endDate30, paymentConfirmed: true, paymentMethod: "TRANSFER" as const, paymentRef: "TRF-001" },
    { userId: pedro.id, planId: plans[2].id, status: "ACTIVE" as const, startDate: now, endDate: endDate90, paymentConfirmed: true, paymentMethod: "CASH" as const },
    { userId: mateo.id, planId: plans[1].id, status: "ACTIVE" as const, startDate: now, endDate: endDate30, paymentConfirmed: true, paymentMethod: "CARD" as const },
    { userId: diego.id, planId: plans[2].id, status: "ACTIVE" as const, startDate: now, endDate: endDate90, paymentConfirmed: true, paymentMethod: "STRIPE" as const },
    // EXPIRED membership
    { userId: sofia.id, planId: plans[1].id, status: "EXPIRED" as const, startDate: new Date(now.getTime() - 35 * 86400000), endDate: expiredDate, paymentConfirmed: true, paymentMethod: "TRANSFER" as const, paymentRef: "TRF-002" },
    // INACTIVE / SUSPENDED
    { userId: ricardo.id, planId: plans[2].id, status: "INACTIVE" as const, startDate: new Date(now.getTime() - 60 * 86400000), endDate: new Date(now.getTime() - 30 * 86400000), paymentConfirmed: true, paymentMethod: "CASH" as const },
    // No membership for laura and valentina (fresh / pending)
  ]

  await prisma.membership.createMany({ data: memberships })

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

  // ── Platform Plans (SUPER_ADMIN) ────────────────────
  const plan1 = await prisma.routinePlan.create({
    data: {
      userId: superadmin.id,
      name: "Cuerpo Completo Principiante",
      description: "Rutina ideal para empezar. Trabaja todo el cuerpo en cada sesión con ejercicios básicos controlados.",
      objective: "GENERAL_FITNESS", frequency: 3, difficulty: "BEGINNER",
      splits: {
        create: [
          { label: "A", name: "Full Body A", description: "Enfoque en press y empuje", muscleGroups: ["FULL_BODY"], estimatedDuration: 55, order: 0,
            exercises: { create: [
              { exerciseId: exercises[0].id, sets: 3, reps: "10-12", weight: 30, restSeconds: 75, order: 0 },
              { exerciseId: exercises[14].id, sets: 3, reps: "10-12", weight: 30, restSeconds: 90, order: 1 },
              { exerciseId: exercises[5].id, sets: 3, reps: "10-12", weight: 25, restSeconds: 75, order: 2 },
              { exerciseId: exercises[8].id, sets: 3, reps: "10-12", weight: 20, restSeconds: 75, order: 3 },
              { exerciseId: exercises[21].id, sets: 3, reps: "30s", weight: 0, restSeconds: 60, order: 4 },
            ] },
          },
          { label: "B", name: "Full Body B", description: "Enfoque en tirón y piernas", muscleGroups: ["FULL_BODY"], estimatedDuration: 55, order: 1,
            exercises: { create: [
              { exerciseId: exercises[7].id, sets: 3, reps: "10-12", weight: 50, restSeconds: 90, order: 0 },
              { exerciseId: exercises[4].id, sets: 3, reps: "8-10", weight: 0, restSeconds: 90, order: 1 },
              { exerciseId: exercises[18].id, sets: 3, reps: "10-12", weight: 12, restSeconds: 60, order: 2 },
              { exerciseId: exercises[19].id, sets: 3, reps: "10-12", weight: 30, restSeconds: 75, order: 3 },
              { exerciseId: exercises[22].id, sets: 3, reps: "15", weight: 0, restSeconds: 60, order: 4 },
            ] },
          },
          { label: "C", name: "Full Body C", description: "Enfoque en fuerza y core", muscleGroups: ["FULL_BODY"], estimatedDuration: 50, order: 2,
            exercises: { create: [
              { exerciseId: exercises[0].id, sets: 3, reps: "8-10", weight: 35, restSeconds: 90, order: 0 },
              { exerciseId: exercises[14].id, sets: 3, reps: "8-10", weight: 35, restSeconds: 90, order: 1 },
              { exerciseId: exercises[10].id, sets: 3, reps: "12-15", weight: 15, restSeconds: 60, order: 2 },
              { exerciseId: exercises[9].id, sets: 3, reps: "12-15", weight: 5, restSeconds: 60, order: 3 },
              { exerciseId: exercises[22].id, sets: 3, reps: "20", weight: 0, restSeconds: 60, order: 4 },
            ] },
          },
        ],
      },
    },
  })

  const plan2 = await prisma.routinePlan.create({
    data: {
      userId: superadmin.id,
      name: "Quema Grasa Metabólico",
      description: "Circuito metabólico para maximizar quema calórica. Alta intensidad, poco descanso.",
      objective: "WEIGHT_LOSS", frequency: 3, difficulty: "INTERMEDIATE",
      splits: {
        create: [
          { label: "A", name: "Circuito A", description: "Full body alta intensidad", muscleGroups: ["FULL_BODY", "CARDIO"], estimatedDuration: 45, order: 0,
            exercises: { create: [
              { exerciseId: exercises[23].id, sets: 4, reps: "12", weight: 0, restSeconds: 45, order: 0 },
              { exerciseId: exercises[24].id, sets: 4, reps: "15", weight: 16, restSeconds: 45, order: 1 },
              { exerciseId: exercises[14].id, sets: 3, reps: "12-15", weight: 50, restSeconds: 60, order: 2 },
              { exerciseId: exercises[18].id, sets: 3, reps: "12", weight: 14, restSeconds: 60, order: 3 },
              { exerciseId: exercises[21].id, sets: 3, reps: "45s", weight: 0, restSeconds: 45, order: 4 },
            ] },
          },
          { label: "B", name: "Circuito B", description: "Empuje y core", muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS", "ABS"], estimatedDuration: 45, order: 1,
            exercises: { create: [
              { exerciseId: exercises[3].id, sets: 4, reps: "10-12", weight: 0, restSeconds: 45, order: 0 },
              { exerciseId: exercises[0].id, sets: 3, reps: "12-15", weight: 40, restSeconds: 60, order: 1 },
              { exerciseId: exercises[9].id, sets: 3, reps: "15", weight: 7, restSeconds: 45, order: 2 },
              { exerciseId: exercises[12].id, sets: 3, reps: "12-15", weight: 15, restSeconds: 45, order: 3 },
              { exerciseId: exercises[21].id, sets: 3, reps: "60s", weight: 0, restSeconds: 45, order: 4 },
            ] },
          },
          { label: "C", name: "Circuito C", description: "Tracción y piernas", muscleGroups: ["BACK", "BICEPS", "LEGS", "GLUTES"], estimatedDuration: 50, order: 2,
            exercises: { create: [
              { exerciseId: exercises[5].id, sets: 3, reps: "12-15", weight: 35, restSeconds: 60, order: 0 },
              { exerciseId: exercises[4].id, sets: 3, reps: "8-10", weight: 0, restSeconds: 60, order: 1 },
              { exerciseId: exercises[15].id, sets: 3, reps: "15", weight: 90, restSeconds: 60, order: 2 },
              { exerciseId: exercises[16].id, sets: 3, reps: "15", weight: 40, restSeconds: 45, order: 3 },
              { exerciseId: exercises[20].id, sets: 4, reps: "15-20", weight: 45, restSeconds: 45, order: 4 },
            ] },
          },
        ],
      },
    },
  })

  const plan3 = await prisma.routinePlan.create({
    data: {
      userId: superadmin.id,
      name: "Hipertrofia Push-Pull-Legs",
      description: "Split PPL para ganancia muscular. Volumen óptimo con sobrecarga progresiva.",
      objective: "MUSCLE_GAIN", frequency: 3, difficulty: "ADVANCED",
      splits: {
        create: [
          { label: "A", name: "Push (Empuje)", description: "Pecho, hombros y tríceps", muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS"], estimatedDuration: 65, order: 0,
            exercises: { create: [
              { exerciseId: exercises[0].id, sets: 4, reps: "6-8", weight: 70, restSeconds: 90, order: 0 },
              { exerciseId: exercises[1].id, sets: 3, reps: "8-10", weight: 24, restSeconds: 75, order: 1 },
              { exerciseId: exercises[8].id, sets: 4, reps: "6-8", weight: 45, restSeconds: 90, order: 2 },
              { exerciseId: exercises[9].id, sets: 3, reps: "12-15", weight: 10, restSeconds: 60, order: 3 },
              { exerciseId: exercises[12].id, sets: 3, reps: "10-12", weight: 22.5, restSeconds: 60, order: 4 },
              { exerciseId: exercises[13].id, sets: 3, reps: "12-15", weight: 18, restSeconds: 45, order: 5 },
            ] },
          },
          { label: "B", name: "Pull (Tracción)", description: "Espalda y bíceps", muscleGroups: ["BACK", "BICEPS", "FOREARMS"], estimatedDuration: 55, order: 1,
            exercises: { create: [
              { exerciseId: exercises[7].id, sets: 4, reps: "6-8", weight: 100, restSeconds: 120, order: 0 },
              { exerciseId: exercises[5].id, sets: 4, reps: "8-10", weight: 55, restSeconds: 90, order: 1 },
              { exerciseId: exercises[6].id, sets: 3, reps: "10-12", weight: 55, restSeconds: 75, order: 2 },
              { exerciseId: exercises[4].id, sets: 3, reps: "8-10", weight: 0, restSeconds: 90, order: 3 },
              { exerciseId: exercises[10].id, sets: 3, reps: "10-12", weight: 30, restSeconds: 60, order: 4 },
            ] },
          },
          { label: "C", name: "Legs (Piernas)", description: "Cuádriceps, isquiotibiales, glúteos y gemelos", muscleGroups: ["LEGS", "GLUTES", "CALVES"], estimatedDuration: 60, order: 2,
            exercises: { create: [
              { exerciseId: exercises[14].id, sets: 4, reps: "6-8", weight: 90, restSeconds: 120, order: 0 },
              { exerciseId: exercises[15].id, sets: 3, reps: "10-12", weight: 120, restSeconds: 90, order: 1 },
              { exerciseId: exercises[17].id, sets: 3, reps: "10-12", weight: 45, restSeconds: 60, order: 2 },
              { exerciseId: exercises[19].id, sets: 4, reps: "8-10", weight: 70, restSeconds: 75, order: 3 },
              { exerciseId: exercises[20].id, sets: 4, reps: "12-15", weight: 60, restSeconds: 60, order: 4 },
            ] },
          },
        ],
      },
    },
  })

  console.log("✅ Platform plans created")

  // ── Coach Plans ─────────────────────────────────────
  const coachPlan1 = await prisma.routinePlan.create({
    data: {
      userId: trainer.id,
      name: "Fuerza 5x5 Modificada",
      description: "Rutina de fuerza básica. Pocos ejercicios, mucho peso, resultados comprobados.",
      objective: "STRENGTH", frequency: 3, difficulty: "INTERMEDIATE",
      splits: {
        create: [
          { label: "A", name: "Fuerza A", description: "Sentadilla y press", muscleGroups: ["LEGS", "CHEST", "BACK"], estimatedDuration: 70, order: 0,
            exercises: { create: [
              { exerciseId: exercises[14].id, sets: 5, reps: "5", weight: 105, restSeconds: 180, order: 0 },
              { exerciseId: exercises[0].id, sets: 5, reps: "5", weight: 75, restSeconds: 180, order: 1 },
              { exerciseId: exercises[5].id, sets: 5, reps: "5", weight: 50, restSeconds: 150, order: 2 },
            ] },
          },
          { label: "B", name: "Fuerza B", description: "Peso muerto y press militar", muscleGroups: ["BACK", "SHOULDERS", "LEGS"], estimatedDuration: 70, order: 1,
            exercises: { create: [
              { exerciseId: exercises[7].id, sets: 5, reps: "5", weight: 120, restSeconds: 180, order: 0 },
              { exerciseId: exercises[8].id, sets: 5, reps: "5", weight: 50, restSeconds: 150, order: 1 },
              { exerciseId: exercises[4].id, sets: 3, reps: "8", weight: 0, restSeconds: 120, order: 2 },
            ] },
          },
          { label: "C", name: "Fuerza C", description: "Accesorios y explosividad", muscleGroups: ["LEGS", "GLUTES", "ABS"], estimatedDuration: 55, order: 2,
            exercises: { create: [
              { exerciseId: exercises[19].id, sets: 4, reps: "8", weight: 90, restSeconds: 90, order: 0 },
              { exerciseId: exercises[10].id, sets: 3, reps: "8", weight: 35, restSeconds: 75, order: 1 },
              { exerciseId: exercises[22].id, sets: 3, reps: "15", weight: 0, restSeconds: 60, order: 2 },
              { exerciseId: exercises[20].id, sets: 3, reps: "12", weight: 70, restSeconds: 60, order: 3 },
            ] },
          },
        ],
      },
    },
  })

  // Coach plan for weight loss (for Ana and Sofia)
  const coachPlan2 = await prisma.routinePlan.create({
    data: {
      userId: trainer.id,
      name: "Definición 4x por Semana",
      description: "Rutina enfocada en pérdida de grasa con alto volumen y descansos cortos.",
      objective: "WEIGHT_LOSS", frequency: 4, difficulty: "BEGINNER",
      splits: {
        create: [
          { label: "A", name: "Superior Empuje", description: "Pecho, hombros, tríceps", muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS"], estimatedDuration: 50, order: 0,
            exercises: { create: [
              { exerciseId: exercises[1].id, sets: 3, reps: "12-15", weight: 10, restSeconds: 60, order: 0 },
              { exerciseId: exercises[9].id, sets: 3, reps: "15-20", weight: 5, restSeconds: 45, order: 1 },
              { exerciseId: exercises[12].id, sets: 3, reps: "15", weight: 12, restSeconds: 45, order: 2 },
              { exerciseId: exercises[21].id, sets: 3, reps: "30s", weight: 0, restSeconds: 45, order: 3 },
            ] },
          },
          { label: "B", name: "Inferior + Core", description: "Piernas, glúteos y abdomen", muscleGroups: ["LEGS", "GLUTES", "ABS"], estimatedDuration: 55, order: 1,
            exercises: { create: [
              { exerciseId: exercises[14].id, sets: 3, reps: "12-15", weight: 35, restSeconds: 75, order: 0 },
              { exerciseId: exercises[18].id, sets: 3, reps: "12", weight: 10, restSeconds: 60, order: 1 },
              { exerciseId: exercises[19].id, sets: 3, reps: "15", weight: 30, restSeconds: 60, order: 2 },
              { exerciseId: exercises[22].id, sets: 3, reps: "15", weight: 0, restSeconds: 45, order: 3 },
            ] },
          },
          { label: "C", name: "Superior Tracción", description: "Espalda, bíceps, deltoides posterior", muscleGroups: ["BACK", "BICEPS", "SHOULDERS"], estimatedDuration: 50, order: 2,
            exercises: { create: [
              { exerciseId: exercises[6].id, sets: 3, reps: "12-15", weight: 40, restSeconds: 60, order: 0 },
              { exerciseId: exercises[10].id, sets: 3, reps: "12-15", weight: 15, restSeconds: 45, order: 1 },
              { exerciseId: exercises[4].id, sets: 3, reps: "8-10", weight: 0, restSeconds: 75, order: 2 },
            ] },
          },
          { label: "D", name: "Full Body Cardio", description: "Circuito completo con cardio", muscleGroups: ["FULL_BODY", "CARDIO"], estimatedDuration: 45, order: 3,
            exercises: { create: [
              { exerciseId: exercises[23].id, sets: 3, reps: "10-12", weight: 0, restSeconds: 45, order: 0 },
              { exerciseId: exercises[24].id, sets: 3, reps: "15", weight: 14, restSeconds: 45, order: 1 },
              { exerciseId: exercises[3].id, sets: 3, reps: "8-10", weight: 0, restSeconds: 60, order: 2 },
              { exerciseId: exercises[21].id, sets: 3, reps: "60s", weight: 0, restSeconds: 45, order: 3 },
            ] },
          },
        ],
      },
    },
  })

  console.log("✅ Coach plans created")

  // ── Plan Assignments ────────────────────────────────
  // Fetch splits for later workout logs
  const pplSplits = await prisma.routineSplit.findMany({ where: { planId: plan3.id }, orderBy: { order: "asc" } })
  const quemaSplits = await prisma.routineSplit.findMany({ where: { planId: plan2.id }, orderBy: { order: "asc" } })
  const definicionSplits = await prisma.routineSplit.findMany({ where: { planId: coachPlan2.id }, orderBy: { order: "asc" } })

  // Diego (Scenario 2): plan assigned by coach before onboarding
  await prisma.assignedRoutinePlan.create({
    data: { userId: diego.id, planId: coachPlan1.id },
  })

  // Mateo (Scenario 4): active plan, 0 workouts — his own plan via onboarding
  await prisma.assignedRoutinePlan.create({
    data: { userId: mateo.id, planId: plan1.id, startedAt: new Date(Date.now() - 2 * 86400000) },
  })

  // Sofia (Scenario 5): expired membership, still has an assigned plan
  await prisma.assignedRoutinePlan.create({
    data: { userId: sofia.id, planId: plan2.id, startedAt: new Date(Date.now() - 28 * 86400000) },
  })

  // Ricardo (Scenario 6): inactive membership, has plan
  await prisma.assignedRoutinePlan.create({
    data: { userId: ricardo.id, planId: coachPlan1.id, startedAt: new Date(Date.now() - 55 * 86400000) },
  })

  // Carlos (Scenario 7): power user — PPL plan
  await prisma.assignedRoutinePlan.create({
    data: { userId: carlos.id, planId: plan3.id, startedAt: new Date(Date.now() - 14 * 86400000) },
  })

  // Ana (Scenario 8): regular — weight loss plan
  await prisma.assignedRoutinePlan.create({
    data: { userId: ana.id, planId: plan2.id, startedAt: new Date(Date.now() - 10 * 86400000) },
  })

  // Pedro (Scenario 9): advanced — coach plan
  await prisma.assignedRoutinePlan.create({
    data: { userId: pedro.id, planId: coachPlan1.id, startedAt: new Date(Date.now() - 21 * 86400000) },
  })

  console.log("✅ Plan assignments created")

  // NOTE: laura (fresh) and valentina (onboarding done, no plan) have NO assignment

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
  await prisma.booking.create({ data: { userId: carlos.id, classId: class1.id, status: "CONFIRMED" } })
  await prisma.booking.create({ data: { userId: ana.id, classId: class2.id, status: "CONFIRMED" } })
  await prisma.booking.create({ data: { userId: mateo.id, classId: class1.id, status: "CONFIRMED" } })
  console.log("✅ Bookings created")

  // ── Workout Logs ────────────────────────────────────
  // Carlos: 3 workouts this week (all splits completed)
  const carlosLogs = []
  if (pplSplits.length >= 3) {
    // Today - Split C (Legs)
    carlosLogs.push(await prisma.workoutLog.create({
      data: { userId: carlos.id, splitId: pplSplits[2].id, date: new Date(), duration: 70, notes: "Piernas pesadas. Buena congestión." },
    }))
    // Yesterday - Split B (Pull)
    carlosLogs.push(await prisma.workoutLog.create({
      data: { userId: carlos.id, splitId: pplSplits[1].id, date: new Date(Date.now() - 1 * 86400000), duration: 55, notes: "Dominadas más fáciles." },
    }))
    // Day before - Split A (Push)
    carlosLogs.push(await prisma.workoutLog.create({
      data: { userId: carlos.id, splitId: pplSplits[0].id, date: new Date(Date.now() - 2 * 86400000), duration: 65, notes: "Subí peso en press de banca." },
    }))
  }

  // Ana: 1 workout this week
  const anaLo = []
  if (quemaSplits.length >= 1) {
    anaLo.push(await prisma.workoutLog.create({
      data: { userId: ana.id, splitId: quemaSplits[0].id, date: new Date(Date.now() - 1 * 86400000), duration: 48, notes: "Buen circuito, buena energía." },
    }))
  }

  // Pedro: 3 workouts spread across 3 weeks
  if (pplSplits.length >= 3) {
    await prisma.workoutLog.create({
      data: { userId: pedro.id, splitId: pplSplits[0].id, date: new Date(Date.now() - 14 * 86400000), duration: 60 },
    })
    await prisma.workoutLog.create({
      data: { userId: pedro.id, splitId: pplSplits[1].id, date: new Date(Date.now() - 7 * 86400000), duration: 55 },
    })
  }

  // Sofia (expired): last workout 4 weeks ago
  if (quemaSplits.length >= 1) {
    await prisma.workoutLog.create({
      data: { userId: sofia.id, splitId: quemaSplits[0].id, date: new Date(Date.now() - 28 * 86400000), duration: 50 },
    })
  }

  // Ricardo (inactive): last workout 5 weeks ago
  if (definicionSplits.length >= 1) {
    await prisma.workoutLog.create({
      data: { userId: ricardo.id, splitId: definicionSplits[0].id, date: new Date(Date.now() - 35 * 86400000), duration: 45 },
    })
  }

  // Set logs for Carlos
  if (carlosLogs.length >= 1) {
    const pushLog = carlosLogs.find((l) => l?.splitId === pplSplits[0]?.id)
    const pullLog = carlosLogs.find((l) => l?.splitId === pplSplits[1]?.id)
    if (pushLog && pullLog) {
      await prisma.workoutSetLog.createMany({
        data: [
          { workoutLogId: pushLog.id, exerciseId: exercises[0].id, exerciseName: "Press de banca", setNumber: 1, reps: 8, weight: 80 },
          { workoutLogId: pushLog.id, exerciseId: exercises[0].id, exerciseName: "Press de banca", setNumber: 2, reps: 8, weight: 82.5 },
          { workoutLogId: pushLog.id, exerciseId: exercises[0].id, exerciseName: "Press de banca", setNumber: 3, reps: 7, weight: 85 },
          { workoutLogId: pushLog.id, exerciseId: exercises[0].id, exerciseName: "Press de banca", setNumber: 4, reps: 6, weight: 85 },
          { workoutLogId: pullLog.id, exerciseId: exercises[4].id, exerciseName: "Dominadas", setNumber: 1, reps: 10, weight: 0 },
          { workoutLogId: pullLog.id, exerciseId: exercises[4].id, exerciseName: "Dominadas", setNumber: 2, reps: 9, weight: 0 },
          { workoutLogId: pullLog.id, exerciseId: exercises[4].id, exerciseName: "Dominadas", setNumber: 3, reps: 8, weight: 0 },
          { workoutLogId: pullLog.id, exerciseId: exercises[4].id, exerciseName: "Dominadas", setNumber: 4, reps: 7, weight: 0 },
        ],
      })
    }
  }
  console.log("✅ Workout logs created")

  // ── Check-ins ───────────────────────────────────────
  // Carlos: 7-day streak
  for (let i = 6; i >= 0; i--) {
    await prisma.checkIn.create({ data: { userId: carlos.id, gymId: gym.id, date: new Date(Date.now() - i * 86400000) } })
  }
  // Ana: 5-day streak
  for (let i = 4; i >= 0; i--) {
    await prisma.checkIn.create({ data: { userId: ana.id, gymId: gym.id, date: new Date(Date.now() - i * 86400000) } })
  }
  console.log("✅ Check-ins created")

  // ── Body Measurements ───────────────────────────────
  // Carlos: 4 measurements over 28 days
  const weeksAgo = [28, 21, 14, 7]
  for (const d of weeksAgo) {
    const baseWeight = 78 + (28 - d) * 0.3
    await prisma.bodyMeasurement.create({
      data: {
        userId: carlos.id, date: new Date(Date.now() - d * 86400000),
        weight: baseWeight, height: 175, bodyFat: 18.5 - (28 - d) * 0.15,
        muscleMass: 59 + (28 - d) * 0.2,
        neck: 38, shoulders: 118, chest: 98, waist: 86 - (28 - d) * 0.2,
        hips: 95,
        leftArm: 35 + (28 - d) * 0.1, rightArm: 35.5 + (28 - d) * 0.1,
        leftForearm: 29, rightForearm: 29.5,
        leftThigh: 56, rightThigh: 56.5,
        leftCalf: 37, rightCalf: 37.5,
      },
    })
  }

  // Ana: 4 measurements
  for (const d of weeksAgo) {
    const baseWeight = 68 - (28 - d) * 0.25
    await prisma.bodyMeasurement.create({
      data: {
        userId: ana.id, date: new Date(Date.now() - d * 86400000),
        weight: baseWeight, height: 168, bodyFat: 28 - (28 - d) * 0.2,
        muscleMass: 44 + (28 - d) * 0.15,
        neck: 32, shoulders: 96, chest: 88,
        waist: 80 - (28 - d) * 0.3, hips: 98 - (28 - d) * 0.2,
        leftArm: 27 + (28 - d) * 0.05, rightArm: 27.5 + (28 - d) * 0.05,
        leftForearm: 23, rightForearm: 23,
        leftThigh: 52, rightThigh: 52.5,
        leftCalf: 34, rightCalf: 34,
      },
    })
  }
  console.log("✅ Body measurements created")

  // ── Notifications ───────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: carlos.id, title: "¡Bienvenido a Fitness Total!", message: "Tu rutina Push-Pull-Legs está lista. Empezá hoy.", type: "INFO" },
      { userId: ana.id, title: "Bienvenida Ana", message: "Coach Martínez te asignó una rutina. ¡Buena suerte!", type: "INFO" },
      { userId: pedro.id, title: "Bienvenido Pedro", message: "Tu rutina de fuerza avanzada está lista.", type: "INFO" },
      { userId: laura.id, title: "¡Te damos la bienvenida Laura!", message: "Completá tu perfil para recibir una rutina personalizada.", type: "INFO" },
      { userId: diego.id, title: "Coach Martínez te asignó", message: "Tu entrenador ya te preparó una rutina. Empezá cuando quieras.", type: "INFO" },
      { userId: valentina.id, title: "Perfil completado", message: "Elegí una rutina para comenzar tu entrenamiento.", type: "INFO" },
      { userId: sofia.id, title: "Membresía vencida", message: "Tu membresía expiró. Renová para seguir entrenando.", type: "WARNING" },
      { userId: ricardo.id, title: "Membresía suspendida", message: "Tu cuenta está temporalmente inactiva. Contactá al administrador.", type: "WARNING" },
    ],
  })
  console.log("✅ Notifications created")

  // ── Trainer Requests (demo) ─────────────────────────
  // Trainer 2 (Coach Andrea) sends a request to valentina (onboarding done, no coach)
  await prisma.trainerRequest.create({
    data: {
      trainerId: trainer2.id,
      clientId: valentina.id,
      status: "PENDING",
    },
  })

  await prisma.notification.create({
    data: {
      userId: valentina.id,
      title: "Solicitud de entrenador",
      message: "Coach Andrea quiere ser tu coach. Revisa y acepta la solicitud.",
      type: "TRAINER_REQUEST",
      metadata: { trainerId: trainer2.id, trainerName: "Coach Andrea" },
    },
  })
  console.log("✅ Trainer requests created")

  // ── Payment example (pending Yape payment) ──────────
  await prisma.payment.create({
    data: {
      userId: mateo.id,
      amount: 500,
      currency: "MXN",
      status: "PENDING",
      method: "YAPE",
      type: "MEMBERSHIP",
      receiptUrl: null,
    },
  })
  console.log("✅ Payment examples created")

  console.log("\n🎉 Seed completed!")
  console.log("\n📋 Login credentials (password: demo123):")
  console.log("  Staff:")
  console.log("    Super Admin:  superadmin@gymapp.com")
  console.log("    Admin:        admin@gymapp.com")
  console.log("    Trainer:      trainer@gymapp.com    — Coach Martínez, 6 clientes asignados")
  console.log("    Trainer 2:    trainer2@gymapp.com   — Coach Andrea, 0 clientes, 1 solicitud pendiente (Valentina)")
  console.log("  Members:")
  console.log("    🆕 Laura       laura@gymapp.com      — sin onboarding, sin coach, sin plan")
  console.log("    🏋️ Diego       diego@gymapp.com      — coach asignado, sin onboarding aún")
  console.log("    📋 Valentina   valentina@gymapp.com  — onboarding done, tiene solicitud pendiente de Coach Andrea")
  console.log("    🌱 Mateo       mateo@gymapp.com      — plan activo, 0 workouts, pago Yape pendiente")
  console.log("    ⚠️  Sofia       sofia@gymapp.com      — membresía EXPIRADA")
  console.log("    🚫 Ricardo     ricardo@gymapp.com    — membresía INACTIVA")
  console.log("    💪 Carlos      carlos@gymapp.com     — power user, 3 workouts esta semana")
  console.log("    🔥 Ana         ana@gymapp.com        — activa, 1 workout esta semana")
  console.log("    🏆 Pedro       pedro@gymapp.com      — avanzado, workouts esporádicos")
  console.log("    🧑 Roberto     roberto@gymapp.com    — onboarding done, SIN coach (ideal para asignar con trainer2)")
  console.log("\n🔄 Flujo trainer→cliente:")
  console.log("  1. Login como trainer2, busca 'roberto' en /coach, envía solicitud")
  console.log("  2. Login como roberto, ve a /requests, acepta la solicitud")
  console.log("  3. Roberto elige plan, sube comprobante Yape")
  console.log("  4. Login como trainer2, ve a /coach/payments, confirma el pago")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
