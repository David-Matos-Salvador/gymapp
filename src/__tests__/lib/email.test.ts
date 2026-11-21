import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const logger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger }))

import {
  DEFAULT_EMAIL_FROM,
  sendEmail,
  sendMembershipReminder,
  sendPasswordResetEmail,
} from "@/lib/email"

const message = {
  to: "ana@test.com",
  subject: "Hola",
  text: "Texto",
  html: "<p>Texto</p>",
  kind: "prueba",
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetchMock.mock.calls[0][1].body as string)
}

describe("sendEmail (Resend)", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "email-1" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("RESEND_API_KEY", "re_prueba")
    vi.stubEnv("EMAIL_FROM", "")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("sin RESEND_API_KEY no envía nada: lo registra en el log y devuelve success: false", async () => {
    vi.stubEnv("RESEND_API_KEY", "")

    const result = await sendEmail(message)

    expect(result.success).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "Email not sent: RESEND_API_KEY is not set",
      expect.objectContaining({ context: { kind: "prueba" } })
    )
  })

  it("envía a Resend con la llave y el remitente por defecto", async () => {
    const result = await sendEmail(message)

    expect(result).toEqual({ success: true })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_prueba" }),
      })
    )
    expect(sentBody(fetchMock)).toEqual({
      from: DEFAULT_EMAIL_FROM,
      to: ["ana@test.com"],
      subject: "Hola",
      text: "Texto",
      html: "<p>Texto</p>",
    })
    expect(DEFAULT_EMAIL_FROM).toBe("GymApp <no-responder@davidmatos.lat>")
  })

  it("usa EMAIL_FROM si está definido", async () => {
    vi.stubEnv("EMAIL_FROM", "Gimnasio <hola@ejemplo.com>")

    await sendEmail(message)

    expect(sentBody(fetchMock).from).toBe("Gimnasio <hola@ejemplo.com>")
  })

  it("si Resend responde con error, lo registra sin la dirección y no lanza", async () => {
    fetchMock.mockResolvedValue(new Response("dominio no verificado", { status: 403 }))

    const result = await sendEmail(message)

    expect(result.success).toBe(false)
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(logger.error.mock.calls[0])).not.toContain("ana@test.com")
  })

  it("si la red falla, devuelve success: false sin lanzar", async () => {
    fetchMock.mockRejectedValue(new Error("sin red"))

    await expect(sendEmail(message)).resolves.toMatchObject({ success: false })
    expect(logger.error).toHaveBeenCalled()
  })

  it("no intenta enviar a un correo inválido", async () => {
    const result = await sendEmail({ ...message, to: "no-es-correo" })

    expect(result.success).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("el recordatorio de membresía va en español y tratando de tú", async () => {
    await sendMembershipReminder("ana@test.com", "Ana", 3)

    const body = sentBody(fetchMock)
    expect(body.subject).toBe("Tu membresía vence en 3 días")
    expect(body.text).toContain("Hola, Ana:")
    expect(body.text).toContain("Renuévala")
  })

  it("el correo de recuperación lleva el enlace y cuánto dura, y escapa el nombre", async () => {
    await sendPasswordResetEmail(
      "ana@test.com",
      "<Ana>",
      "https://gym.example.com/reset-password?token=abc",
      60
    )

    const body = sentBody(fetchMock)
    expect(body.subject).toBe("Elige una contraseña nueva")
    expect(body.text).toContain("https://gym.example.com/reset-password?token=abc")
    expect(body.text).toContain("vence en 60 minutos")
    expect(body.html).toContain("&lt;Ana&gt;")
    expect(body.html).not.toContain("<Ana>")
  })
})
