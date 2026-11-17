import { describe, it, expect, vi, beforeEach } from "vitest"

// Se captura la configuración que recibe NextAuth para probar su lógica sin levantar NextAuth.
const h = vi.hoisted(() => ({
  config: null as null | Record<string, unknown>,
  userFindUnique: vi.fn(),
  gymFindUnique: vi.fn(),
  rateLimit: vi.fn(),
  compare: vi.fn(),
}))

vi.mock("next-auth", () => ({
  default: (config: Record<string, unknown>) => {
    h.config = config
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  },
}))

vi.mock("next-auth/providers/credentials", () => ({
  default: (options: Record<string, unknown>) => ({ id: "credentials", ...options }),
}))

vi.mock("next-auth/providers/google", () => ({
  default: (options: Record<string, unknown>) => ({ id: "google", ...options }),
}))

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({}),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => h.userFindUnique(...args) },
    gym: { findUnique: (...args: unknown[]) => h.gymFindUnique(...args) },
  },
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => h.rateLimit(...args),
}))

vi.mock("bcryptjs", () => ({
  default: { compare: (...args: unknown[]) => h.compare(...args) },
}))

import "@/lib/auth"

type Authorize = (credentials: Record<string, unknown> | undefined) => Promise<unknown>
type Callbacks = {
  signIn: (params: { user: { id?: string } }) => Promise<boolean>
  jwt: (params: {
    token: Record<string, unknown>
    user?: Record<string, unknown>
    trigger?: string
    session?: unknown
  }) => Promise<Record<string, unknown>>
  session: (params: {
    session: { user?: Record<string, unknown> }
    token: Record<string, unknown>
  }) => Promise<{ user?: Record<string, unknown> }>
}

function getConfig() {
  if (!h.config) throw new Error("NextAuth no recibió configuración")
  return h.config as {
    session: { strategy: string }
    pages: { signIn: string; error: string }
    providers: { id: string; authorize?: Authorize }[]
    callbacks: Callbacks
  }
}

function getAuthorize(): Authorize {
  const credentials = getConfig().providers.find((p) => p.id === "credentials")
  if (!credentials?.authorize) throw new Error("No hay proveedor de credenciales")
  return credentials.authorize
}

const usuarioBase = {
  id: "user-1",
  email: "ana@gym.pe",
  name: "Ana",
  image: null,
  password: "hash-guardado",
  role: "CLIENT",
  gymId: "gym-1",
  deletedAt: null,
  onboardingCompleted: true,
  onboardingCompletedAt: new Date("2026-01-15T10:00:00.000Z"),
  ownedGym: null,
}

describe("configuración de NextAuth", () => {
  it("usa sesiones JWT, la página /login y los proveedores de Google y credenciales", () => {
    const config = getConfig()
    expect(config.session.strategy).toBe("jwt")
    expect(config.pages).toEqual({ signIn: "/login", error: "/login" })
    expect(config.providers.map((p) => p.id)).toEqual(["google", "credentials"])
  })
})

