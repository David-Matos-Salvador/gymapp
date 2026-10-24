import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const ddlPath = resolve(
  process.cwd(),
  "prisma/migrations/20261024000001_expand_legacy/migration.sql"
)
const ddl = readFileSync(ddlPath, "utf8")

describe("expand legacy migration", () => {
  it("is additive: no table/column drops, deletes or truncates", () => {
    expect(ddl).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i)
    expect(ddl).not.toMatch(/\bTRUNCATE\b/i)
    expect(ddl).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(ddl).toMatch(/\bSET search_path TO public;/)
  })

  it("guards every added column with IF NOT EXISTS", () => {
    const addColumn = ddl.match(/\bADD COLUMN\b/gi) ?? []
    const guarded = ddl.match(/\bADD COLUMN IF NOT EXISTS\b/gi) ?? []

    expect(addColumn.length).toBeGreaterThan(0)
    expect(guarded.length).toBe(addColumn.length)
  })

  it("creates the new tables idempotently", () => {
    const tables = [
      "MembershipPlanPriceHistory",
      "GymExercise",
      "GymEquipmentActivation",
      "RoutinePlan",
      "RoutineSplit",
      "RoutineSplitExercise",
      "AssignedRoutinePlan",
      "TrainerRequest",
      "TrainerInvite",
    ]

    for (const table of tables) {
      expect(ddl).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`)
    }
  })

  it("adds the expand columns without deleting legacy ones", () => {
    const columns: Array<[string, string]> = [
      ["Gym", "isDefault"],
      ["Gym", "showMachineNumbers"],
      ["Gym", "ownerId"],
      ["User", "stripeCustomerId"],
      ["User", "height"],
      ["User", "weight"],
      ["Membership", "planPrice"],
      ["Membership", "planCurrency"],
      ["Membership", "planDurationDays"],
      ["GymEquipment", "machineNumber"],
      ["GymEquipment", "isSystem"],
      ["Exercise", "userId"],
      ["Exercise", "active"],
      ["WorkoutLog", "splitId"],
      ["Class", "startTime"],
      ["Class", "active"],
      ["Payment", "membershipId"],
      ["Payment", "receiptUrl"],
      ["Payment", "confirmedById"],
      ["Payment", "confirmedAt"],
      ["Notification", "metadata"],
    ]

    for (const [table, column] of columns) {
      const block = new RegExp(
        `ALTER TABLE "${table}"[\\s\\S]*?ADD COLUMN IF NOT EXISTS "${column}"`
      )
      expect(ddl).toMatch(block)
    }

    expect(ddl).not.toMatch(/DROP COLUMN "schedule"/)
    expect(ddl).not.toMatch(/DROP COLUMN "routineId"/)
    expect(ddl).not.toMatch(/DROP TABLE "Routine"/)
    expect(ddl).not.toMatch(/DROP TABLE "RoutineExercise"/)
  })

  it("adds the new enum values and types", () => {
    expect(ddl).toContain("ALTER TYPE \"PaymentMethod\" ADD VALUE IF NOT EXISTS 'YAPE'")
    expect(ddl).toContain(
      "ALTER TYPE \"NotificationType\" ADD VALUE IF NOT EXISTS 'TRAINER_REQUEST'"
    )
    expect(ddl).toContain('CREATE TYPE "TrainerRequestStatus"')
    expect(ddl).toContain('CREATE TYPE "InviteStatus"')
  })

  it("does not create unique indexes that legacy duplicates can break", () => {
    expect(ddl).not.toMatch(
      /CREATE\s+UNIQUE\s+INDEX[\s\S]*?ON\s+"(?:Exercise|MembershipPlan|Membership|CheckIn|BodyMeasurement|Booking)"/i
    )
  })
})
