import { describe, it, expect } from "vitest"
import { imageUrlSchema, isValidImageUrl } from "@/lib/validation"

describe("imageUrlSchema", () => {
  it("acepta imágenes subidas al storage local", () => {
    expect(isValidImageUrl("/uploads/equipment/123-abc.png")).toBe(true)
    expect(imageUrlSchema.safeParse("/uploads/equipment/123-abc.webp").success).toBe(true)
  })

  it("acepta URLs http y https", () => {
    expect(imageUrlSchema.safeParse("https://example.com/machine.jpg").success).toBe(true)
    expect(imageUrlSchema.safeParse("http://example.com/machine.png").success).toBe(true)
  })

  it("rechaza esquemas peligrosos y rutas inválidas", () => {
    expect(imageUrlSchema.safeParse("javascript:alert(1)").success).toBe(false)
    expect(imageUrlSchema.safeParse("ftp://example.com/machine.jpg").success).toBe(false)
    expect(imageUrlSchema.safeParse("not-a-url").success).toBe(false)
    expect(imageUrlSchema.safeParse("/etc/passwd").success).toBe(false)
  })
})
