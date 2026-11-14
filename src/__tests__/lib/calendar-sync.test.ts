import { randomBytes } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockFindUnique = vi.fn()
const mockUpsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockBlockDeleteMany = vi.fn()
const mockBlockCreateMany = vi.fn()
const mockTransaction = vi.fn()
const mockRefresh = vi.fn()
const mockFreeBusy = vi.fn()
const mockRevoke = vi.fn()
const mockWarn = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coachCalendarConnection: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    calendarBusyBlock: {
      deleteMany: (...args: unknown[]) => mockBlockDeleteMany(...args),
      createMany: (...args: unknown[]) => mockBlockCreateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock("@/lib/logger", () => ({ logger: { warn: (...args: unknown[]) => mockWarn(...args) } }))

vi.mock("@/lib/google-calendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/google-calendar")>()),
  refreshGoogleAccessToken: (...args: unknown[]) => mockRefresh(...args),
  queryGoogleFreeBusy: (...args: unknown[]) => mockFreeBusy(...args),
  revokeGoogleToken: (...args: unknown[]) => mockRevoke(...args),
}))

import { decryptSecret, encryptSecret } from "@/lib/calendar-crypto"
import {
  CALENDAR_CACHE_TTL_MS,
  disconnectCalendar,
  refreshCalendarCacheIfStale,
  saveCalendarConnection,
  syncCalendar,
} from "@/lib/calendar-sync"
import { GoogleAuthRevokedError, GoogleCalendarError } from "@/lib/google-calendar"

const NOW = new Date("2026-11-16T12:00:00Z")
const REFRESH_TOKEN = "refresh-token-secreto"

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    trainerId: "coach-1",
    calendarId: "primary",
    status: "ACTIVE",
    lastSyncAt: null,
    encryptedRefreshToken: encryptSecret(REFRESH_TOKEN),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "client-id")
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "client-secret")
  vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", randomBytes(32).toString("base64"))
  mockRefresh.mockResolvedValue("access-token")
  mockFreeBusy.mockResolvedValue([])
  mockRevoke.mockResolvedValue(true)
})

describe("saveCalendarConnection", () => {
  it("guarda el refresh token cifrado, nunca en texto plano", async () => {
    await saveCalendarConnection("coach-1", REFRESH_TOKEN)
    const args = mockUpsert.mock.calls[0][0]
    expect(args.where).toEqual({ trainerId: "coach-1" })
    for (const data of [args.create, args.update]) {
      expect(data.encryptedRefreshToken).not.toContain(REFRESH_TOKEN)
      expect(decryptSecret(data.encryptedRefreshToken)).toBe(REFRESH_TOKEN)
    }
    // Reconectar deja la conexión activa otra vez.
    expect(args.update.status).toBe("ACTIVE")
  })
})

