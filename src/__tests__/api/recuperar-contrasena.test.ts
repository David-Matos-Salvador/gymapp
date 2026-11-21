import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindFirst = vi.fn()
  const userUpdateMany = vi.fn()
  const tokenFindUnique = vi.fn()
  const tokenCreate = vi.fn()
  const tokenDeleteMany = vi.fn()
  const sendPasswordResetEmail = vi.fn()
  const rateLimit = vi.fn()
  const prisma = {
    user: { findFirst: userFindFirst, updateMany: userUpdateMany },
    verificationToken: {
      findUnique: tokenFindUnique,
      create: tokenCreate,
      deleteMany: tokenDeleteMany,
    },
    // Acepta la forma de arreglo y la de función, con el mismo cliente simulado.
    $transaction: async (arg: unknown): Promise<unknown> =>
      typeof arg === "function" ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
  }
  return {
    userFindFirst,
    userUpdateMany,
    tokenFindUnique,
    tokenCreate,
    tokenDeleteMany,
    sendPasswordResetEmail,
    rateLimit,
    prisma,
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }
})

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/logger", () => ({ logger: mocks.logger }))
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: mocks.sendPasswordResetEmail }))
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  requestIp: () => "1.2.3.4",
}))
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "hash-nuevo") } }))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      })
      Object.defineProperty(response, "json", { value: async () => body })
      return response
    }),
  },
}))

import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route"
import { POST as resetPassword } from "@/app/api/auth/reset-password/route"
import { hashResetToken, resetIdentifier, userIdFromIdentifier } from "@/lib/password-reset"

const SENT = "Si el correo está registrado, te enviamos un enlace para elegir una contraseña nueva."

function post(url: string, body: unknown) {
  return new Request(`http://localhost:3000${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("AUTH_URL", "https://gym.example.com")
  mocks.rateLimit.mockResolvedValue(true)
  mocks.userFindFirst.mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@test.com" })
  mocks.tokenCreate.mockResolvedValue({})
  mocks.tokenDeleteMany.mockResolvedValue({ count: 1 })
  mocks.userUpdateMany.mockResolvedValue({ count: 1 })
  mocks.sendPasswordResetEmail.mockResolvedValue({ success: true })
})

describe("password-reset (lib)", () => {
  it("el identificador guarda el id del usuario y el hash no es el token", () => {
    expect(userIdFromIdentifier(resetIdentifier("user-1"))).toBe("user-1")
    expect(userIdFromIdentifier("otra-cosa:user-1")).toBeNull()
    expect(hashResetToken("abc")).toHaveLength(64)
    expect(hashResetToken("abc")).not.toBe("abc")
  })
})

describe("POST /api/auth/forgot-password", () => {
  it("con un correo registrado guarda el hash del token, anula los anteriores y envía el enlace", async () => {
    const res = await forgotPassword(post("/api/auth/forgot-password", { email: " Ana@Test.com " }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ message: SENT })
    expect(mocks.userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { equals: "ana@test.com", mode: "insensitive" }, deletedAt: null },
      })
    )
    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: { identifier: "password-reset:user-1" },
    })

    const [email, name, url, minutes] = mocks.sendPasswordResetEmail.mock.calls[0]
    expect([email, name, minutes]).toEqual(["ana@test.com", "Ana", 60])
    const token = new URL(url).searchParams.get("token")!
    expect(url.startsWith("https://gym.example.com/reset-password?token=")).toBe(true)

    const saved = mocks.tokenCreate.mock.calls[0][0].data
    expect(saved.identifier).toBe("password-reset:user-1")
    expect(saved.token).toBe(hashResetToken(token))
    expect(saved.token).not.toBe(token)
    const minutesLeft = (saved.expires.getTime() - Date.now()) / 60_000
    expect(minutesLeft).toBeGreaterThan(59)
    expect(minutesLeft).toBeLessThanOrEqual(60)
  })

  it("con un correo sin cuenta responde lo mismo y no envía nada", async () => {
    mocks.userFindFirst.mockResolvedValue(null)

    const res = await forgotPassword(post("/api/auth/forgot-password", { email: "nadie@test.com" }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ message: SENT })
    expect(mocks.tokenCreate).not.toHaveBeenCalled()
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it("si el correo no sale, responde igual y lo registra en el log", async () => {
    mocks.sendPasswordResetEmail.mockResolvedValue({ success: false })

    const res = await forgotPassword(post("/api/auth/forgot-password", { email: "ana@test.com" }))

    expect(res.status).toBe(200)
    expect(mocks.logger.warn).toHaveBeenCalled()
  })

  it("400 con un correo inválido", async () => {
    const res = await forgotPassword(post("/api/auth/forgot-password", { email: "x" }))
    expect(res.status).toBe(400)
  })

  it("429 si se pide demasiadas veces", async () => {
    mocks.rateLimit.mockResolvedValue(false)
    const res = await forgotPassword(post("/api/auth/forgot-password", { email: "ana@test.com" }))
    expect(res.status).toBe(429)
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled()
  })
})

describe("POST /api/auth/reset-password", () => {
  const future = new Date(Date.now() + 30 * 60_000)

  function storedToken(token: string, expires = future) {
    mocks.tokenFindUnique.mockResolvedValue({
      identifier: "password-reset:user-1",
      token: hashResetToken(token),
      expires,
    })
  }

  it("con un enlace válido cambia la contraseña y borra el token", async () => {
    storedToken("tok")

    const res = await resetPassword(
      post("/api/auth/reset-password", { token: "tok", password: "Nueva1234" })
    )

    expect(res.status).toBe(200)
    expect(mocks.tokenFindUnique).toHaveBeenCalledWith({ where: { token: hashResetToken("tok") } })
    expect(mocks.userUpdateMany).toHaveBeenCalledWith({
      where: { id: "user-1", deletedAt: null },
      data: { password: "hash-nuevo" },
    })
    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: { token: hashResetToken("tok"), expires: { gt: expect.any(Date) } },
    })
  })

  it("400 si el enlace no existe", async () => {
    mocks.tokenFindUnique.mockResolvedValue(null)

    const res = await resetPassword(
      post("/api/auth/reset-password", { token: "x", password: "Nueva1234" })
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("El enlace ya se usó o venció. Pide uno nuevo.")
    expect(mocks.userUpdateMany).not.toHaveBeenCalled()
  })

  it("400 si el enlace venció", async () => {
    storedToken("tok", new Date(Date.now() - 1000))

    const res = await resetPassword(
      post("/api/auth/reset-password", { token: "tok", password: "Nueva1234" })
    )

    expect(res.status).toBe(400)
    expect(mocks.userUpdateMany).not.toHaveBeenCalled()
  })

  it("si otro envío ya usó el enlace, no cambia la contraseña", async () => {
    storedToken("tok")
    mocks.tokenDeleteMany.mockResolvedValue({ count: 0 })

    const res = await resetPassword(
      post("/api/auth/reset-password", { token: "tok", password: "Nueva1234" })
    )

    expect(res.status).toBe(400)
    expect(mocks.userUpdateMany).not.toHaveBeenCalled()
  })

  it("400 con una contraseña débil, con mensajes en español", async () => {
    storedToken("tok")

    const res = await resetPassword(
      post("/api/auth/reset-password", { token: "tok", password: "corta" })
    )

    expect(res.status).toBe(400)
    expect((await res.json()).details.password).toContain("Mínimo 8 caracteres")
    expect(mocks.userUpdateMany).not.toHaveBeenCalled()
  })
})
