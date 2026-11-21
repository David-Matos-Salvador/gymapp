import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import Stripe from "stripe"
import { z } from "zod"

const stripeSecret = process.env.STRIPE_SECRET_KEY
// @ts-expect-error apiVersion basil is valid at runtime
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2025-04-30.basil" }) : null

// El navegador solo elige el plan: precio, nombre y moneda salen de la base (#191).
const checkoutSchema = z.object({ planId: z.string().min(1, "Elige un plan") })

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

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { planId } = parsed.data

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, name: true, price: true, currency: true, active: true, gymId: true },
  })
  if (!plan || !plan.active || !user.gymId || plan.gymId !== user.gymId) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }
  const price = Number(plan.price)
  if (!(price > 0)) {
    return NextResponse.json({ error: "Este plan no se paga con tarjeta" }, { status: 400 })
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: { name: plan.name },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { userId: user.id, planId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/membresia?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/membresia?canceled=true`,
    })

    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: plan.price,
        currency: plan.currency,
        status: "PENDING",
        method: "STRIPE",
        stripeSessionId: checkoutSession.id,
        type: "MEMBERSHIP",
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    logger.error("Stripe checkout creation failed", {
      requestId,
      context: { route: "POST /api/stripe/checkout", userId: user.id, planId },
      error,
    })
    return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 })
  }
}
