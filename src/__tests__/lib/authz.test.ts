import { describe, it, expect } from "vitest"
import { canAccessGym, canEditGymField, isAdminOrAbove, isSuperAdmin } from "@/lib/authz"

describe("authz", () => {
  it("reconoce superadmin y admin", () => {
    expect(isSuperAdmin("SUPER_ADMIN")).toBe(true)
    expect(isSuperAdmin("ADMIN")).toBe(false)
    expect(isAdminOrAbove("ADMIN")).toBe(true)
    expect(isAdminOrAbove("TRAINER")).toBe(false)
  })

  it("permite al superadmin cualquier gym y al admin solo el suyo", () => {
    expect(canAccessGym({ role: "SUPER_ADMIN", gymId: null }, "gym-b")).toBe(true)
    expect(canAccessGym({ role: "ADMIN", gymId: "gym-a" }, "gym-a")).toBe(true)
    expect(canAccessGym({ role: "ADMIN", gymId: "gym-a" }, "gym-b")).toBe(false)
    expect(canAccessGym({ role: "ADMIN", gymId: null }, "gym-a")).toBe(false)
  })

  it("limita los campos que un admin puede editar de su gym", () => {
    expect(canEditGymField("SUPER_ADMIN", "active")).toBe(true)
    expect(canEditGymField("ADMIN", "address")).toBe(true)
    expect(canEditGymField("ADMIN", "showMachineNumbers")).toBe(true)
    expect(canEditGymField("ADMIN", "name")).toBe(false)
    expect(canEditGymField("ADMIN", "active")).toBe(false)
    expect(canEditGymField("TRAINER", "address")).toBe(false)
  })
})
