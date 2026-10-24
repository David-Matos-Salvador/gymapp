import { describe, expect, it } from "vitest"
import {
  formatLegacyStartTime,
  legacyRoutineAssignmentId,
  legacyRoutineExerciseId,
  legacyRoutinePlanId,
  legacyRoutineSplitId,
  matchLegacyPayment,
  needsMembershipSnapshot,
  normalizeLegacyReps,
  planDefaultGym,
  planLegacyRoutine,
  resolveClassGymId,
  uniqueMuscleGroups,
  type LegacyRoutine,
  type LegacyRoutineExercise,
} from "@/lib/legacy-migration"

function routine(overrides: Partial<LegacyRoutine> = {}): LegacyRoutine {
  return {
    id: "routine-1",
    name: "Fuerza A",
    description: "Rutina de fuerza",
    userId: "trainer-1",
    assignedToId: "member-1",
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
    ...overrides,
  }
}

function routineExercise(overrides: Partial<LegacyRoutineExercise> = {}): LegacyRoutineExercise {
  return {
    id: "re-1",
    routineId: "routine-1",
    exerciseId: "ex-1",
    sets: 4,
    reps: 8,
    weight: 40,
    restSeconds: 90,
    order: 1,
    notes: null,
    ...overrides,
  }
}

describe("legacy routine mapping", () => {
  it("uses deterministic, prefixed identifiers", () => {
    expect(legacyRoutinePlanId("abc")).toBe("legacy-routine-plan-abc")
    expect(legacyRoutineSplitId("abc")).toBe("legacy-routine-split-abc")
    expect(legacyRoutineExerciseId("def")).toBe("legacy-routine-exercise-def")
    expect(legacyRoutineAssignmentId("abc", "user-1")).toBe("legacy-routine-assignment-abc-user-1")
  })

  it("maps one legacy routine to one plan with one split", () => {
    const planned = planLegacyRoutine(
      routine(),
      [
        routineExercise({ id: "re-2", exerciseId: "ex-2", order: 2, reps: 12 }),
        routineExercise({ id: "re-1", exerciseId: "ex-1", order: 1, reps: 8 }),
      ],
      new Map([
        ["ex-1", "CHEST"],
        ["ex-2", "CHEST"],
      ])
    )

    expect(planned.plan.id).toBe("legacy-routine-plan-routine-1")
    expect(planned.plan.userId).toBe("trainer-1")
    expect(planned.plan.name).toBe("Fuerza A")
    expect(planned.split).toMatchObject({
      id: "legacy-routine-split-routine-1",
      planId: "legacy-routine-plan-routine-1",
      label: "A",
      name: "Fuerza A",
      muscleGroups: ["CHEST"],
      order: 0,
    })
    expect(planned.exercises.map((exercise) => exercise.id)).toEqual([
      "legacy-routine-exercise-re-1",
      "legacy-routine-exercise-re-2",
    ])
    expect(planned.exercises.map((exercise) => exercise.reps)).toEqual(["8", "12"])
    expect(planned.assignment).toEqual({
      id: "legacy-routine-assignment-routine-1-member-1",
      userId: "member-1",
      planId: "legacy-routine-plan-routine-1",
    })
  })

  it("does not create an assignment when the routine belongs to the same user", () => {
    const planned = planLegacyRoutine(routine({ assignedToId: "trainer-1" }), [], new Map())
    expect(planned.assignment).toBeNull()
  })

  it("falls back to a stable name for empty legacy names", () => {
    const planned = planLegacyRoutine(routine({ name: "   " }), [], new Map())
    expect(planned.plan.name).toBe("Rutina routine-1")
    expect(planned.split.name).toBe("Rutina routine-1")
  })

  it("deduplicates muscle groups preserving the first occurrence", () => {
    expect(uniqueMuscleGroups(["CHEST", "BACK", "CHEST", null, " ", "LEGS"])).toEqual([
      "CHEST",
      "BACK",
      "LEGS",
    ])
  })

  it("normalizes integer reps to strings and preserves ranges", () => {
    expect(normalizeLegacyReps(10)).toBe("10")
    expect(normalizeLegacyReps("8-12")).toBe("8-12")
    expect(normalizeLegacyReps(null)).toBe("10")
    expect(() => normalizeLegacyReps("muchas")).toThrow(RangeError)
  })
})

describe("gym default planning", () => {
  it("keeps an existing default", () => {
    expect(
      planDefaultGym([
        { id: "gym-1", isDefault: false, active: true },
        { id: "gym-2", isDefault: true, active: true },
      ])
    ).toMatchObject({ action: "already", gymId: "gym-2" })
  })

  it("selects the only active gym", () => {
    expect(
      planDefaultGym([
        { id: "gym-1", isDefault: false, active: false },
        { id: "gym-2", isDefault: false, active: true },
      ])
    ).toMatchObject({ action: "set", gymId: "gym-2" })
  })

  it("selects the only gym even when inactive", () => {
    expect(planDefaultGym([{ id: "gym-1", isDefault: false, active: false }])).toMatchObject({
      action: "set",
      gymId: "gym-1",
    })
  })

  it("reports ambiguity with several active gyms", () => {
    expect(
      planDefaultGym([
        { id: "gym-1", isDefault: false, active: true },
        { id: "gym-2", isDefault: false, active: true },
      ])
    ).toMatchObject({ action: "ambiguous", gymId: null })
  })

  it("reports nothing when there are no gyms", () => {
    expect(planDefaultGym([])).toMatchObject({ action: "none", gymId: null })
  })
})

