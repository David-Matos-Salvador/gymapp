import { describe, expect, it } from "vitest"
import {
  isFreePlan,
  planCurrencySchema,
  planDurationSchema,
  planPriceSchema,
} from "@/lib/membership-pricing"

describe("membership pricing validation", () => {
  it("accepts zero as a free plan", () => {
    expect(planPriceSchema.safeParse(0).success).toBe(true)
    expect(isFreePlan(0)).toBe(true)
  })

  it("accepts two decimal places", () => {
    expect(planPriceSchema.safeParse(19.99).success).toBe(true)
  })

  it("rejects negatives, more than two decimals and out-of-range prices", () => {
    expect(planPriceSchema.safeParse(-0.01).success).toBe(false)
    expect(planPriceSchema.safeParse(19.999).success).toBe(false)
    expect(planPriceSchema.safeParse(1_000_001).success).toBe(false)
  })

  it("validates duration bounds", () => {
    expect(planDurationSchema.safeParse(1).success).toBe(true)
    expect(planDurationSchema.safeParse(3650).success).toBe(true)
    expect(planDurationSchema.safeParse(0).success).toBe(false)
    expect(planDurationSchema.safeParse(3651).success).toBe(false)
    expect(planDurationSchema.safeParse(30.5).success).toBe(false)
  })

  it("only accepts PEN", () => {
    expect(planCurrencySchema.safeParse("PEN").success).toBe(true)
    expect(planCurrencySchema.safeParse("USD").success).toBe(false)
    expect(planCurrencySchema.safeParse("EUR").success).toBe(false)
  })
})
