import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import Stripe from "stripe"

const stripeSecret = process.env.STRIPE_SECRET_KEY
// @ts-expect-error apiVersion basil is valid at runtime
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2025-04-30.basil" }) : null

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe no está configurado. Agrega STRIPE_SECRET_KEY al .env" },
      { status: 500 }
    )
  }

  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  if (user.stripeCustomerId) {
    return NextResponse.json({ customerId: user.stripeCustomerId })
  }

  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    })

    return NextResponse.json({ customerId: customer.id })
  } catch (error) {
    logger.error("Stripe customer creation failed", {
      requestId,
      context: { route: "POST /api/stripe/create-customer", userId: user.id },
      error,
    })
    return NextResponse.json({ error: "Error al crear cliente en Stripe" }, { status: 500 })
  }
}