describe("class gym and start time mapping", () => {
  const gymIds = ["gym-1", "gym-2"]

  it("prefers the class gym", () => {
    expect(
      resolveClassGymId({
        classGymId: "gym-1",
        trainerGymId: "gym-2",
        defaultGymId: "gym-2",
        gymIds,
      })
    ).toEqual({ gymId: "gym-1", source: "class" })
  })

  it("falls back to the trainer gym", () => {
    expect(
      resolveClassGymId({
        classGymId: null,
        trainerGymId: "gym-2",
        defaultGymId: "gym-1",
        gymIds,
      })
    ).toEqual({ gymId: "gym-2", source: "trainer" })
  })

  it("falls back to the default gym, then the only gym", () => {
    expect(
      resolveClassGymId({
        classGymId: null,
        trainerGymId: null,
        defaultGymId: "gym-1",
        gymIds,
      })
    ).toEqual({ gymId: "gym-1", source: "default" })

    expect(
      resolveClassGymId({
        classGymId: null,
        trainerGymId: null,
        defaultGymId: null,
        gymIds: ["gym-1"],
      })
    ).toEqual({ gymId: "gym-1", source: "only-gym" })
  })

  it("reports ambiguity without enough information", () => {
    expect(
      resolveClassGymId({
        classGymId: null,
        trainerGymId: null,
        defaultGymId: null,
        gymIds,
      })
    ).toEqual({ gymId: null, source: "ambiguous" })
  })

  it("formats legacy timestamps without timezone shifts", () => {
    expect(formatLegacyStartTime("2026-05-10 18:30:00")).toBe("18:30")
    expect(formatLegacyStartTime("2026-05-10T18:30:00.000Z")).toBe("18:30")
    expect(formatLegacyStartTime("18:30")).toBe("18:30")
    expect(formatLegacyStartTime("2026-05-10 25:00:00")).toBeNull()
    expect(formatLegacyStartTime(null)).toBeNull()
  })
})

describe("membership snapshots", () => {
  it("fills null snapshots", () => {
    expect(
      needsMembershipSnapshot({ planPrice: null, planCurrency: "PEN", planDurationDays: 30 })
    ).toBe(true)
  })

  it("fills intermediate zero placeholders", () => {
    expect(
      needsMembershipSnapshot({ planPrice: 0, planCurrency: "PEN", planDurationDays: 0 })
    ).toBe(true)
    expect(
      needsMembershipSnapshot({ planPrice: "0", planCurrency: null, planDurationDays: 30 })
    ).toBe(true)
  })

  it("leaves real snapshots untouched", () => {
    expect(
      needsMembershipSnapshot({ planPrice: 0, planCurrency: "PEN", planDurationDays: 30 })
    ).toBe(false)
    expect(
      needsMembershipSnapshot({ planPrice: 99.9, planCurrency: "PEN", planDurationDays: 30 })
    ).toBe(false)
  })
})

describe("legacy payment matching", () => {
  const payment = {
    id: "pay-1",
    userId: "user-1",
    amount: 99.9,
    currency: "PEN",
    createdAt: "2026-05-10T12:00:00.000Z",
  }

  it("links a unique candidate", () => {
    expect(
      matchLegacyPayment(payment, [
        {
          id: "membership-1",
          userId: "user-1",
          startDate: "2026-05-01T12:00:00.000Z",
          endDate: "2026-05-31T12:00:00.000Z",
          amount: 99.9,
          currency: "PEN",
        },
      ])
    ).toEqual({ status: "linked", membershipId: "membership-1" })
  })

  it("compares currency case-insensitively", () => {
    expect(
      matchLegacyPayment(payment, [
        {
          id: "membership-1",
          userId: "user-1",
          startDate: "2026-05-01T12:00:00.000Z",
          endDate: "2026-05-31T12:00:00.000Z",
          amount: 99.9,
          currency: "pen",
        },
      ])
    ).toEqual({ status: "linked", membershipId: "membership-1" })
  })

  it("reports ambiguous candidates", () => {
    expect(
      matchLegacyPayment(payment, [
        {
          id: "membership-1",
          userId: "user-1",
          startDate: "2026-05-01T12:00:00.000Z",
          endDate: "2026-05-31T12:00:00.000Z",
          amount: 99.9,
          currency: "PEN",
        },
        {
          id: "membership-2",
          userId: "user-1",
          startDate: "2026-05-01T12:00:00.000Z",
          endDate: "2026-05-31T12:00:00.000Z",
          amount: 99.9,
          currency: "PEN",
        },
      ])
    ).toEqual({ status: "ambiguous", membershipIds: ["membership-1", "membership-2"] })
  })

  it("ignores other users, other amounts and dates outside the window", () => {
    const base = {
      id: "membership-1",
      userId: "user-1",
      startDate: "2026-05-01T12:00:00.000Z",
      endDate: "2026-05-31T12:00:00.000Z",
      amount: 99.9,
      currency: "PEN",
    }

    expect(matchLegacyPayment(payment, [{ ...base, userId: "user-2" }])).toEqual({
      status: "none",
    })
    expect(matchLegacyPayment(payment, [{ ...base, amount: 50 }])).toEqual({ status: "none" })
    expect(matchLegacyPayment(payment, [{ ...base, currency: "USD" }])).toEqual({
      status: "none",
    })
    expect(
      matchLegacyPayment(payment, [
        {
          ...base,
          startDate: "2025-01-01T12:00:00.000Z",
          endDate: "2025-01-31T12:00:00.000Z",
        },
      ])
    ).toEqual({ status: "none" })
  })
})
