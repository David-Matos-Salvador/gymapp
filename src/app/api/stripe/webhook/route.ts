import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import Stripe from "stripe"

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
        })

        if (!payment) {
          logger.error("Stripe payment not found", {
            requestId,
            context: { route: "POST /api/stripe/webhook", checkout: session.id },
          })
          return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
        }

        await prisma.payment.update({
          where: { stripeSessionId: session.id },
          data: {
            status: "COMPLETED",
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
          },
        })

        const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
        if (!plan) {
          logger.error("Stripe membership plan not found", {
            requestId,
            context: { route: "POST /api/stripe/webhook", planId },
          })
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
