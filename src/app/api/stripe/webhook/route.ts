import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import Stripe from "stripe"
import { calculateRenewal, MS_PER_DAY } from "@/lib/membership-dates"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
// @ts-expect-error apiVersion basil is valid at runtime
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2025-04-30.basil" }) : null

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  if (!stripe || !webhookSecret) {
    logger.error("Stripe webhook is not configured", {
      requestId,
      context: { route: "POST /api/stripe/webhook" },
    })
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
    logger.error("Stripe webhook signature verification failed", {
      requestId,
      context: { route: "POST /api/stripe/webhook" },
      error: err,
    })
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const { userId, planId } = session.metadata || {}

        if (!userId || !planId || !session.id) {
          logger.error("Stripe checkout metadata is incomplete", {
            requestId,
            context: { route: "POST /api/stripe/webhook", checkout: session.id },
          })
          return NextResponse.json({ error: "Metadata incompleta" }, { status: 400 })
        }

        const payment = await prisma.payment.findUnique({
          where: { stripeSessionId: session.id },
          select: { id: true, userId: true, status: true },
        })

        if (!payment) {
          logger.error("Stripe payment not found", {
            requestId,
            context: { route: "POST /api/stripe/webhook", checkout: session.id },
          })
          return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
        }

        // Stripe reenvía eventos: si el pago ya se procesó, no se crea nada otra vez.
        if (payment.status === "COMPLETED") {
          logger.info("Stripe checkout already processed", {
            requestId,
            context: { route: "POST /api/stripe/webhook", checkout: session.id },
          })
          break
        }

        if (payment.userId !== userId) {
          logger.error("Stripe checkout user does not match the payment", {
            requestId,
            context: { route: "POST /api/stripe/webhook", checkout: session.id },
          })
          return NextResponse.json({ error: "El pago no corresponde al usuario" }, { status: 400 })
        }

        // El plan se revisa antes de marcar el pago: si no existe, el pago queda pendiente.
        const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
        if (!plan) {
          logger.error("Stripe membership plan not found", {
            requestId,
            context: { route: "POST /api/stripe/webhook", planId },
          })
          return NextResponse.json({ error: "Plan no encontrado" }, { status: 400 })
        }

        const stripePaymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null)

        await prisma.$transaction(async (tx) => {
          // Solo un evento puede pasar el pago de PENDING a COMPLETED.
          const claimed = await tx.payment.updateMany({
            where: { id: payment.id, status: "PENDING" },
            data: { status: "COMPLETED", stripePaymentIntentId, confirmedAt: new Date() },
          })
          if (claimed.count === 0) return

          const paid = {
            paymentConfirmed: true,
            paymentMethod: "STRIPE" as const,
            paymentRef: session.id,
            planPrice: plan.price,
            planCurrency: plan.currency,
            planDurationDays: plan.durationDays,
          }
          // Si ya tiene ese plan, se renueva: una membresía vigente se extiende desde su fin.
          const existing = await tx.membership.findUnique({
            where: { userId_planId: { userId, planId } },
          })
          let membershipId: string
          if (existing) {
            const renewal = calculateRenewal(existing, plan)
            const updated = await tx.membership.update({
              where: { id: existing.id },
              data: { ...renewal, ...paid },
            })
            membershipId = updated.id
          } else {
            const startDate = new Date()
            const created = await tx.membership.create({
              data: {
                userId,
                planId,
                startDate,
                endDate: new Date(startDate.getTime() + plan.durationDays * MS_PER_DAY),
                status: "ACTIVE",
                ...paid,
              },
            })
            membershipId = created.id
          }

          await tx.payment.update({ where: { id: payment.id }, data: { membershipId } })
        })

        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        logger.warn("Stripe payment failed", {
          requestId,
          context: { route: "POST /api/stripe/webhook", paymentIntent: paymentIntent.id },
        })
        break
      }

      default:
        logger.info("Unhandled Stripe event", {
          requestId,
          context: { route: "POST /api/stripe/webhook", eventType: event.type },
        })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error("Stripe webhook processing failed", {
      requestId,
      context: { route: "POST /api/stripe/webhook", eventType: event.type },
      error,
    })
    return NextResponse.json({ error: "Error interno al procesar webhook" }, { status: 500 })
  }
}
