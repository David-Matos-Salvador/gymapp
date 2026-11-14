import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/** Un usuario desactivado no puede iniciar sesión. */
export function canSignIn(user: { deletedAt: Date | null }): boolean {
  return user.deletedAt === null
}

/**
 * Campos de User que quedan al anonimizar: sin datos personales y sin forma de
 * entrar. El correo es único, así que se reemplaza por uno inválido propio del usuario.
 */
export function anonymizedUserData(userId: string) {
  return {
    name: "Usuario eliminado",
    email: `eliminado-${userId}@anonimo.invalid`,
    emailVerified: null,
    image: null,
    password: null,
    phone: null,
    birthDate: null,
    medicalNotes: null,
    emergencyContact: null,
    emergencyPhone: null,
    bio: null,
    specialties: Prisma.DbNull,
    certifications: Prisma.DbNull,
    onboardingData: Prisma.DbNull,
  }
}

/** Borrado lógico: conserva el historial, pero la persona ya no entra ni aparece en listas. */
export async function deactivateUser(userId: string, now: Date = new Date()) {
  return prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { deletedAt: now } }),
    prisma.session.deleteMany({ where: { userId } }),
    // La credencial del calendario externo no se conserva de una cuenta desactivada.
    prisma.coachCalendarConnection.deleteMany({ where: { trainerId: userId } }),
  ])
}

/**
 * Pedido de borrado de datos: anonimiza en vez de borrar. Los pagos y las membresías
 * se quedan, sin datos personales asociados.
 */
export async function anonymizeUser(userId: string, now: Date = new Date()) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { ...anonymizedUserData(userId), deletedAt: now },
    }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.progressPhoto.deleteMany({ where: { userId } }),
    prisma.coachCalendarConnection.deleteMany({ where: { trainerId: userId } }),
    prisma.payment.updateMany({
      where: { userId },
      data: { notes: null, reference: null, receiptUrl: null },
    }),
  ])
}
