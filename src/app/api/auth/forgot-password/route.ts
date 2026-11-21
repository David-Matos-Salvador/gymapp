import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import { rateLimit, requestIp } from "@/lib/rate-limit"
import { publicOrigin } from "@/lib/public-url"
import { sendPasswordResetEmail } from "@/lib/email"
import {
  RESET_TOKEN_MINUTES,
  buildResetUrl,
  newResetToken,
  resetIdentifier,
} from "@/lib/password-reset"

const schema = z.object({ email: z.string().trim().email("Correo inválido") })

// Siempre la misma respuesta: no revela si el correo tiene cuenta.
const SENT_MESSAGE =
  "Si el correo está registrado, te enviamos un enlace para elegir una contraseña nueva."

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const email = parsed.data.email.toLowerCase()

  const allowed =
    (await rateLimit(`forgot-password:ip:${requestIp(request)}`, 10, 900)) &&
    (await rateLimit(`forgot-password:email:${email}`, 3, 3600))
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
      { status: 429 }
    )
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: { id: true, name: true, email: true },
    })

    if (user) {
      const { token, tokenHash } = newResetToken()
      const identifier = resetIdentifier(user.id)
      // Un enlace nuevo anula los anteriores.
      await prisma.$transaction([
        prisma.verificationToken.deleteMany({ where: { identifier } }),
        prisma.verificationToken.create({
          data: {
            identifier,
            token: tokenHash,
            expires: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000),
          },
        }),
      ])

      const result = await sendPasswordResetEmail(
        user.email,
        user.name,
        buildResetUrl(publicOrigin(request), token),
        RESET_TOKEN_MINUTES
      )
      if (!result.success) {
        logger.warn("Password reset email not sent", {
          requestId,
          context: { route: "POST /api/auth/forgot-password", userId: user.id },
        })
      }
    }

    return NextResponse.json({ message: SENT_MESSAGE })
  } catch (error) {
    logger.error("Password reset request failed", {
      requestId,
      context: { route: "POST /api/auth/forgot-password" },
      error,
    })
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
