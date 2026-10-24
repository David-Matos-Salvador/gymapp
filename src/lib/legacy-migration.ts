const MS_PER_DAY = 86_400_000
const PAYMENT_MATCH_LEAD_DAYS = 31
const PAYMENT_MATCH_LAG_DAYS = 14

export const LEGACY_ID_PREFIXES = {
  plan: "legacy-routine-plan-",
  split: "legacy-routine-split-",
  splitExercise: "legacy-routine-exercise-",
  assignment: "legacy-routine-assignment-",
} as const

export function legacyRoutinePlanId(routineId: string): string {
  return `${LEGACY_ID_PREFIXES.plan}${routineId}`
}

export function legacyRoutineSplitId(routineId: string): string {
  return `${LEGACY_ID_PREFIXES.split}${routineId}`
}

export function legacyRoutineExerciseId(routineExerciseId: string): string {
  return `${LEGACY_ID_PREFIXES.splitExercise}${routineExerciseId}`
}

export function legacyRoutineAssignmentId(routineId: string, userId: string): string {
  return `${LEGACY_ID_PREFIXES.assignment}${routineId}-${userId}`
}

export function normalizeLegacyReps(value: number | string | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value).trim()
  if (!raw) return "10"

  if (!/^\d+(\s*-\s*\d+)?$/.test(raw)) {
    throw new RangeError(`Repeticiones legacy inválidas: ${raw}`)
  }

  return raw
}

export function uniqueMuscleGroups(groups: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const group of groups) {
    const value = group?.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }

  return result
}

