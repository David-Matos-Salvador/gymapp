import { describe, it, expect } from "vitest"
import { cn, formatCurrency, formatDays } from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible")
  })

  it("handles undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b")
  })

  it("resolves tailwind conflicts via twMerge", () => {
    expect(cn("px-4", "px-2")).toBe("px-2")
  })

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("")
  })
})

describe("formatDays", () => {
  it("uses singular for one day", () => {
    expect(formatDays(1)).toBe("1 día")
  })

  it("uses plural for other amounts", () => {
    expect(formatDays(7)).toBe("7 días")
    expect(formatDays(0)).toBe("0 días")
  })
})

describe("formatCurrency", () => {
  it("formats soles with the S/ symbol, also when the code comes in lowercase", () => {
    expect(formatCurrency(500, "PEN")).toMatch(/^S\/\s?500\.00$/)
    expect(formatCurrency(500, "pen")).toMatch(/^S\/\s?500\.00$/)
  })
})
