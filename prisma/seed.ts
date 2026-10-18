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
      showMachineNumbers: true,
    },
  })

  // ── Staff ───────────────────────────────────────────
  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@gymapp.com" },
    update: {},
    create: {
      email: "superadmin@gymapp.com",
      name: "Super Admin",
      password: passwordHash,
      role: "SUPER_ADMIN",
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: "admin@gymapp.com" },
    update: {},
    create: {
      email: "admin@gymapp.com",
      name: "Admin Gym",
      password: passwordHash,
      role: "ADMIN",
      phone: "+5255999112233",
      sex: "MALE",
      gymId: gym.id,
    },
  })

  // El admin del gym seed es el dueño del gimnasio
  await prisma.gym.update({
    where: { id: gym.id },
    data: { ownerId: admin.id },
  })

  const trainer = await prisma.user.upsert({
    where: { email: "trainer@gymapp.com" },
    update: {},
    create: {
      email: "trainer@gymapp.com",
      name: "Coach Martínez",
      password: passwordHash,
      role: "TRAINER",
      phone: "+5255988776655",
      sex: "MALE",
      gymId: gym.id,
      birthDate: new Date("1990-06-15"),
    },
  })

  // Trainer 2: sin clientes — el usuario los agregará manualmente
  const trainer2 = await prisma.user.upsert({
    where: { email: "trainer2@gymapp.com" },
    update: {},
    create: {
      email: "trainer2@gymapp.com",
      name: "Coach Andrea",
      password: passwordHash,
      role: "TRAINER",
      phone: "+5255988776644",
      sex: "FEMALE",
      gymId: gym.id,
      birthDate: new Date("1992-03-22"),
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
      email: "laura@gymapp.com",
      name: "Laura Gómez",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255100112233",
      sex: "FEMALE",
      gymId: gym.id,
      onboardingCompleted: false,
    },
  })

  // Scenario 2: Coach assigned before onboarding — has plan, no onboarding
  const diego = await prisma.user.upsert({
    where: { email: "diego@gymapp.com" },
    update: {},
    create: {
      email: "diego@gymapp.com",
      name: "Diego Vargas",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255100223344",
      sex: "MALE",
      gymId: gym.id,
      assignedTrainerId: trainer.id,
      onboardingCompleted: false,
    },
  })

  // Scenario 3: Onboarding done but no plan chosen yet
  const valentina = await prisma.user.upsert({
    where: { email: "valentina@gymapp.com" },
    update: {},
    create: {
      email: "valentina@gymapp.com",
      name: "Valentina Ríos",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255100334455",
      sex: "FEMALE",
      gymId: gym.id,
      birthDate: new Date("1999-08-12"),
      objective: "GENERAL_FITNESS",
      experienceLevel: "BEGINNER",
      trainingFrequency: 3,
      height: 165,
      weight: 63,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      onboardingData: {
        objective: "GENERAL_FITNESS",
        experienceLevel: "BEGINNER",
        trainingFrequency: 3,
        height: 165,
        weight: 63,
      },
    },
  })

  // Scenario 4: Active plan, 0 workouts
  const mateo = await prisma.user.upsert({
    where: { email: "mateo@gymapp.com" },
    update: {},
    create: {
      email: "mateo@gymapp.com",
      name: "Mateo Herrera",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255100445566",
      sex: "MALE",
      gymId: gym.id,
      birthDate: new Date("1993-11-03"),
      objective: "MUSCLE_GAIN",
      experienceLevel: "INTERMEDIATE",
      trainingFrequency: 4,
      height: 178,
      weight: 78,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      onboardingData: {
        objective: "MUSCLE_GAIN",
        experienceLevel: "INTERMEDIATE",
        trainingFrequency: 4,
        height: 178,
        weight: 78,
      },
    },
  })

  // Scenario 5: Expired membership
  const sofia = await prisma.user.upsert({
    where: { email: "sofia@gymapp.com" },
    update: {},
    create: {
      email: "sofia@gymapp.com",
      name: "Sofía Castillo",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255100556677",
      sex: "FEMALE",
      gymId: gym.id,
      birthDate: new Date("2000-01-25"),
      objective: "WEIGHT_LOSS",
      experienceLevel: "BEGINNER",
      trainingFrequency: 3,
      height: 160,
      weight: 85,
      assignedTrainerId: trainer.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(Date.now() - 30 * 86400000),
      onboardingData: {
        objective: "WEIGHT_LOSS",
        experienceLevel: "BEGINNER",
        trainingFrequency: 3,
        height: 160,
        weight: 85,
      },
    },
  })

  // Scenario 6: Inactive / suspended membership
  const ricardo = await prisma.user.upsert({
    where: { email: "ricardo@gymapp.com" },
    update: {},
    create: {
      email: "ricardo@gymapp.com",
      name: "Ricardo Medina",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255100667788",
      sex: "MALE",
      gymId: gym.id,
      birthDate: new Date("1985-05-17"),
      objective: "STRENGTH",
      experienceLevel: "ADVANCED",
      trainingFrequency: 4,
      height: 182,
      weight: 92,
      assignedTrainerId: trainer.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(Date.now() - 60 * 86400000),
      onboardingData: {
        objective: "STRENGTH",
        experienceLevel: "ADVANCED",
        trainingFrequency: 4,
        height: 182,
        weight: 92,
      },
    },
  })

  // Scenario 7: Power user — active plan, several workouts (Carlos)
  const carlos = await prisma.user.upsert({
    where: { email: "carlos@gymapp.com" },
    update: {},
    create: {
      email: "carlos@gymapp.com",
      name: "Carlos Rodríguez",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255112233445",
      sex: "MALE",
      birthDate: new Date("1995-03-22"),
      objective: "MUSCLE_GAIN",
      experienceLevel: "INTERMEDIATE",
      trainingFrequency: 3,
      height: 175,
      weight: 82,
      medicalNotes: "Lesión de rodilla izquierda en 2022. Evitar impacto alto.",
      emergencyContact: "María Rodríguez",
      emergencyPhone: "+5255111223344",
      assignedTrainerId: trainer.id,
      gymId: gym.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(Date.now() - 14 * 86400000),
      onboardingData: {
        objective: "MUSCLE_GAIN",
        experienceLevel: "INTERMEDIATE",
        trainingFrequency: 3,
        height: 175,
        weight: 82,
      },
    },
  })

  // Scenario 8: Regular active user (Ana)
  const ana = await prisma.user.upsert({
    where: { email: "ana@gymapp.com" },
    update: {},
    create: {
      email: "ana@gymapp.com",
      name: "Ana López",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255667788990",
      sex: "FEMALE",
      birthDate: new Date("1998-11-08"),
      objective: "WEIGHT_LOSS",
      experienceLevel: "BEGINNER",
      trainingFrequency: 3,
      height: 168,
      weight: 72,
      emergencyContact: "Sofía López",
      emergencyPhone: "+5255998877665",
      assignedTrainerId: trainer.id,
      gymId: gym.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(Date.now() - 10 * 86400000),
      onboardingData: {
        objective: "WEIGHT_LOSS",
        experienceLevel: "BEGINNER",
        trainingFrequency: 3,
        height: 168,
        weight: 72,
      },
    },
  })

  // Scenario 9: Active with advanced plan (Pedro)
  const pedro = await prisma.user.upsert({
    where: { email: "pedro@gymapp.com" },
    update: {},
    create: {
      email: "pedro@gymapp.com",
      name: "Pedro Sánchez",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255443322110",
      sex: "MALE",
      birthDate: new Date("1988-07-14"),
      objective: "STRENGTH",
      experienceLevel: "ADVANCED",
      trainingFrequency: 3,
      height: 185,
      weight: 95,
      assignedTrainerId: trainer.id,
      gymId: gym.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(Date.now() - 21 * 86400000),
      onboardingData: {
        objective: "STRENGTH",
        experienceLevel: "ADVANCED",
        trainingFrequency: 3,
        height: 185,
        weight: 95,
      },
    },
  })

  // Scenario 10: Onboarding done, no coach — ideal para trainer2
  await prisma.user.upsert({
    where: { email: "roberto@gymapp.com" },
    update: {},
    create: {
      email: "roberto@gymapp.com",
      name: "Roberto Navarro",
      password: passwordHash,
      role: "MEMBER",
      phone: "+5255999887766",
      sex: "MALE",
      birthDate: new Date("1996-01-30"),
      objective: "MUSCLE_GAIN",
      experienceLevel: "INTERMEDIATE",
      trainingFrequency: 4,
      height: 172,
      weight: 70,
      gymId: gym.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      onboardingData: {
        objective: "MUSCLE_GAIN",
        experienceLevel: "INTERMEDIATE",
        trainingFrequency: 4,
        height: 172,
        weight: 70,
      },
    },
  })

  console.log("✅ Users created (10 members + 3 staff)")

  // ── Membership Plans ────────────────────────────────
  const planDefs = [
    { name: "Plan Semanal", price: 150, currency: "PEN", durationDays: 7 },
    { name: "Plan Mensual", price: 500, currency: "PEN", durationDays: 30 },
    { name: "Plan Trimestral", price: 1200, currency: "PEN", durationDays: 90 },
    {
      name: "Plan Anual",
      price: 4000,
      currency: "PEN",
      durationDays: 365,
      description: "Ahorra 33% vs mensual",
    },
    { name: "Pase Diario", price: 50, currency: "PEN", durationDays: 1 },
  ]

  const plans = await Promise.all(
    planDefs.map(async (def) =>
      prisma.membershipPlan.upsert({
        where: { gymId_name: { gymId: gym.id, name: def.name } },
        update: {},
        create: { gymId: gym.id, ...def },
      })
    )
  )

  // ── Memberships (varied statuses) ───────────────────
  const now = new Date()
  const endDate30 = new Date(now.getTime() + 30 * 86400000)
  const endDate90 = new Date(now.getTime() + 90 * 86400000)
  const endDate365 = new Date(now.getTime() + 365 * 86400000)
  const expiredDate = new Date(now.getTime() - 5 * 86400000)

  const memberships = [
    // ACTIVE memberships
    {
      userId: carlos.id,
      planId: plans[3].id,
      status: "ACTIVE" as const,
      startDate: now,
      endDate: endDate365,
      paymentConfirmed: true,
      paymentMethod: "CASH" as const,
    },
    {
      userId: ana.id,
      planId: plans[1].id,
      status: "ACTIVE" as const,
      startDate: now,
      endDate: endDate30,
      paymentConfirmed: true,
      paymentMethod: "TRANSFER" as const,
      paymentRef: "TRF-001",
    },
    {
      userId: pedro.id,
      planId: plans[2].id,
      status: "ACTIVE" as const,
      startDate: now,
      endDate: endDate90,
      paymentConfirmed: true,
      paymentMethod: "CASH" as const,
    },
    {
      userId: mateo.id,
      planId: plans[1].id,
      status: "ACTIVE" as const,
      startDate: now,
      endDate: endDate30,
      paymentConfirmed: true,
      paymentMethod: "CARD" as const,
    },
    {
      userId: diego.id,
      planId: plans[2].id,
      status: "ACTIVE" as const,
      startDate: now,
      endDate: endDate90,
      paymentConfirmed: true,
      paymentMethod: "STRIPE" as const,
    },
    // EXPIRED membership
    {
      userId: sofia.id,
      planId: plans[1].id,
      status: "EXPIRED" as const,
      startDate: new Date(now.getTime() - 35 * 86400000),
      endDate: expiredDate,
      paymentConfirmed: true,
      paymentMethod: "TRANSFER" as const,
      paymentRef: "TRF-002",
    },
    // INACTIVE / SUSPENDED
    {
      userId: ricardo.id,
      planId: plans[2].id,
      status: "INACTIVE" as const,
      startDate: new Date(now.getTime() - 60 * 86400000),
      endDate: new Date(now.getTime() - 30 * 86400000),
      paymentConfirmed: true,
      paymentMethod: "CASH" as const,
    },
    // No membership for laura and valentina (fresh / pending)
  ]

  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { userId_planId: { userId: m.userId, planId: m.planId } },
      update: {},
      create: m,
    })
  }

  console.log("✅ Membership plans and memberships created")

  // ── Exercises ───────────────────────────────────────
  const exerciseDefs = [
    {
      name: "Press de banca",
      description: "Press con barra en banco plano.",
      muscleGroup: "CHEST" as const,
      equipment: "BARBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=4Y2ZdHCOXok",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
    },
    {
      name: "Press inclinado con mancuernas",
      description: "Press en banco inclinado 30-45°.",
      muscleGroup: "CHEST" as const,
      equipment: "DUMBBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg",
    },
    {
      name: "Aperturas con mancuernas",
      description: "Aislamiento para pectoral.",
      muscleGroup: "CHEST" as const,
      equipment: "DUMBBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=eozdVDA78K0",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg",
    },
    {
      name: "Fondos en paralelas",
      description: "Fondos enfatizando pecho.",
      muscleGroup: "CHEST" as const,
      equipment: "BODYWEIGHT" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=2tL1WxM3D4A",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Parallel_Bar_Dip/0.jpg",
    },
    {
      name: "Dominadas",
      description: "Dominadas con agarre prono.",
      muscleGroup: "BACK" as const,
      equipment: "BODYWEIGHT" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg",
    },
    {
      name: "Remo con barra",
      description: "Remo inclinado con barra.",
      muscleGroup: "BACK" as const,
      equipment: "BARBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=vwHG9Jfu4sA",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg",
    },
    {
      name: "Jalón al pecho",
      description: "Jalón en polea alta.",
      muscleGroup: "BACK" as const,
      equipment: "CABLE" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
    },
    {
      name: "Peso muerto",
      description: "Peso muerto convencional.",
      muscleGroup: "BACK" as const,
      equipment: "BARBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=ytGaGx3qNbs",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg",
    },
    {
      name: "Press militar",
      description: "Press de hombro con barra.",
      muscleGroup: "SHOULDERS" as const,
      equipment: "BARBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/0.jpg",
    },
    {
      name: "Elevaciones laterales",
      description: "Para deltoides lateral.",
      muscleGroup: "SHOULDERS" as const,
      equipment: "DUMBBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
    },
    {
      name: "Curl con barra",
      description: "Curl de bíceps clásico.",
      muscleGroup: "BICEPS" as const,
      equipment: "BARBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=LY1V6UbRHFM",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg",
    },
    {
      name: "Curl martillo",
      description: "Curl alterno neutro.",
      muscleGroup: "BICEPS" as const,
      equipment: "DUMBBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=zC3nLlEvinI",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternate_Hammer_Curl/0.jpg",
    },
    {
      name: "Press francés",
      description: "Extensión de tríceps con EZ.",
      muscleGroup: "TRICEPS" as const,
      equipment: "EZ_BAR" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=fYqswDVbJDg",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Skullcrusher/0.jpg",
    },
    {
      name: "Extensión en polea",
      description: "Tríceps en polea con cuerda.",
      muscleGroup: "TRICEPS" as const,
      equipment: "CABLE" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=kiuVA0gs3EI",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg",
    },
    {
      name: "Sentadilla",
      description: "Sentadilla libre con barra.",
      muscleGroup: "LEGS" as const,
      equipment: "BARBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=U3HlEF_E9fo",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg",
    },
    {
      name: "Prensa de piernas",
      description: "Prensa inclinada.",
      muscleGroup: "LEGS" as const,
      equipment: "MACHINE" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
    },
    {
      name: "Extensión de cuádriceps",
      description: "Aislamiento cuádriceps.",
      muscleGroup: "LEGS" as const,
      equipment: "MACHINE" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=YyvSfVjQeL0",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg",
    },
    {
      name: "Curl femoral",
      description: "Aislamiento isquiotibiales.",
      muscleGroup: "LEGS" as const,
      equipment: "MACHINE" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/0.jpg",
    },
    {
      name: "Zancadas con mancuernas",
      description: "Zancadas alternas.",
      muscleGroup: "LEGS" as const,
      equipment: "DUMBBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=D7KaRcUTQeE",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg",
    },
    {
      name: "Hip thrust",
      description: "Empuje de cadera con barra.",
      muscleGroup: "GLUTES" as const,
      equipment: "BARBELL" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=qbB2sDGhP3U",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Glute_Bridge/0.jpg",
    },
    {
      name: "Elevación de talones",
      description: "Gemelos en máquina.",
      muscleGroup: "CALVES" as const,
      equipment: "MACHINE" as const,
      category: "Strength",
      videoUrl: "https://www.youtube.com/watch?v=gwLzBJYoOpk",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Calf_Raises/0.jpg",
    },
    {
      name: "Plancha",
      description: "Plancha isométrica core.",
      muscleGroup: "ABS" as const,
      equipment: "BODYWEIGHT" as const,
      category: "Core",
      videoUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
    },
    {
      name: "Elevaciones de piernas",
      description: "Colgado de barra.",
      muscleGroup: "ABS" as const,
      equipment: "BODYWEIGHT" as const,
      category: "Core",
      videoUrl: "https://www.youtube.com/watch?v=JB2oyawG9KI",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg",
    },
    {
      name: "Burpees",
      description: "Full body + cardio.",
      muscleGroup: "FULL_BODY" as const,
      equipment: "BODYWEIGHT" as const,
      category: "Cardio",
      videoUrl: "https://www.youtube.com/watch?v=TU8QYVW0gDU",
      imageUrl: "https://img.youtube.com/vi/TU8QYVW0gDU/maxresdefault.jpg",
    },
    {
      name: "Kettlebell swing",
      description: "Potencia y cardio.",
      muscleGroup: "FULL_BODY" as const,
      equipment: "KETTLEBELL" as const,
      category: "Cardio",
      videoUrl: "https://www.youtube.com/watch?v=YSxHifyI6s8",
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/0.jpg",
    },
  ]
  const baseExercises = await Promise.all(
    exerciseDefs.map((def) =>
      prisma.exercise.upsert({ where: { name: def.name }, update: {}, create: def })
    )
  )

  // ── 20 additional exercises (with video+image) ──────
  const moreExercises = await Promise.all([
    prisma.exercise.upsert({
      where: { name: "Remo con mancuerna" },
      update: {},
      create: {
        name: "Remo con mancuerna",
        description:
          "Ejercicio unilateral para espalda. Apoya rodilla y mano en banco, espalda neutra, lleva el codo hacia atrás.",
        muscleGroup: "BACK",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=Pkr1WW3p05A",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Remo en máquina" },
      update: {},
      create: {
        name: "Remo en máquina",
        description:
          "Remo sentado en máquina con agarre en V. Espalda recta, lleva los codos hacia atrás apretando los dorsales.",
        muscleGroup: "BACK",
        equipment: "MACHINE",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=lJoozxC0Rns",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Face Pull" },
      update: {},
      create: {
        name: "Face Pull",
        description:
          "Ejercicio para deltoides posterior y trapecio. Con polea alta y cuerda, tira hacia la cara separando los brazos.",
        muscleGroup: "SHOULDERS",
        equipment: "CABLE",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=tkLTR4b6cAk",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Press de hombros con mancuernas" },
      update: {},
      create: {
        name: "Press de hombros con mancuernas",
        description:
          "Press sentado con mancuernas. Desde los hombros, presiona hacia arriba sin arquear la espalda.",
        muscleGroup: "SHOULDERS",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=M2rwvNhTOu0",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Elevaciones frontales" },
      update: {},
      create: {
        name: "Elevaciones frontales",
        description:
          "Aislamiento para deltoides anterior. Eleva los brazos al frente hasta la altura de los hombros.",
        muscleGroup: "SHOULDERS",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=sOcYlBI85hc",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Curl en predicador" },
      update: {},
      create: {
        name: "Curl en predicador",
        description:
          "Curl de bíceps con apoyo en banco predicador y barra EZ. Aislamiento total del bíceps.",
        muscleGroup: "BICEPS",
        equipment: "EZ_BAR",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=ZSB9JdskZXc",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Preacher_Curl/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Curl con cable" },
      update: {},
      create: {
        name: "Curl con cable",
        description:
          "Curl de bíceps en polea baja. Mantén los codos fijos a los lados, contracción al máximo.",
        muscleGroup: "BICEPS",
        equipment: "CABLE",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=2MUEL4nL6hA",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/High_Cable_Curls/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Curl concentrado" },
      update: {},
      create: {
        name: "Curl concentrado",
        description:
          "Curl de bíceps sentado con apoyo del brazo en el muslo interno. Máximo aislamiento del bíceps.",
        muscleGroup: "BICEPS",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=Jvj2wV0vOYU",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Concentration_Curls/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Press de banca agarre cerrado" },
      update: {},
      create: {
        name: "Press de banca agarre cerrado",
        description:
          "Variante de press de banca con manos juntas. Enfocado en tríceps, codos pegados al cuerpo.",
        muscleGroup: "TRICEPS",
        equipment: "BARBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=8o7jud9YlHU",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Barbell_Bench_Press/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Extensión de tríceps sobre cabeza" },
      update: {},
      create: {
        name: "Extensión de tríceps sobre cabeza",
        description:
          "Con mancuerna, extiende los brazos por encima de la cabeza. Trabaja la porción larga del tríceps.",
        muscleGroup: "TRICEPS",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=fYqswDVbJDg",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Tricep_Extension_-Pronated_Grip/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Patada de tríceps" },
      update: {},
      create: {
        name: "Patada de tríceps",
        description:
          "Inclinado hacia adelante, extiende el brazo hacia atrás contrayendo el tríceps al máximo.",
        muscleGroup: "TRICEPS",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=ZO81bExngMI",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Tricep_Dumbbell_Kickback/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Sentadilla búlgara" },
      update: {},
      create: {
        name: "Sentadilla búlgara",
        description:
          "Sentadilla unilateral con pie trasero en banco. Cuádriceps, glúteos y equilibrio.",
        muscleGroup: "LEGS",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=hiLF_pF3EJM",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Sentadilla goblet" },
      update: {},
      create: {
        name: "Sentadilla goblet",
        description:
          "Sentadilla con mancuerna sostenida contra el pecho. Ideal para aprender técnica de sentadilla.",
        muscleGroup: "LEGS",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=Mu7aVOjEBdA",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Goblet_Squat/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Peso muerto rumano" },
      update: {},
      create: {
        name: "Peso muerto rumano",
        description:
          "Peso muerto enfocado en isquiotibiales y glúteos. Barra deslizándose por los muslos.",
        muscleGroup: "LEGS",
        equipment: "BARBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=5zmlnbWb-g4",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Zancada lateral" },
      update: {},
      create: {
        name: "Zancada lateral",
        description: "Zancada lateral con mancuernas. Trabaja aductores, cuádriceps y glúteos.",
        muscleGroup: "LEGS",
        equipment: "DUMBBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=R8jArZG2J6Q",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Puente de glúteo" },
      update: {},
      create: {
        name: "Puente de glúteo",
        description: "Acostado boca arriba, eleva la cadera contrayendo glúteos al máximo.",
        muscleGroup: "GLUTES",
        equipment: "BODYWEIGHT",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=E3Kt5qUYWfY",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butt-Ups/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Elevación de gemelos sentado" },
      update: {},
      create: {
        name: "Elevación de gemelos sentado",
        description:
          "En máquina específica sentado. Trabaja sóleo y gemelo con rodillas flexionadas.",
        muscleGroup: "CALVES",
        equipment: "MACHINE",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=3ZRe_QpvRPg",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Crunch" },
      update: {},
      create: {
        name: "Crunch",
        description: "Acostado boca arriba, eleva el tronco contrayendo el recto abdominal.",
        muscleGroup: "ABS",
        equipment: "BODYWEIGHT",
        category: "Core",
        videoUrl: "https://www.youtube.com/watch?v=MKmrqcoCZ-M",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Russian Twist" },
      update: {},
      create: {
        name: "Russian Twist",
        description: "Giro de tronco sentado con pies elevados. Trabaja oblicuos y core.",
        muscleGroup: "ABS",
        equipment: "BODYWEIGHT",
        category: "Core",
        videoUrl: "https://www.youtube.com/watch?v=wkD8rjkodUI",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg",
      },
    }),
    prisma.exercise.upsert({
      where: { name: "Clean and Press" },
      update: {},
      create: {
        name: "Clean and Press",
        description:
          "Levantamiento olímpico completo. Desde el suelo a los hombros y press sobre la cabeza.",
        muscleGroup: "FULL_BODY",
        equipment: "BARBELL",
        category: "Strength",
        videoUrl: "https://www.youtube.com/watch?v=KCe8l86-alA",
        imageUrl:
          "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clean_and_Press/0.jpg",
      },
    }),
  ])
  const allExercises = [...baseExercises, ...moreExercises]
  console.log(
    `✅ ${allExercises.length} exercises created (25 original + ${moreExercises.length} new)`
  )

  // ── Gym Equipment ─────────────────────────────────────
  const pressBanca = allExercises.find((e) => e.name === "Press de banca")!
  const sentadilla = allExercises.find((e) => e.name === "Sentadilla")!
  const prensaPierna = allExercises.find((e) => e.name === "Prensa de piernas")!
  const remoConBarra = allExercises.find((e) => e.name === "Remo con barra")!
  const curlBiceps = allExercises.find((e) => e.name === "Curl con barra")!
  const extensionTriceps = allExercises.find((e) => e.name === "Extensión en polea")!

  const equipment = [
    {
      name: "Press de banca plano",
      category: "MACHINE",
      location: "Zona de fuerza",
      exerciseId: pressBanca.id,
      machineNumber: 1,
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
    },
    {
      name: "Press de banca inclinado",
      category: "MACHINE",
      location: "Zona de fuerza",
      exerciseId: pressBanca.id,
      machineNumber: 2,
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg",
    },
    {
      name: "Rack de sentadilla",
      category: "BARBELL",
      location: "Zona de pesas",
      exerciseId: sentadilla.id,
      machineNumber: 3,
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg",
    },
    {
      name: "Prensa de pierna 45°",
      category: "MACHINE",
      location: "Zona de pierna",
      exerciseId: prensaPierna.id,
      machineNumber: 4,
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Gym_Leg_Press_Machine.jpg",
    },
    {
      name: "Remo con barra T",
      category: "MACHINE",
      location: "Zona de espalda",
      exerciseId: remoConBarra.id,
      machineNumber: 5,
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg",
    },
    {
      name: "Banco de curl Scott",
      category: "BENCH",
      location: "Zona de brazos",
      exerciseId: curlBiceps.id,
      machineNumber: 6,
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg",
    },
    {
      name: "Máquina de remo",
      category: "CARDIO",
      location: "Zona de cardio",
      machineNumber: 7,
      imageUrl: "https://cdn.pixabay.com/photo/2015/04/06/16/00/machine-709588_640.jpg",
    },
    {
      name: "Cinta de correr",
      category: "CARDIO",
      location: "Zona de cardio",
      machineNumber: 8,
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/62/Treadmill-gym.jpg",
    },
    {
      name: "Bicicleta estática",
      category: "CARDIO",
      location: "Zona de cardio",
      machineNumber: 9,
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/77/Stationary_bikes_at_a_gym.jpg",
    },
    {
      name: "Polea alta",
      category: "CABLE",
      location: "Zona de brazos",
      exerciseId: extensionTriceps.id,
      machineNumber: 10,
      imageUrl:
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg",
    },
  ]

  // System equipment templates (gymId = null, isSystem = true)
  const systemEquipmentIds: string[] = []
  for (const item of equipment) {
    const sysId = `sys-${item.name.replace(/\s+/g, "-").toLowerCase()}`
    const sys = await prisma.gymEquipment.upsert({
      where: { id: sysId },
      update: { machineNumber: item.machineNumber, imageUrl: item.imageUrl },
      create: {
        id: sysId,
        name: item.name,
        category: item.category,
        location: item.location,
        exerciseId: item.exerciseId ?? null,
        machineNumber: item.machineNumber,
        imageUrl: item.imageUrl,
        isSystem: true,
      },
    })
    systemEquipmentIds.push(sys.id)
  }
  console.log(`✅ ${systemEquipmentIds.length} system equipment templates created`)

  // Activate all system equipment for the seed gym
  for (const equipId of systemEquipmentIds) {
    await prisma.gymEquipmentActivation.upsert({
      where: { gymId_equipmentId: { gymId: gym.id, equipmentId: equipId } },
      update: {},
      create: { gymId: gym.id, equipmentId: equipId, active: true },
    })
  }
  console.log(`✅ ${systemEquipmentIds.length} equipment activations created for gym`)

  // Activate all exercises for the seed gym
  let exerciseCount = 0
  for (const ex of allExercises) {
    await prisma.gymExercise.upsert({
      where: { gymId_exerciseId: { gymId: gym.id, exerciseId: ex.id } },
      update: {},
      create: { gymId: gym.id, exerciseId: ex.id, active: true },
    })
    exerciseCount++
  }
  console.log(`✅ ${exerciseCount} gym exercises activated for gym`)

  // ── Platform Plans (SUPER_ADMIN) ────────────────────
  const plan1 = await prisma.routinePlan.upsert({
    where: { name_userId: { name: "Cuerpo Completo Principiante", userId: superadmin.id } },
    update: {},
    create: {
      userId: superadmin.id,
      name: "Cuerpo Completo Principiante",
      description:
        "Rutina ideal para empezar. Trabaja todo el cuerpo en cada sesión con ejercicios básicos controlados.",
      objective: "GENERAL_FITNESS",
      frequency: 3,
      difficulty: "BEGINNER",
    },
  })
  const plan1SplitsExist = await prisma.routineSplit.count({ where: { planId: plan1.id } })
  if (plan1SplitsExist === 0) {
    await prisma.routineSplit.create({
      data: {
        label: "A",
        name: "Full Body A",
        description: "Enfoque en press y empuje",
        muscleGroups: ["FULL_BODY"],
        estimatedDuration: 55,
        order: 0,
        planId: plan1.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[0].id,
              sets: 3,
              reps: "10-12",
              weight: 30,
              restSeconds: 75,
              order: 0,
            },
            {
              exerciseId: allExercises[14].id,
              sets: 3,
              reps: "10-12",
              weight: 30,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[5].id,
              sets: 3,
              reps: "10-12",
              weight: 25,
              restSeconds: 75,
              order: 2,
            },
            {
              exerciseId: allExercises[8].id,
              sets: 3,
              reps: "10-12",
              weight: 20,
              restSeconds: 75,
              order: 3,
            },
            {
              exerciseId: allExercises[21].id,
              sets: 3,
              reps: "30s",
              weight: 0,
              restSeconds: 60,
              order: 4,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "B",
        name: "Full Body B",
        description: "Enfoque en tirón y piernas",
        muscleGroups: ["FULL_BODY"],
        estimatedDuration: 55,
        order: 1,
        planId: plan1.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[7].id,
              sets: 3,
              reps: "10-12",
              weight: 50,
              restSeconds: 90,
              order: 0,
            },
            {
              exerciseId: allExercises[4].id,
              sets: 3,
              reps: "8-10",
              weight: 0,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[18].id,
              sets: 3,
              reps: "10-12",
              weight: 12,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[19].id,
              sets: 3,
              reps: "10-12",
              weight: 30,
              restSeconds: 75,
              order: 3,
            },
            {
              exerciseId: allExercises[22].id,
              sets: 3,
              reps: "15",
              weight: 0,
              restSeconds: 60,
              order: 4,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "C",
        name: "Full Body C",
        description: "Enfoque en fuerza y core",
        muscleGroups: ["FULL_BODY"],
        estimatedDuration: 50,
        order: 2,
        planId: plan1.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[0].id,
              sets: 3,
              reps: "8-10",
              weight: 35,
              restSeconds: 90,
              order: 0,
            },
            {
              exerciseId: allExercises[14].id,
              sets: 3,
              reps: "8-10",
              weight: 35,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[10].id,
              sets: 3,
              reps: "12-15",
              weight: 15,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[9].id,
              sets: 3,
              reps: "12-15",
              weight: 5,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[22].id,
              sets: 3,
              reps: "20",
              weight: 0,
              restSeconds: 60,
              order: 4,
            },
          ],
        },
      },
    })
  }

  const plan2 = await prisma.routinePlan.upsert({
    where: { name_userId: { name: "Quema Grasa Metabólico", userId: superadmin.id } },
    update: {},
    create: {
      userId: superadmin.id,
      name: "Quema Grasa Metabólico",
      description:
        "Circuito metabólico para maximizar quema calórica. Alta intensidad, poco descanso.",
      objective: "WEIGHT_LOSS",
      frequency: 3,
      difficulty: "INTERMEDIATE",
    },
  })
  const plan2SplitsExist = await prisma.routineSplit.count({ where: { planId: plan2.id } })
  if (plan2SplitsExist === 0) {
    await prisma.routineSplit.create({
      data: {
        label: "A",
        name: "Circuito A",
        description: "Full body alta intensidad",
        muscleGroups: ["FULL_BODY", "CARDIO"],
        estimatedDuration: 45,
        order: 0,
        planId: plan2.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[23].id,
              sets: 4,
              reps: "12",
              weight: 0,
              restSeconds: 45,
              order: 0,
            },
            {
              exerciseId: allExercises[24].id,
              sets: 4,
              reps: "15",
              weight: 16,
              restSeconds: 45,
              order: 1,
            },
            {
              exerciseId: allExercises[14].id,
              sets: 3,
              reps: "12-15",
              weight: 50,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[18].id,
              sets: 3,
              reps: "12",
              weight: 14,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[21].id,
              sets: 3,
              reps: "45s",
              weight: 0,
              restSeconds: 45,
              order: 4,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "B",
        name: "Circuito B",
        description: "Empuje y core",
        muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS", "ABS"],
        estimatedDuration: 45,
        order: 1,
        planId: plan2.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[3].id,
              sets: 4,
              reps: "10-12",
              weight: 0,
              restSeconds: 45,
              order: 0,
            },
            {
              exerciseId: allExercises[0].id,
              sets: 3,
              reps: "12-15",
              weight: 40,
              restSeconds: 60,
              order: 1,
            },
            {
              exerciseId: allExercises[9].id,
              sets: 3,
              reps: "15",
              weight: 7,
              restSeconds: 45,
              order: 2,
            },
            {
              exerciseId: allExercises[12].id,
              sets: 3,
              reps: "12-15",
              weight: 15,
              restSeconds: 45,
              order: 3,
            },
            {
              exerciseId: allExercises[21].id,
              sets: 3,
              reps: "60s",
              weight: 0,
              restSeconds: 45,
              order: 4,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "C",
        name: "Circuito C",
        description: "Tracción y piernas",
        muscleGroups: ["BACK", "BICEPS", "LEGS", "GLUTES"],
        estimatedDuration: 50,
        order: 2,
        planId: plan2.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[5].id,
              sets: 3,
              reps: "12-15",
              weight: 35,
              restSeconds: 60,
              order: 0,
            },
            {
              exerciseId: allExercises[4].id,
              sets: 3,
              reps: "8-10",
              weight: 0,
              restSeconds: 60,
              order: 1,
            },
            {
              exerciseId: allExercises[15].id,
              sets: 3,
              reps: "15",
              weight: 90,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[16].id,
              sets: 3,
              reps: "15",
              weight: 40,
              restSeconds: 45,
              order: 3,
            },
            {
              exerciseId: allExercises[20].id,
              sets: 4,
              reps: "15-20",
              weight: 45,
              restSeconds: 45,
              order: 4,
            },
          ],
        },
      },
    })
  }

  const plan3 = await prisma.routinePlan.upsert({
    where: { name_userId: { name: "Hipertrofia Push-Pull-Legs", userId: superadmin.id } },
    update: {},
    create: {
      userId: superadmin.id,
      name: "Hipertrofia Push-Pull-Legs",
      description: "Split PPL para ganancia muscular. Volumen óptimo con sobrecarga progresiva.",
      objective: "MUSCLE_GAIN",
      frequency: 3,
      difficulty: "ADVANCED",
    },
  })
  const plan3SplitsExist = await prisma.routineSplit.count({ where: { planId: plan3.id } })
  if (plan3SplitsExist === 0) {
    await prisma.routineSplit.create({
      data: {
        label: "A",
        name: "Push (Empuje)",
        description: "Pecho, hombros y tríceps",
        muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS"],
        estimatedDuration: 65,
        order: 0,
        planId: plan3.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[0].id,
              sets: 4,
              reps: "6-8",
              weight: 70,
              restSeconds: 90,
              order: 0,
            },
            {
              exerciseId: allExercises[1].id,
              sets: 3,
              reps: "8-10",
              weight: 24,
              restSeconds: 75,
              order: 1,
            },
            {
              exerciseId: allExercises[8].id,
              sets: 4,
              reps: "6-8",
              weight: 45,
              restSeconds: 90,
              order: 2,
            },
            {
              exerciseId: allExercises[9].id,
              sets: 3,
              reps: "12-15",
              weight: 10,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[12].id,
              sets: 3,
              reps: "10-12",
              weight: 22.5,
              restSeconds: 60,
              order: 4,
            },
            {
              exerciseId: allExercises[13].id,
              sets: 3,
              reps: "12-15",
              weight: 18,
              restSeconds: 45,
              order: 5,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "B",
        name: "Pull (Tracción)",
        description: "Espalda y bíceps",
        muscleGroups: ["BACK", "BICEPS", "FOREARMS"],
        estimatedDuration: 55,
        order: 1,
        planId: plan3.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[7].id,
              sets: 4,
              reps: "6-8",
              weight: 100,
              restSeconds: 120,
              order: 0,
            },
            {
              exerciseId: allExercises[5].id,
              sets: 4,
              reps: "8-10",
              weight: 55,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[6].id,
              sets: 3,
              reps: "10-12",
              weight: 55,
              restSeconds: 75,
              order: 2,
            },
            {
              exerciseId: allExercises[4].id,
              sets: 3,
              reps: "8-10",
              weight: 0,
              restSeconds: 90,
              order: 3,
            },
            {
              exerciseId: allExercises[10].id,
              sets: 3,
              reps: "10-12",
              weight: 30,
              restSeconds: 60,
              order: 4,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "C",
        name: "Legs (Piernas)",
        description: "Cuádriceps, isquiotibiales, glúteos y gemelos",
        muscleGroups: ["LEGS", "GLUTES", "CALVES"],
        estimatedDuration: 60,
        order: 2,
        planId: plan3.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[14].id,
              sets: 4,
              reps: "6-8",
              weight: 90,
              restSeconds: 120,
              order: 0,
            },
            {
              exerciseId: allExercises[15].id,
              sets: 3,
              reps: "10-12",
              weight: 120,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[17].id,
              sets: 3,
              reps: "10-12",
              weight: 45,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[19].id,
              sets: 4,
              reps: "8-10",
              weight: 70,
              restSeconds: 75,
              order: 3,
            },
            {
              exerciseId: allExercises[20].id,
              sets: 4,
              reps: "12-15",
              weight: 60,
              restSeconds: 60,
              order: 4,
            },
          ],
        },
      },
    })
  }

  console.log("✅ Platform plans created")

  // ── Coach Plans ─────────────────────────────────────
  const coachPlan1 = await prisma.routinePlan.upsert({
    where: { name_userId: { name: "Fuerza 5x5 Modificada", userId: trainer.id } },
    update: {},
    create: {
      userId: trainer.id,
      name: "Fuerza 5x5 Modificada",
      description: "Rutina de fuerza básica. Pocos ejercicios, mucho peso, resultados comprobados.",
      objective: "STRENGTH",
      frequency: 3,
      difficulty: "INTERMEDIATE",
    },
  })
  const coachPlan1SplitsExist = await prisma.routineSplit.count({
    where: { planId: coachPlan1.id },
  })
  if (coachPlan1SplitsExist === 0) {
    await prisma.routineSplit.create({
      data: {
        label: "A",
        name: "Fuerza A",
        description: "Sentadilla y press",
        muscleGroups: ["LEGS", "CHEST", "BACK"],
        estimatedDuration: 70,
        order: 0,
        planId: coachPlan1.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[14].id,
              sets: 5,
              reps: "5",
              weight: 105,
              restSeconds: 180,
              order: 0,
            },
            {
              exerciseId: allExercises[0].id,
              sets: 5,
              reps: "5",
              weight: 75,
              restSeconds: 180,
              order: 1,
            },
            {
              exerciseId: allExercises[5].id,
              sets: 5,
              reps: "5",
              weight: 50,
              restSeconds: 150,
              order: 2,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "B",
        name: "Fuerza B",
        description: "Peso muerto y press militar",
        muscleGroups: ["BACK", "SHOULDERS", "LEGS"],
        estimatedDuration: 70,
        order: 1,
        planId: coachPlan1.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[7].id,
              sets: 5,
              reps: "5",
              weight: 120,
              restSeconds: 180,
              order: 0,
            },
            {
              exerciseId: allExercises[8].id,
              sets: 5,
              reps: "5",
              weight: 50,
              restSeconds: 150,
              order: 1,
            },
            {
              exerciseId: allExercises[4].id,
              sets: 3,
              reps: "8",
              weight: 0,
              restSeconds: 120,
              order: 2,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "C",
        name: "Fuerza C",
        description: "Accesorios y explosividad",
        muscleGroups: ["LEGS", "GLUTES", "ABS"],
        estimatedDuration: 55,
        order: 2,
        planId: coachPlan1.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[19].id,
              sets: 4,
              reps: "8",
              weight: 90,
              restSeconds: 90,
              order: 0,
            },
            {
              exerciseId: allExercises[10].id,
              sets: 3,
              reps: "8",
              weight: 35,
              restSeconds: 75,
              order: 1,
            },
            {
              exerciseId: allExercises[22].id,
              sets: 3,
              reps: "15",
              weight: 0,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[20].id,
              sets: 3,
              reps: "12",
              weight: 70,
              restSeconds: 60,
              order: 3,
            },
          ],
        },
      },
    })
  }

  // Coach plan for weight loss (for Ana and Sofia)
  const coachPlan2 = await prisma.routinePlan.upsert({
    where: { name_userId: { name: "Definición 4x por Semana", userId: trainer.id } },
    update: {},
    create: {
      userId: trainer.id,
      name: "Definición 4x por Semana",
      description: "Rutina enfocada en pérdida de grasa con alto volumen y descansos cortos.",
      objective: "WEIGHT_LOSS",
      frequency: 4,
      difficulty: "BEGINNER",
    },
  })
  const coachPlan2SplitsExist = await prisma.routineSplit.count({
    where: { planId: coachPlan2.id },
  })
  if (coachPlan2SplitsExist === 0) {
    await prisma.routineSplit.create({
      data: {
        label: "A",
        name: "Superior Empuje",
        description: "Pecho, hombros, tríceps",
        muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS"],
        estimatedDuration: 50,
        order: 0,
        planId: coachPlan2.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[1].id,
              sets: 3,
              reps: "12-15",
              weight: 10,
              restSeconds: 60,
              order: 0,
            },
            {
              exerciseId: allExercises[9].id,
              sets: 3,
              reps: "15-20",
              weight: 5,
              restSeconds: 45,
              order: 1,
            },
            {
              exerciseId: allExercises[12].id,
              sets: 3,
              reps: "15",
              weight: 12,
              restSeconds: 45,
              order: 2,
            },
            {
              exerciseId: allExercises[21].id,
              sets: 3,
              reps: "30s",
              weight: 0,
              restSeconds: 45,
              order: 3,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "B",
        name: "Inferior + Core",
        description: "Piernas, glúteos y abdomen",
        muscleGroups: ["LEGS", "GLUTES", "ABS"],
        estimatedDuration: 55,
        order: 1,
        planId: coachPlan2.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[14].id,
              sets: 3,
              reps: "12-15",
              weight: 35,
              restSeconds: 75,
              order: 0,
            },
            {
              exerciseId: allExercises[18].id,
              sets: 3,
              reps: "12",
              weight: 10,
              restSeconds: 60,
              order: 1,
            },
            {
              exerciseId: allExercises[19].id,
              sets: 3,
              reps: "15",
              weight: 30,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[22].id,
              sets: 3,
              reps: "15",
              weight: 0,
              restSeconds: 45,
              order: 3,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "C",
        name: "Superior Tracción",
        description: "Espalda, bíceps, deltoides posterior",
        muscleGroups: ["BACK", "BICEPS", "SHOULDERS"],
        estimatedDuration: 50,
        order: 2,
        planId: coachPlan2.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[6].id,
              sets: 3,
              reps: "12-15",
              weight: 40,
              restSeconds: 60,
              order: 0,
            },
            {
              exerciseId: allExercises[10].id,
              sets: 3,
              reps: "12-15",
              weight: 15,
              restSeconds: 45,
              order: 1,
            },
            {
              exerciseId: allExercises[4].id,
              sets: 3,
              reps: "8-10",
              weight: 0,
              restSeconds: 75,
              order: 2,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "D",
        name: "Full Body Cardio",
        description: "Circuito completo con cardio",
        muscleGroups: ["FULL_BODY", "CARDIO"],
        estimatedDuration: 45,
        order: 3,
        planId: coachPlan2.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[23].id,
              sets: 3,
              reps: "10-12",
              weight: 0,
              restSeconds: 45,
              order: 0,
            },
            {
              exerciseId: allExercises[24].id,
              sets: 3,
              reps: "15",
              weight: 14,
              restSeconds: 45,
              order: 1,
            },
            {
              exerciseId: allExercises[3].id,
              sets: 3,
              reps: "8-10",
              weight: 0,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[21].id,
              sets: 3,
              reps: "60s",
              weight: 0,
              restSeconds: 45,
              order: 3,
            },
          ],
        },
      },
    })
  }

  console.log("✅ Coach plans created")

  // ── New Platform Plans (Upper/Lower + Weider) ────────
  const planUpperLower = await prisma.routinePlan.upsert({
    where: { name_userId: { name: "Upper/Lower Split — Hipertrofia", userId: superadmin.id } },
    update: {},
    create: {
      userId: superadmin.id,
      name: "Upper/Lower Split — Hipertrofia",
      description:
        "Rutina torso/piernas 4 días. Volumen equilibrado con compuestos y aislados para hipertrofia.",
      objective: "MUSCLE_GAIN",
      frequency: 4,
      difficulty: "INTERMEDIATE",
    },
  })
  const ulSplitsExist = await prisma.routineSplit.count({ where: { planId: planUpperLower.id } })
  if (ulSplitsExist === 0) {
    await prisma.routineSplit.create({
      data: {
        label: "A",
        name: "Upper A — Empuje",
        description: "Pecho, hombro frontal, espalda y brazos",
        muscleGroups: ["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS"],
        estimatedDuration: 55,
        order: 0,
        planId: planUpperLower.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[0].id,
              sets: 4,
              reps: "8-10",
              weight: 60,
              restSeconds: 90,
              order: 0,
            },
            {
              exerciseId: allExercises[25].id,
              sets: 4,
              reps: "10",
              weight: 25,
              restSeconds: 75,
              order: 1,
            },
            {
              exerciseId: allExercises[28].id,
              sets: 3,
              reps: "10",
              weight: 18,
              restSeconds: 75,
              order: 2,
            },
            {
              exerciseId: allExercises[10].id,
              sets: 3,
              reps: "12",
              weight: 20,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[13].id,
              sets: 3,
              reps: "12",
              weight: 15,
              restSeconds: 45,
              order: 4,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "B",
        name: "Lower A — Cuádriceps",
        description: "Enfoque en cuádriceps, isquiotibiales y core",
        muscleGroups: ["LEGS", "GLUTES", "CALVES", "ABS"],
        estimatedDuration: 55,
        order: 1,
        planId: planUpperLower.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[14].id,
              sets: 4,
              reps: "8-10",
              weight: 80,
              restSeconds: 120,
              order: 0,
            },
            {
              exerciseId: allExercises[38].id,
              sets: 4,
              reps: "10",
              weight: 60,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[36].id,
              sets: 3,
              reps: "10",
              weight: 20,
              restSeconds: 75,
              order: 2,
            },
            {
              exerciseId: allExercises[20].id,
              sets: 4,
              reps: "15",
              weight: 50,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[21].id,
              sets: 3,
              reps: "30s",
              weight: 0,
              restSeconds: 60,
              order: 4,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "C",
        name: "Upper B — Tracción",
        description: "Enfoque en espalda, deltoides posterior y brazos",
        muscleGroups: ["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS"],
        estimatedDuration: 55,
        order: 2,
        planId: planUpperLower.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[4].id,
              sets: 4,
              reps: "8",
              weight: 0,
              restSeconds: 90,
              order: 0,
            },
            {
              exerciseId: allExercises[1].id,
              sets: 4,
              reps: "10",
              weight: 22,
              restSeconds: 75,
              order: 1,
            },
            {
              exerciseId: allExercises[27].id,
              sets: 3,
              reps: "15",
              weight: 10,
              restSeconds: 45,
              order: 2,
            },
            {
              exerciseId: allExercises[11].id,
              sets: 3,
              reps: "12",
              weight: 14,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[33].id,
              sets: 3,
              reps: "10",
              weight: 40,
              restSeconds: 60,
              order: 4,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "D",
        name: "Lower B — Glúteo/Isquio",
        description: "Enfoque en glúteos, isquiotibiales y core",
        muscleGroups: ["LEGS", "GLUTES", "CALVES", "ABS"],
        estimatedDuration: 55,
        order: 3,
        planId: planUpperLower.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[7].id,
              sets: 4,
              reps: "8",
              weight: 100,
              restSeconds: 120,
              order: 0,
            },
            {
              exerciseId: allExercises[19].id,
              sets: 4,
              reps: "12",
              weight: 70,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[37].id,
              sets: 3,
              reps: "12",
              weight: 24,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[41].id,
              sets: 4,
              reps: "15",
              weight: 30,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[43].id,
              sets: 3,
              reps: "15",
              weight: 0,
              restSeconds: 45,
              order: 4,
            },
          ],
        },
      },
    })
  }

  const planWeider = await prisma.routinePlan.upsert({
    where: { name_userId: { name: "Weider Split — Arnold Clásico", userId: superadmin.id } },
    update: {},
    create: {
      userId: superadmin.id,
      name: "Weider Split — Arnold Clásico",
      description:
        "Rutina Weider 6 días basada en el clásico Arnold Split. Alto volumen, ideal para hipertrofia avanzada.",
      objective: "MUSCLE_GAIN",
      frequency: 6,
      difficulty: "ADVANCED",
    },
  })
  const weiderSplitsExist = await prisma.routineSplit.count({ where: { planId: planWeider.id } })
  if (weiderSplitsExist === 0) {
    await prisma.routineSplit.create({
      data: {
        label: "A",
        name: "Pecho + Espalda",
        muscleGroups: ["CHEST", "BACK"],
        estimatedDuration: 65,
        order: 0,
        planId: planWeider.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[0].id,
              sets: 4,
              reps: "8",
              weight: 70,
              restSeconds: 90,
              order: 0,
            },
            {
              exerciseId: allExercises[5].id,
              sets: 4,
              reps: "8",
              weight: 60,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[1].id,
              sets: 3,
              reps: "10",
              weight: 24,
              restSeconds: 75,
              order: 2,
            },
            {
              exerciseId: allExercises[26].id,
              sets: 3,
              reps: "10",
              weight: 50,
              restSeconds: 75,
              order: 3,
            },
            {
              exerciseId: allExercises[2].id,
              sets: 3,
              reps: "12",
              weight: 14,
              restSeconds: 60,
              order: 4,
            },
            {
              exerciseId: allExercises[25].id,
              sets: 3,
              reps: "10",
              weight: 24,
              restSeconds: 60,
              order: 5,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "B",
        name: "Hombros + Brazos",
        muscleGroups: ["SHOULDERS", "BICEPS", "TRICEPS"],
        estimatedDuration: 60,
        order: 1,
        planId: planWeider.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[8].id,
              sets: 4,
              reps: "8",
              weight: 40,
              restSeconds: 90,
              order: 0,
            },
            {
              exerciseId: allExercises[9].id,
              sets: 3,
              reps: "12",
              weight: 8,
              restSeconds: 45,
              order: 1,
            },
            {
              exerciseId: allExercises[27].id,
              sets: 3,
              reps: "15",
              weight: 10,
              restSeconds: 45,
              order: 2,
            },
            {
              exerciseId: allExercises[30].id,
              sets: 3,
              reps: "10",
              weight: 18,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[12].id,
              sets: 3,
              reps: "10",
              weight: 20,
              restSeconds: 60,
              order: 4,
            },
            {
              exerciseId: allExercises[31].id,
              sets: 3,
              reps: "12",
              weight: 12,
              restSeconds: 45,
              order: 5,
            },
            {
              exerciseId: allExercises[13].id,
              sets: 3,
              reps: "12",
              weight: 15,
              restSeconds: 45,
              order: 6,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "C",
        name: "Piernas",
        muscleGroups: ["LEGS", "GLUTES", "CALVES"],
        estimatedDuration: 60,
        order: 2,
        planId: planWeider.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[14].id,
              sets: 4,
              reps: "8",
              weight: 90,
              restSeconds: 120,
              order: 0,
            },
            {
              exerciseId: allExercises[38].id,
              sets: 4,
              reps: "10",
              weight: 60,
              restSeconds: 90,
              order: 1,
            },
            {
              exerciseId: allExercises[15].id,
              sets: 3,
              reps: "12",
              weight: 140,
              restSeconds: 90,
              order: 2,
            },
            {
              exerciseId: allExercises[16].id,
              sets: 3,
              reps: "12",
              weight: 40,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[17].id,
              sets: 3,
              reps: "12",
              weight: 35,
              restSeconds: 60,
              order: 4,
            },
            {
              exerciseId: allExercises[20].id,
              sets: 4,
              reps: "15",
              weight: 60,
              restSeconds: 45,
              order: 5,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "D",
        name: "Pecho + Espalda 2",
        muscleGroups: ["CHEST", "BACK", "TRICEPS", "BICEPS"],
        estimatedDuration: 55,
        order: 3,
        planId: planWeider.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[3].id,
              sets: 4,
              reps: "10",
              weight: 0,
              restSeconds: 75,
              order: 0,
            },
            {
              exerciseId: allExercises[6].id,
              sets: 4,
              reps: "10",
              weight: 50,
              restSeconds: 75,
              order: 1,
            },
            {
              exerciseId: allExercises[33].id,
              sets: 3,
              reps: "10",
              weight: 50,
              restSeconds: 75,
              order: 2,
            },
            {
              exerciseId: allExercises[4].id,
              sets: 3,
              reps: "8",
              weight: 0,
              restSeconds: 75,
              order: 3,
            },
            {
              exerciseId: allExercises[32].id,
              sets: 3,
              reps: "12",
              weight: 12,
              restSeconds: 45,
              order: 4,
            },
            {
              exerciseId: allExercises[35].id,
              sets: 3,
              reps: "12",
              weight: 8,
              restSeconds: 45,
              order: 5,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "E",
        name: "Hombros + Brazos 2",
        muscleGroups: ["SHOULDERS", "BICEPS", "TRICEPS"],
        estimatedDuration: 55,
        order: 4,
        planId: planWeider.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[28].id,
              sets: 4,
              reps: "10",
              weight: 20,
              restSeconds: 75,
              order: 0,
            },
            {
              exerciseId: allExercises[29].id,
              sets: 3,
              reps: "12",
              weight: 8,
              restSeconds: 45,
              order: 1,
            },
            {
              exerciseId: allExercises[27].id,
              sets: 3,
              reps: "15",
              weight: 10,
              restSeconds: 45,
              order: 2,
            },
            {
              exerciseId: allExercises[11].id,
              sets: 3,
              reps: "12",
              weight: 14,
              restSeconds: 60,
              order: 3,
            },
            {
              exerciseId: allExercises[34].id,
              sets: 3,
              reps: "12",
              weight: 12,
              restSeconds: 60,
              order: 4,
            },
            {
              exerciseId: allExercises[31].id,
              sets: 3,
              reps: "12",
              weight: 12,
              restSeconds: 45,
              order: 5,
            },
          ],
        },
      },
    })
    await prisma.routineSplit.create({
      data: {
        label: "F",
        name: "Piernas 2",
        muscleGroups: ["LEGS", "GLUTES", "CALVES", "ABS"],
        estimatedDuration: 55,
        order: 5,
        planId: planWeider.id,
        exercises: {
          create: [
            {
              exerciseId: allExercises[37].id,
              sets: 4,
              reps: "10",
              weight: 24,
              restSeconds: 75,
              order: 0,
            },
            {
              exerciseId: allExercises[39].id,
              sets: 3,
              reps: "10",
              weight: 16,
              restSeconds: 60,
              order: 1,
            },
            {
              exerciseId: allExercises[40].id,
              sets: 3,
              reps: "15",
              weight: 0,
              restSeconds: 60,
              order: 2,
            },
            {
              exerciseId: allExercises[41].id,
              sets: 4,
              reps: "15",
              weight: 30,
              restSeconds: 45,
              order: 3,
            },
            {
              exerciseId: allExercises[42].id,
              sets: 3,
              reps: "20",
              weight: 0,
              restSeconds: 45,
              order: 4,
            },
          ],
        },
      },
    })
  }
  console.log("✅ Added Upper/Lower and Weider plans")

  // ── Plan Assignments ────────────────────────────────
  // Fetch splits for later workout logs
  const pplSplits = await prisma.routineSplit.findMany({
    where: { planId: plan3.id },
    orderBy: { order: "asc" },
  })
  const quemaSplits = await prisma.routineSplit.findMany({
    where: { planId: plan2.id },
    orderBy: { order: "asc" },
  })
  const definicionSplits = await prisma.routineSplit.findMany({
    where: { planId: coachPlan2.id },
    orderBy: { order: "asc" },
  })

  // Diego (Scenario 2): plan assigned by coach before onboarding
  await prisma.assignedRoutinePlan.upsert({
    where: { userId_planId: { userId: diego.id, planId: coachPlan1.id } },
    update: {},
    create: { userId: diego.id, planId: coachPlan1.id },
  })

  // Mateo (Scenario 4): active plan, 0 workouts — his own plan via onboarding
  await prisma.assignedRoutinePlan.upsert({
    where: { userId_planId: { userId: mateo.id, planId: plan1.id } },
    update: {},
    create: { userId: mateo.id, planId: plan1.id, startedAt: new Date(Date.now() - 2 * 86400000) },
  })

  // Sofia (Scenario 5): expired membership, still has an assigned plan
  await prisma.assignedRoutinePlan.upsert({
    where: { userId_planId: { userId: sofia.id, planId: plan2.id } },
    update: {},
    create: { userId: sofia.id, planId: plan2.id, startedAt: new Date(Date.now() - 28 * 86400000) },
  })

  // Ricardo (Scenario 6): inactive membership, has plan
  await prisma.assignedRoutinePlan.upsert({
    where: { userId_planId: { userId: ricardo.id, planId: coachPlan1.id } },
    update: {},
    create: {
      userId: ricardo.id,
      planId: coachPlan1.id,
      startedAt: new Date(Date.now() - 55 * 86400000),
    },
  })

  // Carlos (Scenario 7): power user — PPL plan
  await prisma.assignedRoutinePlan.upsert({
    where: { userId_planId: { userId: carlos.id, planId: plan3.id } },
    update: {},
    create: {
      userId: carlos.id,
      planId: plan3.id,
      startedAt: new Date(Date.now() - 14 * 86400000),
    },
  })

  // Ana (Scenario 8): regular — weight loss plan
  await prisma.assignedRoutinePlan.upsert({
    where: { userId_planId: { userId: ana.id, planId: plan2.id } },
    update: {},
    create: { userId: ana.id, planId: plan2.id, startedAt: new Date(Date.now() - 10 * 86400000) },
  })

  // Pedro (Scenario 9): advanced — coach plan
  await prisma.assignedRoutinePlan.upsert({
    where: { userId_planId: { userId: pedro.id, planId: coachPlan1.id } },
    update: {},
    create: {
      userId: pedro.id,
      planId: coachPlan1.id,
      startedAt: new Date(Date.now() - 21 * 86400000),
    },
  })

  console.log("✅ Plan assignments created")

  // NOTE: laura (fresh) and valentina (onboarding done, no plan) have NO assignment

  // ── Classes ─────────────────────────────────────────
  let class1 = await prisma.class.findFirst({
    where: { name: "HIIT Intenso", gymId: gym.id },
  })
  if (!class1) {
    class1 = await prisma.class.create({
      data: {
        name: "HIIT Intenso",
        description: "Entrenamiento interválico de alta intensidad.",
        trainerId: trainer.id,
        gymId: gym.id,
        capacity: 15,
        duration: 45,
        dayOfWeek: "MONDAY",
        startTime: "07:00",
      },
    })
  }
  let class2 = await prisma.class.findFirst({
    where: { name: "Yoga Vinyasa", gymId: gym.id },
  })
  if (!class2) {
    class2 = await prisma.class.create({
      data: {
        name: "Yoga Vinyasa",
        description: "Fluidez de posturas sincronizadas.",
        trainerId: trainer.id,
        gymId: gym.id,
        capacity: 20,
        duration: 60,
        dayOfWeek: "WEDNESDAY",
        startTime: "18:00",
      },
    })
  }
  console.log("✅ Classes created")

  // ── Bookings ────────────────────────────────────────
  await prisma.booking.deleteMany({})
  await prisma.booking.create({
    data: { userId: carlos.id, classId: class1.id, status: "CONFIRMED" },
  })
  await prisma.booking.create({ data: { userId: ana.id, classId: class2.id, status: "CONFIRMED" } })
  await prisma.booking.create({
    data: { userId: mateo.id, classId: class1.id, status: "CONFIRMED" },
  })
  console.log("✅ Bookings created")

  // ── Workout Logs ────────────────────────────────────
  await prisma.workoutSetLog.deleteMany({})
  await prisma.workoutLog.deleteMany({})
  // Carlos: 3 workouts this week (all splits completed)
  const carlosLogs = []
  if (pplSplits.length >= 3) {
    // Today - Split C (Legs)
    carlosLogs.push(
      await prisma.workoutLog.create({
        data: {
          userId: carlos.id,
          splitId: pplSplits[2].id,
          date: new Date(),
          duration: 70,
          notes: "Piernas pesadas. Buena congestión.",
        },
      })
    )
    // Yesterday - Split B (Pull)
    carlosLogs.push(
      await prisma.workoutLog.create({
        data: {
          userId: carlos.id,
          splitId: pplSplits[1].id,
          date: new Date(Date.now() - 1 * 86400000),
          duration: 55,
          notes: "Dominadas más fáciles.",
        },
      })
    )
    // Day before - Split A (Push)
    carlosLogs.push(
      await prisma.workoutLog.create({
        data: {
          userId: carlos.id,
          splitId: pplSplits[0].id,
          date: new Date(Date.now() - 2 * 86400000),
          duration: 65,
          notes: "Subí peso en press de banca.",
        },
      })
    )
  }

  // Ana: 1 workout this week
  const anaLo = []
  if (quemaSplits.length >= 1) {
    anaLo.push(
      await prisma.workoutLog.create({
        data: {
          userId: ana.id,
          splitId: quemaSplits[0].id,
          date: new Date(Date.now() - 1 * 86400000),
          duration: 48,
          notes: "Buen circuito, buena energía.",
        },
      })
    )
  }

  // Pedro: 3 workouts spread across 3 weeks
  if (pplSplits.length >= 3) {
    await prisma.workoutLog.create({
      data: {
        userId: pedro.id,
        splitId: pplSplits[0].id,
        date: new Date(Date.now() - 14 * 86400000),
        duration: 60,
      },
    })
    await prisma.workoutLog.create({
      data: {
        userId: pedro.id,
        splitId: pplSplits[1].id,
        date: new Date(Date.now() - 7 * 86400000),
        duration: 55,
      },
    })
  }

  // Sofia (expired): last workout 4 weeks ago
  if (quemaSplits.length >= 1) {
    await prisma.workoutLog.create({
      data: {
        userId: sofia.id,
        splitId: quemaSplits[0].id,
        date: new Date(Date.now() - 28 * 86400000),
        duration: 50,
      },
    })
  }

  // Ricardo (inactive): last workout 5 weeks ago
  if (definicionSplits.length >= 1) {
    await prisma.workoutLog.create({
      data: {
        userId: ricardo.id,
        splitId: definicionSplits[0].id,
        date: new Date(Date.now() - 35 * 86400000),
        duration: 45,
      },
    })
  }

  // Set logs for Carlos
  if (carlosLogs.length >= 1) {
    const pushLog = carlosLogs.find((l) => l?.splitId === pplSplits[0]?.id)
    const pullLog = carlosLogs.find((l) => l?.splitId === pplSplits[1]?.id)
    if (pushLog && pullLog) {
      await prisma.workoutSetLog.createMany({
        data: [
          {
            workoutLogId: pushLog.id,
            exerciseId: allExercises[0].id,
            exerciseName: "Press de banca",
            setNumber: 1,
            reps: 8,
            weight: 80,
          },
          {
            workoutLogId: pushLog.id,
            exerciseId: allExercises[0].id,
            exerciseName: "Press de banca",
            setNumber: 2,
            reps: 8,
            weight: 82.5,
          },
          {
            workoutLogId: pushLog.id,
            exerciseId: allExercises[0].id,
            exerciseName: "Press de banca",
            setNumber: 3,
            reps: 7,
            weight: 85,
          },
          {
            workoutLogId: pushLog.id,
            exerciseId: allExercises[0].id,
            exerciseName: "Press de banca",
            setNumber: 4,
            reps: 6,
            weight: 85,
          },
          {
            workoutLogId: pullLog.id,
            exerciseId: allExercises[4].id,
            exerciseName: "Dominadas",
            setNumber: 1,
            reps: 10,
            weight: 0,
          },
          {
            workoutLogId: pullLog.id,
            exerciseId: allExercises[4].id,
            exerciseName: "Dominadas",
            setNumber: 2,
            reps: 9,
            weight: 0,
          },
          {
            workoutLogId: pullLog.id,
            exerciseId: allExercises[4].id,
            exerciseName: "Dominadas",
            setNumber: 3,
            reps: 8,
            weight: 0,
          },
          {
            workoutLogId: pullLog.id,
            exerciseId: allExercises[4].id,
            exerciseName: "Dominadas",
            setNumber: 4,
            reps: 7,
            weight: 0,
          },
        ],
      })
    }
  }
  console.log("✅ Workout logs created")

  // ── Check-ins ───────────────────────────────────────
  // Carlos: 7-day streak
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000)
    await prisma.checkIn.upsert({
      where: { userId_date: { userId: carlos.id, date } },
      update: {},
      create: { userId: carlos.id, gymId: gym.id, date },
    })
  }
  // Ana: 5-day streak
  for (let i = 4; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000)
    await prisma.checkIn.upsert({
      where: { userId_date: { userId: ana.id, date } },
      update: {},
      create: { userId: ana.id, gymId: gym.id, date },
    })
  }
  console.log("✅ Check-ins created")

  // ── Body Measurements ───────────────────────────────
  // Carlos: 4 measurements over 28 days
  const weeksAgo = [28, 21, 14, 7]
  for (const d of weeksAgo) {
    const baseWeight = 78 + (28 - d) * 0.3
    const date = new Date(Date.now() - d * 86400000)
    await prisma.bodyMeasurement.upsert({
      where: { userId_date: { userId: carlos.id, date } },
      update: {},
      create: {
        userId: carlos.id,
        date,
        weight: baseWeight,
        height: 175,
        bodyFat: 18.5 - (28 - d) * 0.15,
        muscleMass: 59 + (28 - d) * 0.2,
        neck: 38,
        shoulders: 118,
        chest: 98,
        waist: 86 - (28 - d) * 0.2,
        hips: 95,
        leftArm: 35 + (28 - d) * 0.1,
        rightArm: 35.5 + (28 - d) * 0.1,
        leftForearm: 29,
        rightForearm: 29.5,
        leftThigh: 56,
        rightThigh: 56.5,
        leftCalf: 37,
        rightCalf: 37.5,
      },
    })
  }

  // Ana: 4 measurements
  for (const d of weeksAgo) {
    const baseWeight = 68 - (28 - d) * 0.25
    const date = new Date(Date.now() - d * 86400000)
    await prisma.bodyMeasurement.upsert({
      where: { userId_date: { userId: ana.id, date } },
      update: {},
      create: {
        userId: ana.id,
        date,
        weight: baseWeight,
        height: 168,
        bodyFat: 28 - (28 - d) * 0.2,
        muscleMass: 44 + (28 - d) * 0.15,
        neck: 32,
        shoulders: 96,
        chest: 88,
        waist: 80 - (28 - d) * 0.3,
        hips: 98 - (28 - d) * 0.2,
        leftArm: 27 + (28 - d) * 0.05,
        rightArm: 27.5 + (28 - d) * 0.05,
        leftForearm: 23,
        rightForearm: 23,
        leftThigh: 52,
        rightThigh: 52.5,
        leftCalf: 34,
        rightCalf: 34,
      },
    })
  }
  console.log("✅ Body measurements created")

  // ── Notifications ───────────────────────────────────
  await prisma.notification.deleteMany({})
  await prisma.notification.createMany({
    data: [
      {
        userId: carlos.id,
        title: "¡Bienvenido a Fitness Total!",
        message: "Tu rutina Push-Pull-Legs está lista. Empieza hoy.",
        type: "INFO",
      },
      {
        userId: ana.id,
        title: "Bienvenida Ana",
        message: "Coach Martínez te asignó una rutina. ¡Buena suerte!",
        type: "INFO",
      },
      {
        userId: pedro.id,
        title: "Bienvenido Pedro",
        message: "Tu rutina de fuerza avanzada está lista.",
        type: "INFO",
      },
      {
        userId: laura.id,
        title: "¡Te damos la bienvenida Laura!",
        message: "Completa tu perfil para recibir una rutina personalizada.",
        type: "INFO",
      },
      {
        userId: diego.id,
        title: "Coach Martínez te asignó",
        message:
          "Tu entrenador ya te preparó la rutina 'Fuerza 5x5 Modificada'. Termina tu configuración para empezar.",
        type: "INFO",
      },
      {
        userId: valentina.id,
        title: "Perfil completado",
        message: "Elige una rutina para comenzar tu entrenamiento.",
        type: "INFO",
      },
      {
        userId: sofia.id,
        title: "Membresía vencida",
        message: "Tu membresía expiró. Renová para seguir entrenando.",
        type: "WARNING",
      },
      {
        userId: ricardo.id,
        title: "Membresía suspendida",
        message: "Tu cuenta está temporalmente inactiva. Contactá al administrador.",
        type: "WARNING",
      },
    ],
  })
  console.log("✅ Notifications created")

  // ── Trainer Requests (demo) ─────────────────────────
  // Trainer 2 (Coach Andrea) sends a request to valentina (onboarding done, no coach)
  const valentinaRequest = await prisma.trainerRequest.upsert({
    where: { trainerId_clientId: { trainerId: trainer2.id, clientId: valentina.id } },
    update: {},
    create: {
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
      metadata: {
        requestId: valentinaRequest.id,
        trainerId: trainer2.id,
        trainerName: "Coach Andrea",
      },
    },
  })
  console.log("✅ Trainer requests created")

  // ── Trainer Invites (demo) ───────────────────────────
  await prisma.trainerInvite.deleteMany({})
  await prisma.trainerInvite.create({
    data: {
      token: "demo-invite-andrea-mariana",
      trainerId: trainer2.id,
      gymId: gym.id,
      name: "Mariana López",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  })
  console.log("✅ Trainer invites created")

  // ── Payment example (pending Yape payment) ──────────
  const existingPayment = await prisma.payment.findFirst({
    where: { userId: mateo.id, type: "MEMBERSHIP" },
  })
  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        userId: mateo.id,
        amount: 500,
        currency: "PEN",
        status: "PENDING",
        method: "YAPE",
        type: "MEMBERSHIP",
        receiptUrl: "/demo/receipt.svg",
      },
    })
  }
  console.log("✅ Payment examples created")

  console.log("\n🎉 Seed completed!")
  console.log("\n📋 Login credentials (password: demo123):")
  console.log("  Staff:")
  console.log("    Super Admin:  superadmin@gymapp.com")
  console.log("    Admin:        admin@gymapp.com")
  console.log("    Trainer:      trainer@gymapp.com    — Coach Martínez, 6 clientes asignados")
  console.log(
    "    Trainer 2:    trainer2@gymapp.com   — Coach Andrea, 0 clientes, 1 solicitud pendiente (Valentina)"
  )
  console.log("  Members:")
  console.log("    🆕 Laura       laura@gymapp.com      — sin onboarding, sin coach, sin plan")
  console.log("    🏋️ Diego       diego@gymapp.com      — coach asignado, sin onboarding aún")
  console.log(
    "    📋 Valentina   valentina@gymapp.com  — onboarding done, tiene solicitud pendiente de Coach Andrea"
  )
  console.log(
    "    🌱 Mateo       mateo@gymapp.com      — plan activo, 0 workouts, pago Yape pendiente"
  )
  console.log("    ⚠️  Sofia       sofia@gymapp.com      — membresía EXPIRADA")
  console.log("    🚫 Ricardo     ricardo@gymapp.com    — membresía INACTIVA")
  console.log("    💪 Carlos      carlos@gymapp.com     — power user, 3 workouts esta semana")
  console.log("    🔥 Ana         ana@gymapp.com        — activa, 1 workout esta semana")
  console.log("    🏆 Pedro       pedro@gymapp.com      — avanzado, workouts esporádicos")
  console.log(
    "    🧑 Roberto     roberto@gymapp.com    — onboarding done, SIN coach (ideal para asignar con trainer2)"
  )
  console.log("\n🔗 Invitación demo (trainer2): /invite/demo-invite-andrea-mariana")
  console.log("\n🔄 Flujo trainer→cliente:")
  console.log("  1. Login como trainer2, busca 'roberto' en /coach, envía solicitud")
  console.log("  2. Login como roberto, abre la campana de notificaciones y acepta la solicitud")
  console.log("  3. Roberto elige plan, sube comprobante Yape")
  console.log("  4. Login como trainer2, ve a /coach/payments, confirma el pago")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