export type LegacyRoutine = {
  id: string
  name: string
  description: string | null
  userId: string
  assignedToId: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export type LegacyRoutineExercise = {
  id: string
  routineId: string
  exerciseId: string
  sets: number
  reps: number | string | null
  weight: number
  restSeconds: number
  order: number
  notes: string | null
}

export type PlannedRoutinePlan = {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export type PlannedRoutineSplit = {
  id: string
  planId: string
  label: string
  name: string
  description: string | null
  muscleGroups: string[]
  order: number
  createdAt: Date | string
  updatedAt: Date | string
}

export type PlannedRoutineSplitExercise = {
  id: string
  splitId: string
  exerciseId: string
  sets: number
  reps: string
  weight: number
  restSeconds: number
  order: number
  notes: string | null
}

export type PlannedRoutineAssignment = {
  id: string
  userId: string
  planId: string
}

export type PlannedRoutine = {
  plan: PlannedRoutinePlan
  split: PlannedRoutineSplit
  exercises: PlannedRoutineSplitExercise[]
  assignment: PlannedRoutineAssignment | null
}

export function planLegacyRoutine(
  routine: LegacyRoutine,
  routineExercises: readonly LegacyRoutineExercise[],
  muscleGroupByExerciseId: ReadonlyMap<string, string>
): PlannedRoutine {
  const planId = legacyRoutinePlanId(routine.id)
  const splitId = legacyRoutineSplitId(routine.id)
  const name = routine.name.trim() || `Rutina ${routine.id}`

  const ordered = [...routineExercises]
    .filter((exercise) => exercise.routineId === routine.id)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

  const exercises = ordered.map((exercise, index) => ({
    id: legacyRoutineExerciseId(exercise.id),
    splitId,
    exerciseId: exercise.exerciseId,
    sets: exercise.sets,
    reps: normalizeLegacyReps(exercise.reps),
    weight: exercise.weight,
    restSeconds: exercise.restSeconds,
    order: Number.isFinite(exercise.order) ? exercise.order : index,
    notes: exercise.notes,
  }))

  const muscleGroups = uniqueMuscleGroups(
    exercises.map((exercise) => muscleGroupByExerciseId.get(exercise.exerciseId))
  )

  const assignedToId = routine.assignedToId
  const assignment =
    assignedToId && assignedToId !== routine.userId
      ? {
          id: legacyRoutineAssignmentId(routine.id, assignedToId),
          userId: assignedToId,
          planId,
        }
      : null

  return {
    plan: {
      id: planId,
      userId: routine.userId,
      name,
      description: routine.description,
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt,
    },
    split: {
      id: splitId,
      planId,
      label: "A",
      name,
      description: routine.description,
      muscleGroups,
      order: 0,
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt,
    },
    exercises,
    assignment,
  }
}

export type GymDefaultInput = {
  id: string
  isDefault: boolean
  active: boolean
}

export type GymDefaultPlan =
  | { action: "already"; gymId: string; candidates: string[] }
  | { action: "set"; gymId: string; candidates: string[] }
  | { action: "none"; gymId: null; candidates: string[] }
  | { action: "ambiguous"; gymId: null; candidates: string[] }

export function planDefaultGym(gyms: readonly GymDefaultInput[]): GymDefaultPlan {
  const defaults = gyms.filter((gym) => gym.isDefault)
  if (defaults.length === 1) {
    return { action: "already", gymId: defaults[0].id, candidates: [defaults[0].id] }
  }
  if (defaults.length > 1) {
    return { action: "ambiguous", gymId: null, candidates: defaults.map((gym) => gym.id) }
  }
  if (gyms.length === 0) {
    return { action: "none", gymId: null, candidates: [] }
  }

  const active = gyms.filter((gym) => gym.active)
  if (active.length === 1) {
    return { action: "set", gymId: active[0].id, candidates: [active[0].id] }
  }
  if (gyms.length === 1) {
    return { action: "set", gymId: gyms[0].id, candidates: [gyms[0].id] }
  }

  return {
    action: "ambiguous",
    gymId: null,
    candidates: (active.length > 0 ? active : gyms).map((gym) => gym.id),
  }
}

export type ClassGymResolution =
  | { gymId: string; source: "class" | "trainer" | "default" | "only-gym" }
  | { gymId: null; source: "ambiguous" | "none" }

export function resolveClassGymId(input: {
  classGymId: string | null
  trainerGymId: string | null
  defaultGymId: string | null
  gymIds: readonly string[]
}): ClassGymResolution {
  const available = new Set(input.gymIds)

  if (input.classGymId && available.has(input.classGymId)) {
    return { gymId: input.classGymId, source: "class" }
  }
  if (input.trainerGymId && available.has(input.trainerGymId)) {
    return { gymId: input.trainerGymId, source: "trainer" }
  }
  if (input.defaultGymId && available.has(input.defaultGymId)) {
    return { gymId: input.defaultGymId, source: "default" }
  }
  if (input.gymIds.length === 1) {
    return { gymId: input.gymIds[0], source: "only-gym" }
  }
  if (input.gymIds.length === 0) {
    return { gymId: null, source: "none" }
  }

  return { gymId: null, source: "ambiguous" }
}

export function formatLegacyStartTime(schedule: string | null | undefined): string | null {
  if (!schedule) return null

  const match = schedule.match(/(?:^|[T\s])(\d{2}):(\d{2})/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  return `${match[1]}:${match[2]}`
}

export type MembershipSnapshotInput = {
  planPrice: number | string | null
  planCurrency: string | null
  planDurationDays: number | null
}

export function needsMembershipSnapshot(row: MembershipSnapshotInput): boolean {
  if (row.planPrice === null) return true
  const price = Number(row.planPrice)
  if (!Number.isFinite(price)) return true
  if (price !== 0) return false

  return (
    !row.planDurationDays ||
    row.planDurationDays === 0 ||
    !row.planCurrency ||
    row.planCurrency.trim() === ""
  )
}

export type LegacyPayment = {
  id: string
  userId: string
  amount: number
  currency: string
  createdAt: Date | string
}

export type MembershipPaymentCandidate = {
  id: string
  userId: string
  startDate: Date | string
  endDate: Date | string
  amount: number | null
  currency: string | null
}

export type PaymentMatch =
  | { status: "linked"; membershipId: string }
  | { status: "ambiguous"; membershipIds: string[] }
  | { status: "none" }

function toTimestamp(value: Date | string): number {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

export function matchLegacyPayment(
  payment: LegacyPayment,
  candidates: readonly MembershipPaymentCandidate[]
): PaymentMatch {
  const paymentTime = toTimestamp(payment.createdAt)
  if (!Number.isFinite(paymentTime)) return { status: "none" }

  const paymentCurrency = payment.currency.trim().toUpperCase()
  const matches = candidates.filter((candidate) => {
    if (candidate.userId !== payment.userId) return false
    if (candidate.amount === null || !Number.isFinite(candidate.amount)) return false
    if (Math.abs(candidate.amount - payment.amount) > 0.011) return false
    if ((candidate.currency ?? "").trim().toUpperCase() !== paymentCurrency) return false

    const start = toTimestamp(candidate.startDate)
    const end = toTimestamp(candidate.endDate)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false

    const lowerBound = start - PAYMENT_MATCH_LEAD_DAYS * MS_PER_DAY
    const upperBound = end + PAYMENT_MATCH_LAG_DAYS * MS_PER_DAY
    return paymentTime >= lowerBound && paymentTime <= upperBound
  })

  if (matches.length === 1) {
    return { status: "linked", membershipId: matches[0].id }
  }
  if (matches.length > 1) {
    return { status: "ambiguous", membershipIds: matches.map((candidate) => candidate.id) }
  }

  return { status: "none" }
}