describe("authorize con credenciales", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.rateLimit.mockResolvedValue(true)
    h.userFindUnique.mockResolvedValue(usuarioBase)
    h.compare.mockResolvedValue(true)
    h.gymFindUnique.mockResolvedValue({ active: true })
  })

  it("devuelve los datos de sesión cuando el correo y la contraseña son correctos", async () => {
    const result = await getAuthorize()({ email: "ana@gym.pe", password: "secreta" })

    expect(result).toEqual({
      id: "user-1",
      email: "ana@gym.pe",
      name: "Ana",
      image: null,
      role: "CLIENT",
      onboardingCompleted: true,
      onboardingCompletedAt: "2026-01-15T10:00:00.000Z",
      isGymOwner: false,
    })
    expect(h.compare).toHaveBeenCalledWith("secreta", "hash-guardado")
    expect(h.userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "ana@gym.pe" } })
    )
  })

  it("marca como dueño de gym a quien tiene un gym propio y deja la fecha de onboarding en null si no hay", async () => {
    h.userFindUnique.mockResolvedValue({
      ...usuarioBase,
      role: "ADMIN",
      ownedGym: { id: "gym-1" },
      onboardingCompleted: false,
      onboardingCompletedAt: null,
    })

    const result = await getAuthorize()({ email: "ana@gym.pe", password: "secreta" })

    expect(result).toMatchObject({
      role: "ADMIN",
      isGymOwner: true,
      onboardingCompleted: false,
      onboardingCompletedAt: null,
    })
  })

  it("rechaza si falta el correo o la contraseña, sin consultar la base", async () => {
    const authorize = getAuthorize()

    expect(await authorize(undefined)).toBeNull()
    expect(await authorize({ email: "ana@gym.pe" })).toBeNull()
    expect(await authorize({ password: "secreta" })).toBeNull()
    expect(await authorize({ email: "", password: "secreta" })).toBeNull()
    expect(h.userFindUnique).not.toHaveBeenCalled()
    expect(h.rateLimit).not.toHaveBeenCalled()
  })

  it("limita los intentos por correo en minúsculas y rechaza al pasar el límite", async () => {
    h.rateLimit.mockResolvedValue(false)

    const result = await getAuthorize()({ email: "Ana@Gym.PE", password: "secreta" })

    expect(result).toBeNull()
    expect(h.rateLimit).toHaveBeenCalledWith("login:ana@gym.pe", 15, 900)
    expect(h.userFindUnique).not.toHaveBeenCalled()
  })

  it("rechaza si el usuario no existe", async () => {
    h.userFindUnique.mockResolvedValue(null)

    expect(await getAuthorize()({ email: "nadie@gym.pe", password: "secreta" })).toBeNull()
    expect(h.compare).not.toHaveBeenCalled()
  })

  it("rechaza al usuario sin contraseña (cuenta solo de Google)", async () => {
    h.userFindUnique.mockResolvedValue({ ...usuarioBase, password: null })

    expect(await getAuthorize()({ email: "ana@gym.pe", password: "secreta" })).toBeNull()
    expect(h.compare).not.toHaveBeenCalled()
  })

  it("rechaza al usuario desactivado aunque la contraseña sea correcta", async () => {
    h.userFindUnique.mockResolvedValue({ ...usuarioBase, deletedAt: new Date("2026-02-01") })

    expect(await getAuthorize()({ email: "ana@gym.pe", password: "secreta" })).toBeNull()
    expect(h.compare).not.toHaveBeenCalled()
  })

  it("rechaza si la contraseña es incorrecta", async () => {
    h.compare.mockResolvedValue(false)

    expect(await getAuthorize()({ email: "ana@gym.pe", password: "otra" })).toBeNull()
    expect(h.gymFindUnique).not.toHaveBeenCalled()
  })

  it("rechaza al usuario de un gym inactivo", async () => {
    h.gymFindUnique.mockResolvedValue({ active: false })

    expect(await getAuthorize()({ email: "ana@gym.pe", password: "secreta" })).toBeNull()
    expect(h.gymFindUnique).toHaveBeenCalledWith({
      where: { id: "gym-1" },
      select: { active: true },
    })
  })

  it("rechaza al usuario cuyo gym ya no existe", async () => {
    h.gymFindUnique.mockResolvedValue(null)

    expect(await getAuthorize()({ email: "ana@gym.pe", password: "secreta" })).toBeNull()
  })

  it("deja entrar al súper admin sin revisar el gym", async () => {
    h.userFindUnique.mockResolvedValue({ ...usuarioBase, role: "SUPER_ADMIN" })
    h.gymFindUnique.mockResolvedValue({ active: false })

    expect(await getAuthorize()({ email: "ana@gym.pe", password: "secreta" })).toMatchObject({
      role: "SUPER_ADMIN",
    })
    expect(h.gymFindUnique).not.toHaveBeenCalled()
  })

  it("deja entrar al usuario sin gym asignado sin revisar el gym", async () => {
    h.userFindUnique.mockResolvedValue({ ...usuarioBase, gymId: null })

    expect(await getAuthorize()({ email: "ana@gym.pe", password: "secreta" })).toMatchObject({
      id: "user-1",
    })
    expect(h.gymFindUnique).not.toHaveBeenCalled()
  })
})

