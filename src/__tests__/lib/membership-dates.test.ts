import { describe, it, expect } from "vitest"
import { calculateRenewal, MS_PER_DAY } from "@/lib/membership-dates"

const NOW = new Date("2026-10-17T12:00:00.000Z")

function date(value: string) {
  return new Date(value)
}

describe("calculateRenewal", () => {
  it("extends an ACTIVE membership that is still current without touching startDate", () => {
    const existing = {
      status: "ACTIVE",
      startDate: date("2026-10-01T12:00:00.000Z"),
      endDate: date("2026-10-24T12:00:00.000Z"),
      paymentConfirmed: true,
    }

    const result = calculateRenewal(existing, { durationDays: 30 }, NOW)

    expect(result.status).toBe("ACTIVE")
    expect(result.startDate).toEqual(existing.startDate)
    expect(result.endDate).toEqual(new Date(existing.endDate.getTime() + 30 * MS_PER_DAY))
    expect(result.paymentConfirmed).toBe(true)
    expect(result.endDate.getTime()).toBeGreaterThan(existing.endDate.getTime())
  })

  it("renews an EXPIRED membership from now and resets the payment confirmation", () => {
    const existing = {
      status: "EXPIRED",
      startDate: date("2026-09-01T12:00:00.000Z"),
      endDate: date("2026-10-16T12:00:00.000Z"),
      paymentConfirmed: true,
    }

    const result = calculateRenewal(existing, { durationDays: 30 }, NOW)

    expect(result.status).toBe("ACTIVE")
    expect(result.startDate).toEqual(NOW)
    expect(result.endDate).toEqual(new Date(NOW.getTime() + 30 * MS_PER_DAY))
    expect(result.paymentConfirmed).toBe(false)
    expect(result.endDate.getTime()).toBeGreaterThan(existing.endDate.getTime())
  })

  it("renews an INACTIVE membership from max(now, existing.endDate)", () => {
    const existing = {
      status: "INACTIVE",
      startDate: date("2026-09-20T12:00:00.000Z"),
      endDate: date("2026-10-20T12:00:00.000Z"),
      paymentConfirmed: true,
    }

    const result = calculateRenewal(existing, { durationDays: 30 }, NOW)

    expect(result.status).toBe("ACTIVE")
    expect(result.startDate).toEqual(NOW)
    // The existing endDate is in the future, so it is used as the anchor.
    expect(result.endDate).toEqual(new Date(existing.endDate.getTime() + 30 * MS_PER_DAY))
    expect(result.paymentConfirmed).toBe(false)
    expect(result.endDate.getTime()).toBeGreaterThan(existing.endDate.getTime())
  })

  it("renews an ACTIVE membership whose endDate already passed", () => {
    const existing = {
      status: "ACTIVE",
      startDate: date("2026-09-01T12:00:00.000Z"),
      endDate: date("2026-10-10T12:00:00.000Z"),
      paymentConfirmed: false,
    }

    const result = calculateRenewal(existing, { durationDays: 15 }, NOW)

    expect(result.status).toBe("ACTIVE")
    expect(result.startDate).toEqual(NOW)
    expect(result.endDate).toEqual(new Date(NOW.getTime() + 15 * MS_PER_DAY))
    expect(result.paymentConfirmed).toBe(false)
  })

  it.each(["SUSPENDED", "CANCELLED"])("reactivates a %s membership", (status) => {
    const existing = {
      status,
      startDate: date("2026-09-01T12:00:00.000Z"),
      endDate: date("2026-10-01T12:00:00.000Z"),
      paymentConfirmed: false,
    }

    const result = calculateRenewal(existing, { durationDays: 30 }, NOW)

    expect(result.status).toBe("ACTIVE")
    expect(result.startDate).toEqual(NOW)
    expect(result.endDate).toEqual(new Date(NOW.getTime() + 30 * MS_PER_DAY))
  })

  it("never shortens an endDate that is still in the future", () => {
    const existing = {
      status: "INACTIVE",
      startDate: date("2026-09-20T12:00:00.000Z"),
      endDate: date("2026-12-31T12:00:00.000Z"),
      paymentConfirmed: true,
    }

    const result = calculateRenewal(existing, { durationDays: 1 }, NOW)

    expect(result.endDate.getTime()).toBeGreaterThan(existing.endDate.getTime())
  })

  it.each([0, -1, 0.5, Number.NaN])("rejects an invalid durationDays (%s)", (durationDays) => {
    expect(() =>
      calculateRenewal(
        {
          status: "ACTIVE",
          startDate: NOW,
          endDate: new Date(NOW.getTime() + MS_PER_DAY),
          paymentConfirmed: true,
        },
        { durationDays },
        NOW
      )
    ).toThrow(RangeError)
  })
})
