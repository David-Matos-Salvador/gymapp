import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import { rateLimit, requestIp } from "@/lib/rate-limit"
import {
  hashResetToken,
  newPasswordSchema,
  resetIdentifier,
  userIdFromIdentifier,
} from "@/lib/password-reset"

const schema = z.object({
  token: z.string().min(1, "Falta el enlace"),
  password: newPasswordSchema,
})

const INVALID_LINK = "El enlace ya se usó o venció. Pide uno nuevo."

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  if (!(await rateLimit(`reset-password:${requestIp(request)}`, 10, 900))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
      { status: 429 }
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const tokenHash = hashResetToken(parsed.data.token)
    const stored = await prisma.verificationToken.findUnique({ where: { token: tokenHash } })
    const userId = stored ? userIdFromIdentifier(stored.identifier) : null
    if (!stored || !userId || stored.expires <= new Date()) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    const changed = await prisma.$transaction(async (tx) => {
      // Borrar el token es lo que lo hace de un solo uso: si otro envío ya lo borró, no pasa.
      const claimed = await tx.verificationToken.deleteMany({
        where: { token: tokenHash, expires: { gt: new Date() } },
      })
      if (claimed.count === 0) return false
      const updated = await tx.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: { password: passwordHash },
      })
      if (updated.count === 0) return false
      // Cualquier otro enlace pendiente de la misma persona deja de servir.
      await tx.verificationToken.deleteMany({ where: { identifier: resetIdentifier(userId) } })
      return true
    })

    if (!changed) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    return NextResponse.json({
      message: "Listo. Ya puedes iniciar sesión con tu contraseña nueva.",
    })
  } catch (error) {
    logger.error("Password reset failed", {
      requestId,
      context: { route: "POST /api/auth/reset-password" },
      error,
    })
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
