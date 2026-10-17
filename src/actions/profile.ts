"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  objective: z
    .enum([
      "WEIGHT_LOSS",
      "MUSCLE_GAIN",
      "TONING",
      "STRENGTH",
      "ENDURANCE",
      "GENERAL_FITNESS",
      "REHABILITATION",
      "COMPETITION",
    ])
    .optional(),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]).optional(),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bio: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  medicalNotes: z.string().optional(),
  trainingFrequency: z.coerce.number().int().positive().optional(),
})

export async function updateProfile(prevState: unknown, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const rawData: Record<string, unknown> = {}
    for (const [key, value] of formData.entries()) {
      rawData[key] = value
    }

    const parsed = updateProfileSchema.safeParse(rawData)
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") }
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.birthDate !== undefined) updateData.birthDate = new Date(data.birthDate)
    if (data.objective !== undefined) updateData.objective = data.objective
    if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel
    if (data.sex !== undefined) updateData.sex = data.sex
    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact
    if (data.emergencyPhone !== undefined) updateData.emergencyPhone = data.emergencyPhone
    if (data.medicalNotes !== undefined) updateData.medicalNotes = data.medicalNotes
    if (data.trainingFrequency !== undefined) updateData.trainingFrequency = data.trainingFrequency

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        sex: true,
        birthDate: true,
        objective: true,
        experienceLevel: true,
        medicalNotes: true,
        emergencyContact: true,
        emergencyPhone: true,
        bio: true,
        image: true,
        trainingFrequency: true,
      },
    })

    revalidatePath("/profile")
    return { success: true, user: updated }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { error: "Error al actualizar el perfil" }
  }
}

export async function uploadAvatar(prevState: unknown, formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const file = formData.get("file") as File | null
    if (!file) {
      return { error: "No se seleccionó ningún archivo" }
    }

    const uploadFormData = new FormData()
    uploadFormData.append("file", file)

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/upload`, {
      method: "POST",
      body: uploadFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { error: errorData.error || "Error al subir la imagen" }
    }

    const { url } = await response.json()

    await prisma.user.update({
      where: { id: user.id },
      data: { image: url },
    })

    revalidatePath("/profile")
    return { success: true, imageUrl: url }
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return { error: "Error al subir el avatar" }
  }
}
