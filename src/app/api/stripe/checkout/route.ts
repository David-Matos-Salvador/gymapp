import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const stripeSecret = process.env.STRIPE_SECRET_KEY
// @ts-expect-error apiVersion basil is valid at runtime
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2025-04-30.basil" }) : null

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe no está configurado. Agrega STRIPE_SECRET_KEY al .env" },
      { status: 500 }
    )
  }

  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const { planId, price, planName } = body

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: { name: planName },
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
        amount: price,
        currency: "mxn",
        status: "PENDING",
        method: "STRIPE",
        stripeSessionId: checkoutSession.id,
        type: "MEMBERSHIP",
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 })
  }
}
