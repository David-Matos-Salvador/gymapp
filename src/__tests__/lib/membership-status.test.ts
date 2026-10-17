import { describe, it, expect } from "vitest"
import {
  canRenewMembership,
  getMembershipStatusLabel,
  getMembershipTab,
  isMembershipExpired,
} from "@/lib/membership-status"

const NOW = new Date("2026-10-17T12:00:00.000Z")
const FUTURE = new Date("2026-10-20T12:00:00.000Z")
const PAST = new Date("2026-10-10T12:00:00.000Z")

describe("getMembershipTab", () => {
  it("classifies a current ACTIVE membership with confirmed payment as active", () => {
    expect(
      getMembershipTab({ status: "ACTIVE", endDate: FUTURE, paymentConfirmed: true }, NOW)
    ).toBe("active")
  })

  it("classifies a current ACTIVE membership without payment as pending", () => {
    expect(
      getMembershipTab({ status: "ACTIVE", endDate: FUTURE, paymentConfirmed: false }, NOW)
    ).toBe("pending")
  })

  it("classifies expired ACTIVE memberships as expired regardless of payment", () => {
    expect(getMembershipTab({ status: "ACTIVE", endDate: PAST, paymentConfirmed: true }, NOW)).toBe(
      "expired"
    )
    expect(
      getMembershipTab({ status: "ACTIVE", endDate: PAST, paymentConfirmed: false }, NOW)
    ).toBe("expired")
  })

  it.each(["INACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"])(
    "classifies %s memberships as expired even when their endDate is in the future",
    (status) => {
      expect(getMembershipTab({ status, endDate: FUTURE, paymentConfirmed: true }, NOW)).toBe(
        "expired"
      )
    }
  )

  it("assigns every membership to exactly one mutually exclusive tab", () => {
    const memberships = [
      { status: "ACTIVE", endDate: FUTURE, paymentConfirmed: true },
      { status: "ACTIVE", endDate: FUTURE, paymentConfirmed: false },
      { status: "ACTIVE", endDate: PAST, paymentConfirmed: true },
      { status: "INACTIVE", endDate: FUTURE, paymentConfirmed: true },
      { status: "EXPIRED", endDate: PAST, paymentConfirmed: false },
      { status: "SUSPENDED", endDate: FUTURE, paymentConfirmed: false },
      { status: "CANCELLED", endDate: FUTURE, paymentConfirmed: true },
    ]

    const tabs = memberships.map((membership) => getMembershipTab(membership, NOW))
    const active = tabs.filter((tab) => tab === "active")
    const pending = tabs.filter((tab) => tab === "pending")
    const expired = tabs.filter((tab) => tab === "expired")

    expect(active).toHaveLength(1)
    expect(pending).toHaveLength(1)
    expect(expired).toHaveLength(5)
    expect(active.length + pending.length + expired.length).toBe(memberships.length)
  })
})

describe("isMembershipExpired / canRenewMembership", () => {
  it("marks INACTIVE memberships as renewable so they can be renewed from the panel", () => {
    const inactive = { status: "INACTIVE", endDate: FUTURE, paymentConfirmed: true }

    expect(isMembershipExpired(inactive, NOW)).toBe(true)
    expect(canRenewMembership(inactive, NOW)).toBe(true)
  })

  it("does not offer renewal for a current ACTIVE membership", () => {
    const active = { status: "ACTIVE", endDate: FUTURE, paymentConfirmed: true }

    expect(isMembershipExpired(active, NOW)).toBe(false)
    expect(canRenewMembership(active, NOW)).toBe(false)
  })
})

describe("getMembershipStatusLabel", () => {
  it("returns the real badge label for every status", () => {
    expect(getMembershipStatusLabel("INACTIVE")).toBe("Inactiva")
    expect(getMembershipStatusLabel("EXPIRED")).toBe("Vencida")
    expect(getMembershipStatusLabel("SUSPENDED")).toBe("Suspendida")
    expect(getMembershipStatusLabel("CANCELLED")).toBe("Cancelada")
    expect(getMembershipStatusLabel("ACTIVE")).toBe("Activa")
  })

  it("falls back to the raw status for unknown values", () => {
    expect(getMembershipStatusLabel("UNKNOWN")).toBe("UNKNOWN")
  })
})
