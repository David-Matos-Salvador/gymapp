"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const logSetSchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.number().int().positive(),
  reps: z.number().int().min(0).default(0),
  weight: z.number().min(0).default(0),
  rpe: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
})

export async function logSet(
  workoutLogId: string,
  data: {
    exerciseId: string
    setNumber: number
    reps: number
    weight: number
    rpe?: number
    notes?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const workoutLog = await prisma.workoutLog.findUnique({
      where: { id: workoutLogId },
    })
    if (!workoutLog) {
      return { error: "Workout log no encontrado" }
    }

    if (workoutLog.userId !== user.id) {
      return { error: "No autorizado para este workout log" }
    }

    const parsed = logSetSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") }
    }

    const { exerciseId, setNumber, reps, weight, rpe, notes } = parsed.data

    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } })
    if (!exercise) {
      return { error: "Ejercicio no encontrado" }
    }

    const existingSet = await prisma.workoutSetLog.findFirst({
      where: { workoutLogId, exerciseId, setNumber },
    })

    if (existingSet) {
      const updated = await prisma.workoutSetLog.update({
        where: { id: existingSet.id },
        data: { reps, weight, rpe, notes, completed: true },
      })

      revalidatePath(`/workout-logs/${workoutLogId}`)
      return { success: true, setLog: updated }
    }

    const setLog = await prisma.workoutSetLog.create({
      data: {
        workoutLogId,
        exerciseId,
        exerciseName: exercise.name,
        setNumber,
        reps,
        weight,
        rpe,
        notes,
        completed: true,
      },
    })

    revalidatePath(`/workout-logs/${workoutLogId}`)
    return { success: true, setLog }
  } catch (error) {
    console.error("Error logging set:", error)
    return { error: "Error al registrar la serie" }
  }
}

export async function completeWorkoutLog(workoutLogId: string) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const workoutLog = await prisma.workoutLog.findUnique({
      where: { id: workoutLogId },
      include: { sets: true },
    })
    if (!workoutLog) {
      return { error: "Workout log no encontrado" }
    }

    if (workoutLog.userId !== user.id) {
      return { error: "No autorizado para este workout log" }
    }

    await prisma.workoutSetLog.updateMany({
      where: { workoutLogId, completed: false },
      data: { completed: true },
    })

    await prisma.workoutLog.update({
      where: { id: workoutLogId },
      data: {
        duration: workoutLog.duration ?? 0,
      },
    })

    revalidatePath(`/workout-logs/${workoutLogId}`)
    revalidatePath("/workout-logs")
    return { success: true }
  } catch (error) {
    console.error("Error completing workout log:", error)
    return { error: "Error al completar el workout log" }
  }
}
