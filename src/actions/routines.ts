"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const splitExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.coerce.number().int().positive().default(3),
  reps: z.string().default("10"),
  weight: z.coerce.number().min(0).default(0),
  restSeconds: z.coerce.number().int().min(0).default(60),
  order: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
})

const splitSchema = z.object({
  label: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  muscleGroups: z.array(z.string()).default([]),
  estimatedDuration: z.coerce.number().int().positive().optional(),
  difficulty: z.string().optional(),
  order: z.coerce.number().int().min(0).default(0),
  exercises: z.array(splitExerciseSchema).default([]),
})

const createRoutineSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  objective: z
    .enum([
      "WEIGHT_LOSS", "MUSCLE_GAIN", "TONING", "STRENGTH",
      "ENDURANCE", "GENERAL_FITNESS", "REHABILITATION", "COMPETITION",
    ])
    .optional(),
  frequency: z.coerce.number().int().positive().optional(),
  difficulty: z.string().optional(),
  splits: z.array(splitSchema).default([]),
})

const updateRoutineSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  objective: z
    .enum([
      "WEIGHT_LOSS", "MUSCLE_GAIN", "TONING", "STRENGTH",
      "ENDURANCE", "GENERAL_FITNESS", "REHABILITATION", "COMPETITION",
    ])
    .optional(),
  frequency: z.coerce.number().int().positive().optional(),
  difficulty: z.string().optional(),
  splits: z.array(splitSchema).optional(),
})

function parseFormJson(key: string, formData: FormData): unknown {
  const raw = formData.get(key)
  if (typeof raw === "string" && raw.trim()) {
    try {
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  }
  return undefined
}

export async function createRoutine(prevState: unknown, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    if (user.role !== "ADMIN" && user.role !== "TRAINER") {
      return { error: "Sin permisos" }
    }

    const rawData = {
      name: formData.get("name"),
      description: formData.get("description"),
      objective: formData.get("objective"),
      frequency: formData.get("frequency"),
      difficulty: formData.get("difficulty"),
      splits: parseFormJson("splits", formData),
    }

    const parsed = createRoutineSchema.safeParse(rawData)
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") }
    }

    const { name, description, objective, frequency, difficulty, splits } = parsed.data

    const plan = await prisma.routinePlan.create({
      data: {
        userId: user.id,
        name,
        description,
        objective,
        frequency,
        difficulty,
        splits: splits.length > 0
          ? {
              create: splits.map((s) => ({
                label: s.label,
                name: s.name,
                description: s.description,
                muscleGroups: s.muscleGroups,
                estimatedDuration: s.estimatedDuration,
                difficulty: s.difficulty,
                order: s.order,
                exercises: s.exercises.length > 0
                  ? {
                      create: s.exercises.map((e) => ({
                        exerciseId: e.exerciseId,
                        sets: e.sets,
                        reps: e.reps,
                        weight: e.weight,
                        restSeconds: e.restSeconds,
                        order: e.order,
                        notes: e.notes,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        splits: {
          include: { exercises: true },
          orderBy: { order: "asc" },
        },
      },
    })

    revalidatePath("/routines")
    return { success: true, plan }
  } catch (error) {
    console.error("Error creating routine:", error)
    return { error: "Error al crear la rutina" }
  }
}

export async function updateRoutine(planId: string, prevState: unknown, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const existing = await prisma.routinePlan.findUnique({ where: { id: planId } })
    if (!existing) {
      return { error: "Rutina no encontrada" }
    }

    const rawData = {
      name: formData.get("name"),
      description: formData.get("description"),
      objective: formData.get("objective"),
      frequency: formData.get("frequency"),
      difficulty: formData.get("difficulty"),
      splits: parseFormJson("splits", formData),
    }

    const parsed = updateRoutineSchema.safeParse(rawData)
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") }
    }

    const { name, description, objective, frequency, difficulty, splits } = parsed.data

    const plan = await prisma.routinePlan.update({
      where: { id: planId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        objective,
        frequency,
        difficulty,
        ...(splits !== undefined && {
          splits: {
            deleteMany: {},
            create: splits.map((s) => ({
              label: s.label,
              name: s.name,
              description: s.description,
              muscleGroups: s.muscleGroups,
              estimatedDuration: s.estimatedDuration,
              difficulty: s.difficulty,
              order: s.order,
              exercises: s.exercises.length > 0
                ? {
                    create: s.exercises.map((e) => ({
                      exerciseId: e.exerciseId,
                      sets: e.sets,
                      reps: e.reps,
                      weight: e.weight,
                      restSeconds: e.restSeconds,
                      order: e.order,
                      notes: e.notes,
                    })),
                  }
                : undefined,
            })),
          },
        }),
      },
      include: {
        splits: {
          include: { exercises: true },
          orderBy: { order: "asc" },
        },
      },
    })

    revalidatePath("/routines")
    revalidatePath(`/routines/${planId}`)
    return { success: true, plan }
  } catch (error) {
    console.error("Error updating routine:", error)
    return { error: "Error al actualizar la rutina" }
  }
}

export async function deleteRoutine(planId: string) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const existing = await prisma.routinePlan.findUnique({ where: { id: planId } })
    if (!existing) {
      return { error: "Rutina no encontrada" }
    }

    await prisma.routinePlan.delete({ where: { id: planId } })

    revalidatePath("/routines")
    redirect("/routines")
  } catch (error) {
    console.error("Error deleting routine:", error)
    return { error: "Error al eliminar la rutina" }
  }
}
