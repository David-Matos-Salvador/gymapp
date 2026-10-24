import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const DEFAULT_GYM_SLUG = "gymapp-default"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const gym = await prisma.gym.upsert({
    where: { slug: DEFAULT_GYM_SLUG },
    update: { isDefault: true, active: true },
    create: {
      name: "GymApp Default",
      slug: DEFAULT_GYM_SLUG,
      isDefault: true,
      active: true,
    },
  })

  const exercises = await prisma.exercise.findMany({ select: { id: true } })
  if (exercises.length > 0) {
    await prisma.gymExercise.createMany({
      data: exercises.map((exercise) => ({
        gymId: gym.id,
        exerciseId: exercise.id,
        active: true,
      })),
      skipDuplicates: true,
    })
    await prisma.gymExercise.updateMany({
      where: { gymId: gym.id, active: false },
      data: { active: true },
    })
  }

  const systemEquipment = await prisma.gymEquipment.findMany({
    where: { isSystem: true },
    select: { id: true },
  })
  if (systemEquipment.length > 0) {
    await prisma.gymEquipmentActivation.createMany({
      data: systemEquipment.map((equipment) => ({
        gymId: gym.id,
        equipmentId: equipment.id,
        active: true,
      })),
      skipDuplicates: true,
    })
    await prisma.gymEquipmentActivation.updateMany({
      where: { gymId: gym.id, active: false },
      data: { active: true },
    })
  }

  console.log(
    `✅ Seed prod completed: default gym "${gym.slug}", ${exercises.length} exercises and ${systemEquipment.length} system equipment activated`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
