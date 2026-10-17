import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockAuth = vi.fn()
const mockUserFindUnique = vi.fn()
const mockMembershipFindUnique = vi.fn()
const mockMembershipUpdate = vi.fn()

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    membership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
      update: (...args: unknown[]) => mockMembershipUpdate(...args),
    },
  },
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json", ...init?.headers },
      })
      Object.defineProperty(response, "json", {
        value: async () => body,
      })
      return response
    }),
  },
}))

import { PATCH } from "@/app/api/memberships/[id]/route"

const NOW = new Date("2026-10-17T12:00:00.000Z")
const DAY = 24 * 60 * 60 * 1000

interface ExistingMembershipOverrides {
  id?: string
  userId?: string
  status?: string
  startDate?: Date
  endDate?: Date
  paymentConfirmed?: boolean
  durationDays?: number
}

function buildExisting(overrides: ExistingMembershipOverrides = {}) {
  const { durationDays = 30, ...rest } = overrides

  return {
    id: "m-1",
    userId: "u-carlos",
    planId: "p-1",
    status: "ACTIVE",
    startDate: new Date("2026-10-01T12:00:00.000Z"),
    endDate: new Date("2026-10-24T12:00:00.000Z"),
    autoRenew: false,
    paymentConfirmed: true,
    paymentMethod: "CASH",
    paymentRef: null,
    notes: null,
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-01T12:00:00.000Z"),
    plan: { id: "p-1", durationDays },
    ...rest,
  }
}

function patchRequest(body: unknown) {
  return new Request("http://localhost:3112/api/memberships/m-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function routeParams(id = "m-1") {
  return { params: Promise.resolve({ id }) }
}

function loginAs(id: string, role: string, email = `${id}@gymapp.com`) {
  mockAuth.mockResolvedValue({ user: { email } })
  mockUserFindUnique.mockResolvedValue({ id, role })
}

describe("PATCH /api/memberships/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    mockMembershipUpdate.mockImplementation(
      async (args: { where: { id: string }; data: object }) => ({
        ...buildExisting({ id: args.where.id }),
        ...args.data,
      })
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await PATCH(patchRequest({ paymentConfirmed: true }), routeParams())

    expect(response.status).toBe(401)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("blocks Carlos from modifying Ana's membership (IDOR)", async () => {
    loginAs("u-carlos", "MEMBER", "carlos@gymapp.com")
    mockMembershipFindUnique.mockResolvedValue(buildExisting({ id: "m-ana", userId: "u-ana" }))

    const response = await PATCH(patchRequest({ paymentConfirmed: true }), routeParams("m-ana"))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toMatch(/No autorizado/)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("does not allow a member to confirm their own payment from the client", async () => {
    loginAs("u-carlos", "MEMBER", "carlos@gymapp.com")
    mockMembershipFindUnique.mockResolvedValue(buildExisting())

    const response = await PATCH(patchRequest({ paymentConfirmed: true }), routeParams())

    expect(response.status).toBe(403)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("renews an expired membership on the server and resets payment confirmation", async () => {
    loginAs("u-carlos", "MEMBER", "carlos@gymapp.com")
    mockMembershipFindUnique.mockResolvedValue(
      buildExisting({
        status: "EXPIRED",
        endDate: new Date("2026-10-16T12:00:00.000Z"),
        paymentConfirmed: true,
      })
    )

    const response = await PATCH(patchRequest({ renew: true }), routeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockMembershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m-1" },
        data: {
          startDate: NOW,
          endDate: new Date(NOW.getTime() + 30 * DAY),
          status: "ACTIVE",
          paymentConfirmed: false,
        },
      })
    )
    expect(new Date(body.membership.endDate).getTime()).toBeGreaterThan(NOW.getTime())
  })

  it("extends a current ACTIVE membership from its existing endDate and keeps the payment", async () => {
    loginAs("u-admin", "ADMIN", "admin@gymapp.com")
    const existing = buildExisting({
      status: "ACTIVE",
      endDate: new Date("2026-10-24T12:00:00.000Z"),
      paymentConfirmed: true,
      durationDays: 30,
    })
    mockMembershipFindUnique.mockResolvedValue(existing)

    const response = await PATCH(patchRequest({ renew: true }), routeParams())

    expect(response.status).toBe(200)
    expect(mockMembershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          startDate: existing.startDate,
          endDate: new Date(existing.endDate.getTime() + 30 * DAY),
          status: "ACTIVE",
          paymentConfirmed: true,
        },
      })
    )
  })

  it("lets an admin confirm a payment", async () => {
    loginAs("u-admin", "ADMIN", "admin@gymapp.com")
    mockMembershipFindUnique.mockResolvedValue(
      buildExisting({ id: "m-ana", userId: "u-ana", paymentConfirmed: false })
    )

    const response = await PATCH(patchRequest({ paymentConfirmed: true }), routeParams("m-ana"))

    expect(response.status).toBe(200)
    expect(mockMembershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m-ana" },
        data: { paymentConfirmed: true },
      })
    )
  })

  it("returns 400 and does not update when the plan duration is invalid", async () => {
    loginAs("u-carlos", "MEMBER", "carlos@gymapp.com")
    mockMembershipFindUnique.mockResolvedValue(
      buildExisting({ status: "EXPIRED", durationDays: 0 })
    )

    const response = await PATCH(patchRequest({ renew: true }), routeParams())
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/al menos 1 día/)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("rejects explicit dates whose end is not after their start", async () => {
    loginAs("u-admin", "ADMIN", "admin@gymapp.com")
    mockMembershipFindUnique.mockResolvedValue(buildExisting())

    const response = await PATCH(
      patchRequest({
        startDate: "2026-11-01T12:00:00.000Z",
        endDate: "2026-10-01T12:00:00.000Z",
      }),
      routeParams()
    )

    expect(response.status).toBe(400)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("rejects explicit dates that shorten a future endDate", async () => {
    loginAs("u-admin", "ADMIN", "admin@gymapp.com")
    mockMembershipFindUnique.mockResolvedValue(buildExisting())

    const response = await PATCH(
      patchRequest({ endDate: "2026-10-20T12:00:00.000Z" }),
      routeParams()
    )

    expect(response.status).toBe(400)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })
})