describe("syncCalendar", () => {
  it("no hace nada si la integración no está configurada o no hay conexión", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "")
    expect(await syncCalendar("coach-1", NOW)).toBe("disabled")
    expect(mockFindUnique).not.toHaveBeenCalled()

    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "client-id")
    mockFindUnique.mockResolvedValue(null)
    expect(await syncCalendar("coach-1", NOW)).toBe("not_connected")
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("reemplaza la caché con lo que devuelve Google y marca la hora", async () => {
    mockFindUnique.mockResolvedValue(connection())
    mockFreeBusy.mockResolvedValue([
      { start: new Date("2026-11-16T14:00:00Z"), end: new Date("2026-11-16T15:00:00Z") },
    ])

    expect(await syncCalendar("coach-1", NOW)).toBe("synced")

    // Google recibe el token descifrado y una ventana que cubre los 14 días de reserva.
    expect(mockRefresh.mock.calls[0][1]).toBe(REFRESH_TOKEN)
    const query = mockFreeBusy.mock.calls[0][0]
    expect(query.accessToken).toBe("access-token")
    expect(query.calendarId).toBe("primary")
    expect(query.timeMin.getTime()).toBeLessThan(NOW.getTime())
    expect(query.timeMax.getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 14 * 86_400_000)

    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockBlockDeleteMany).toHaveBeenCalledWith({ where: { connectionId: "conn-1" } })
    expect(mockBlockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          connectionId: "conn-1",
          startsAt: new Date("2026-11-16T14:00:00Z"),
          endsAt: new Date("2026-11-16T15:00:00Z"),
        },
      ],
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { status: "ACTIVE", lastSyncAt: NOW },
    })
  })

  it("si Google revocó el acceso, pide reconectar y conserva la caché", async () => {
    mockFindUnique.mockResolvedValue(connection())
    mockRefresh.mockRejectedValue(new GoogleAuthRevokedError())

    expect(await syncCalendar("coach-1", NOW)).toBe("needs_reconnect")
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { status: "NEEDS_RECONNECT" },
    })
    expect(mockBlockDeleteMany).not.toHaveBeenCalled()
  })

  it("si Google está caído, no cambia nada y no registra secretos", async () => {
    mockFindUnique.mockResolvedValue(connection())
    mockFreeBusy.mockRejectedValue(new GoogleCalendarError("Google respondió 503"))

    expect(await syncCalendar("coach-1", NOW)).toBe("failed")
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockBlockDeleteMany).not.toHaveBeenCalled()
    const logged = JSON.stringify(mockWarn.mock.calls)
    expect(logged).not.toContain(REFRESH_TOKEN)
    expect(logged).not.toContain("access-token")
  })

  it("una credencial que no se puede descifrar cuenta como fallo, no rompe la agenda", async () => {
    mockFindUnique.mockResolvedValue(connection({ encryptedRefreshToken: "v1.x.y.z" }))
    expect(await syncCalendar("coach-1", NOW)).toBe("failed")
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})

describe("refreshCalendarCacheIfStale", () => {
  it("no consulta a Google si la caché es reciente", async () => {
    mockFindUnique.mockResolvedValue({
      status: "ACTIVE",
      lastSyncAt: new Date(NOW.getTime() - CALENDAR_CACHE_TTL_MS + 1000),
    })
    await refreshCalendarCacheIfStale("coach-1", NOW)
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("sincroniza si la caché venció o nunca se leyó", async () => {
    for (const lastSyncAt of [new Date(NOW.getTime() - CALENDAR_CACHE_TTL_MS - 1000), null]) {
      mockRefresh.mockClear()
      mockFindUnique
        .mockResolvedValueOnce({ status: "ACTIVE", lastSyncAt })
        .mockResolvedValueOnce(connection())
      await refreshCalendarCacheIfStale("coach-1", NOW)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    }
  })

  it("no insiste con Google si la conexión necesita reconectarse o no existe", async () => {
    mockFindUnique.mockResolvedValue({ status: "NEEDS_RECONNECT", lastSyncAt: null })
    await refreshCalendarCacheIfStale("coach-1", NOW)
    mockFindUnique.mockResolvedValue(null)
    await refreshCalendarCacheIfStale("coach-1", NOW)
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})

describe("disconnectCalendar", () => {
  it("revoca en Google y borra la credencial", async () => {
    mockFindUnique.mockResolvedValue(connection())
    expect(await disconnectCalendar("coach-1")).toBe(true)
    expect(mockRevoke).toHaveBeenCalledWith(REFRESH_TOKEN)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "conn-1" } })
  })

  it("borra la credencial aunque no se pueda descifrar ni revocar", async () => {
    mockFindUnique.mockResolvedValue(connection({ encryptedRefreshToken: "v1.x.y.z" }))
    expect(await disconnectCalendar("coach-1")).toBe(true)
    expect(mockRevoke).not.toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "conn-1" } })
  })

  it("devuelve false si no había nada conectado", async () => {
    mockFindUnique.mockResolvedValue(null)
    expect(await disconnectCalendar("coach-1")).toBe(false)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
