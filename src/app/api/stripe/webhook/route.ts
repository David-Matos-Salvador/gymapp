import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
// @ts-expect-error apiVersion basil is valid at runtime
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2025-04-30.basil" }) : null

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    console.error("Stripe o webhook secret no configurado")
    return NextResponse.json({ error: "Configuración de Stripe incompleta" }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Falta firma de Stripe" }, { status: 400 })
  }

  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Error de firma webhook:", err)
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const { userId, planId } = session.metadata || {}

        if (!userId || !planId || !session.id) {
          console.error("Metadata faltante en sesión de checkout")
          return NextResponse.json({ error: "Metadata incompleta" }, { status: 400 })
        }

        const payment = await prisma.payment.findUnique({
          where: { stripeSessionId: session.id },
        })

        if (!payment) {
          console.error("Pago no encontrado para sesión:", session.id)
          return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
        }

        await prisma.payment.update({
          where: { stripeSessionId: session.id },
          data: {
            status: "COMPLETED",
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
          },
        })

        const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
        if (!plan) {
          console.error("Plan no encontrado:", planId)
          return NextResponse.json({ error: "Plan no encontrado" }, { status: 400 })
        }

        const startDate = new Date()
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + plan.durationDays)

        await prisma.membership.create({
          data: {
            userId,
            planId,
            startDate,
            endDate,
            status: "ACTIVE",
            paymentConfirmed: true,
            paymentMethod: "STRIPE",
            paymentRef: session.id,
          },
        })

        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error("Pago fallido:", paymentIntent.id)
        break
      }

      default:
        console.log("Evento no manejado:", event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error procesando webhook:", error)
    return NextResponse.json({ error: "Error interno al procesar webhook" }, { status: 500 })
  }
}