describe("callback signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("permite entrar si el usuario no trae id (primer ingreso con Google)", async () => {
    expect(await getConfig().callbacks.signIn({ user: {} })).toBe(true)
    expect(h.userFindUnique).not.toHaveBeenCalled()
  })

  it("permite entrar si el usuario todavía no existe en la base", async () => {
    h.userFindUnique.mockResolvedValue(null)

    expect(await getConfig().callbacks.signIn({ user: { id: "user-1" } })).toBe(true)
  })

  it("permite entrar al usuario activo y bloquea al desactivado", async () => {
    const { signIn } = getConfig().callbacks

    h.userFindUnique.mockResolvedValue({ deletedAt: null })
    expect(await signIn({ user: { id: "user-1" } })).toBe(true)

    h.userFindUnique.mockResolvedValue({ deletedAt: new Date("2026-02-01") })
    expect(await signIn({ user: { id: "user-1" } })).toBe(false)
    expect(h.userFindUnique).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      select: { deletedAt: true },
    })
  })
})

describe("callback jwt", () => {
  it("copia rol, onboarding y si es dueño de gym al token al iniciar sesión", async () => {
    const token = await getConfig().callbacks.jwt({
      token: { sub: "user-1" },
      user: {
        id: "user-1",
        role: "TRAINER",
        onboardingCompleted: true,
        onboardingCompletedAt: "2026-01-15T10:00:00.000Z",
        isGymOwner: false,
      },
    })

    expect(token).toEqual({
      sub: "user-1",
      role: "TRAINER",
      onboardingCompleted: true,
      onboardingCompletedAt: "2026-01-15T10:00:00.000Z",
      isGymOwner: false,
    })
  })

  it("convierte una fecha de onboarding null en undefined", async () => {
    const token = await getConfig().callbacks.jwt({
      token: {},
      user: { role: "CLIENT", onboardingCompleted: false, onboardingCompletedAt: null },
    })

    expect(token.onboardingCompletedAt).toBeUndefined()
  })

  it("sin usuario ni actualización deja el token igual", async () => {
    const original = { sub: "user-1", role: "CLIENT", onboardingCompleted: false }

    expect(await getConfig().callbacks.jwt({ token: { ...original } })).toEqual(original)
  })

  it("al actualizar la sesión marca el onboarding con la fecha enviada", async () => {
    const token = await getConfig().callbacks.jwt({
      token: { role: "CLIENT", onboardingCompleted: false },
      trigger: "update",
      session: { onboardingCompleted: true, onboardingCompletedAt: "2026-03-01T00:00:00.000Z" },
    })

    expect(token).toMatchObject({
      role: "CLIENT",
      onboardingCompleted: true,
      onboardingCompletedAt: "2026-03-01T00:00:00.000Z",
    })
  })

  it("al actualizar la sesión sin fecha usa la fecha actual", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"))
    try {
      const token = await getConfig().callbacks.jwt({
        token: { onboardingCompleted: false },
        trigger: "update",
        session: { onboardingCompleted: true },
      })

      expect(token.onboardingCompletedAt).toBe("2026-04-10T12:00:00.000Z")
    } finally {
      vi.useRealTimers()
    }
  })

  it("ignora una actualización que no trae onboardingCompleted", async () => {
    const token = await getConfig().callbacks.jwt({
      token: { role: "CLIENT", onboardingCompleted: false },
      trigger: "update",
      session: { name: "Otro nombre" },
    })

    expect(token).toEqual({ role: "CLIENT", onboardingCompleted: false })
  })
})

describe("callback session", () => {
  it("pasa rol, onboarding y dueño de gym del token a session.user", async () => {
    const session = await getConfig().callbacks.session({
      session: { user: { email: "ana@gym.pe" } },
      token: {
        role: "ADMIN",
        onboardingCompleted: true,
        onboardingCompletedAt: "2026-01-15T10:00:00.000Z",
        isGymOwner: true,
      },
    })

    expect(session.user).toEqual({
      email: "ana@gym.pe",
      role: "ADMIN",
      onboardingCompleted: true,
      onboardingCompletedAt: "2026-01-15T10:00:00.000Z",
      isGymOwner: true,
    })
  })

  it("no falla si la sesión no trae usuario", async () => {
    const session = await getConfig().callbacks.session({
      session: {},
      token: { role: "ADMIN" },
    })

    expect(session.user).toBeUndefined()
  })
})
