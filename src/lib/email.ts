import { logger } from "@/lib/logger"

/**
 * Correos con Resend (API HTTP, sin SDK). La llave va en `RESEND_API_KEY` y el remitente en
 * `EMAIL_FROM`. Si no hay llave o el envío falla, se registra en el log y se devuelve
 * `{ success: false }`: ningún flujo de la app se rompe por un correo.
 */

const RESEND_URL = "https://api.resend.com/emails"
export const DEFAULT_EMAIL_FROM = "GymApp <no-responder@davidmatos.lat>"
const SEND_TIMEOUT_MS = 10_000

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type EmailResult = { success: boolean; error?: string }

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html: string
  /** Para el log: qué correo es (nunca se registra la dirección). */
  kind: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const context = { kind: message.kind }

  if (!EMAIL_REGEX.test(message.to)) {
    return { success: false, error: "Correo inválido" }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    logger.warn("Email not sent: RESEND_API_KEY is not set", { context })
    return { success: false, error: "El envío de correos no está configurado" }
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      logger.error("Email send failed", {
        context: { ...context, status: response.status, detail: detail.slice(0, 300) },
      })
      return { success: false, error: "No se pudo enviar el correo" }
    }
    return { success: true }
  } catch (error) {
    logger.error("Email send failed", { context, error })
    return { success: false, error: "No se pudo enviar el correo" }
  }
}

/**
 * Recordatorio de que la membresía vence pronto.
 */
export async function sendMembershipReminder(
  email: string,
  name: string,
  daysLeft: number
): Promise<EmailResult> {
  if (!email || !name) {
    return { success: false, error: "Faltan el correo o el nombre" }
  }
  if (daysLeft < 0) {
    return { success: false, error: "Los días restantes no pueden ser negativos" }
  }

  const when = daysLeft === 0 ? "hoy" : daysLeft === 1 ? "mañana" : `en ${daysLeft} días`
  const subject = `Tu membresía vence ${when}`
  const text = [
    `Hola, ${name}:`,
    "",
    `Tu membresía del gimnasio vence ${when}. Renuévala desde la app o en recepción para seguir entrenando sin pausas.`,
    "",
    "GymApp",
  ].join("\n")
  const html = `<p>Hola, ${escapeHtml(name)}:</p><p>Tu membresía del gimnasio vence <strong>${when}</strong>. Renuévala desde la app o en recepción para seguir entrenando sin pausas.</p><p>GymApp</p>`

  return sendEmail({ to: email, subject, text, html, kind: "membership-reminder" })
}

/**
 * Enlace de un solo uso para elegir una contraseña nueva.
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string | null,
  resetUrl: string,
  validMinutes: number
): Promise<EmailResult> {
  const greeting = name ? `Hola, ${name}:` : "Hola:"
  const subject = "Elige una contraseña nueva"
  const text = [
    greeting,
    "",
    "Pediste cambiar tu contraseña de GymApp. Abre este enlace para elegir una nueva:",
    resetUrl,
    "",
    `El enlace sirve una sola vez y vence en ${validMinutes} minutos. Si no lo pediste, ignora este correo: tu contraseña no cambia.`,
    "",
    "GymApp",
  ].join("\n")
  const html = `<p>${escapeHtml(greeting)}</p><p>Pediste cambiar tu contraseña de GymApp. Toca el botón para elegir una nueva:</p><p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Elegir contraseña nueva</a></p><p>Si el botón no funciona, copia este enlace en el navegador:<br>${escapeHtml(resetUrl)}</p><p>El enlace sirve una sola vez y vence en ${validMinutes} minutos. Si no lo pediste, ignora este correo: tu contraseña no cambia.</p><p>GymApp</p>`

  return sendEmail({ to: email, subject, text, html, kind: "password-reset" })
}
