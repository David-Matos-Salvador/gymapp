#!/usr/bin/env tsx
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  formatLegacyStartTime,
  matchLegacyPayment,
  planDefaultGym,
  planLegacyRoutine,
  resolveClassGymId,
  type GymDefaultPlan,
  type LegacyPayment,
  type LegacyRoutine,
  type LegacyRoutineExercise,
  type MembershipPaymentCandidate,
} from "../src/lib/legacy-migration"

type Db = PrismaClient | Prisma.TransactionClient
type Mode = "dry-run" | "apply"

type Issue = {
  code: string
  message: string
  details?: Record<string, unknown>
}

type ActionCounters = Record<string, number | string | null | string[]>

type Report = {
  tool: "migrate-legacy-contabo"
  mode: Mode
  applied: boolean
  database: {
    schema: string
    tables: number
    legacyTables: string[]
    currentTables: string[]
  }
  legacyDetected: Record<string, boolean>
  actions: Record<string, ActionCounters>
  duplicateChecks: Record<string, { duplicateGroups: number; duplicateRows: number }>
  blockers: Issue[]
  warnings: Issue[]
  errors: Issue[]
}

type TableRow = { table_name: string }
type ColumnRow = { table_name: string; column_name: string; is_nullable: string }

type Inventory = {
  schema: string
  tables: Set<string>
  columns: Map<string, Map<string, { isNullable: boolean }>>
}

type LegacyRoutineRow = LegacyRoutine
type LegacyRoutineExerciseRow = LegacyRoutineExercise
type ExistingPlanRow = { id: string; userId: string; name: string }
type ExistingSplitRow = { id: string; planId: string; label: string }
type ExistingAssignmentRow = { id: string; userId: string; planId: string }
type WorkoutLogGroupRow = { routineId: string; count: number }
type ClassRow = {
  id: string
  gymId: string | null
  trainerGymId: string | null
  scheduleTime: string | null
  startTime: string | null
}
type GymRow = { id: string; isDefault: boolean; active: boolean }
type PaymentRow = LegacyPayment & { status: string }
type MembershipCandidateRow = MembershipPaymentCandidate

const APPLY_TRANSACTION_TIMEOUT_MS = 15 * 60_000

function readDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), "utf8")
      const line = content
        .split(/\r?\n/)
        .map((item) => item.trim())
        .find((item) => item.startsWith("DATABASE_URL="))
      if (line) {
        return line
          .slice("DATABASE_URL=".length)
          .trim()
          .replace(/^["']|["']$/g, "")
      }
    } catch {
      // Try the next file.
    }
  }

  throw new Error("DATABASE_URL no está definida")
}

function parseArgs(argv: string[]): { mode: Mode; help: boolean } {
  let apply = false
  let dryRun = false
  let help = false

  for (const arg of argv) {
    if (arg === "--apply") apply = true
    else if (arg === "--dry-run") dryRun = true
    else if (arg === "--help" || arg === "-h") help = true
    else throw new Error(`Argumento desconocido: ${arg}`)
  }

  if (apply && dryRun) throw new Error("Usá --apply o --dry-run, no ambos")
  return { mode: apply ? "apply" : "dry-run", help }
}

function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Identificador SQL inválido: ${name}`)
  }
  return `"${name}"`
}

function hasTable(inventory: Inventory, table: string): boolean {
  return inventory.tables.has(table)
}

function hasColumn(inventory: Inventory, table: string, column: string): boolean {
  return inventory.columns.get(table)?.has(column) ?? false
}

function columnIsNullable(inventory: Inventory, table: string, column: string): boolean | null {
  return inventory.columns.get(table)?.get(column)?.isNullable ?? null
}

async function count(db: Db, sql: string, ...params: unknown[]): Promise<number> {
  const rows = await db.$queryRawUnsafe<Array<{ count: number | bigint | string }>>(sql, ...params)
  return Number(rows[0]?.count ?? 0)
}

function addBlocker(
  report: Report,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  report.blockers.push({ code, message, details })
}

function addWarning(
  report: Report,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  report.warnings.push({ code, message, details })
}

async function loadInventory(db: Db): Promise<Inventory> {
  const tableRows = await db.$queryRaw<TableRow[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `
  const columnRows = await db.$queryRaw<ColumnRow[]>`
    SELECT table_name, column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = current_schema()
    ORDER BY table_name, ordinal_position
  `

  const tables = new Set(tableRows.map((row) => row.table_name))
  const columns = new Map<string, Map<string, { isNullable: boolean }>>()

  for (const row of columnRows) {
    const tableColumns = columns.get(row.table_name) ?? new Map<string, { isNullable: boolean }>()
    tableColumns.set(row.column_name, { isNullable: row.is_nullable === "YES" })
    columns.set(row.table_name, tableColumns)
  }

  const schemaRows = await db.$queryRaw<
    Array<{ schema: string }>
  >`SELECT current_schema() AS schema`

  return {
    schema: schemaRows[0]?.schema ?? "public",
    tables,
    columns,
  }
}

async function runDuplicateChecks(db: Db, inventory: Inventory, report: Report) {
  const checks: Array<{
    name: string
    table: string
    columns: string[]
    where?: string
  }> = [
    { name: "Exercise.name", table: "Exercise", columns: ["name"] },
    { name: "MembershipPlan.gymId_name", table: "MembershipPlan", columns: ["gymId", "name"] },
    { name: "Membership.userId_planId", table: "Membership", columns: ["userId", "planId"] },
    { name: "CheckIn.userId_date", table: "CheckIn", columns: ["userId", "date"] },
    { name: "BodyMeasurement.userId_date", table: "BodyMeasurement", columns: ["userId", "date"] },
    { name: "Booking.userId_classId", table: "Booking", columns: ["userId", "classId"] },
    {
      name: "Payment.stripeSessionId",
      table: "Payment",
      columns: ["stripeSessionId"],
      where: `"stripeSessionId" IS NOT NULL`,
    },
    {
      name: "RoutinePlan.name_userId",
      table: "RoutinePlan",
      columns: ["name", "userId"],
    },
    { name: "Routine.userId_name", table: "Routine", columns: ["userId", "name"] },
  ]

  for (const check of checks) {
    if (!hasTable(inventory, check.table)) continue
    if (!check.columns.every((column) => hasColumn(inventory, check.table, column))) continue

    const groupBy = check.columns.map(quoteIdent).join(", ")
    const where = check.where ? `WHERE ${check.where}` : ""
    const rows = await db.$queryRawUnsafe<
      Array<{ duplicateGroups: number | bigint | string; duplicateRows: number | bigint | string }>
    >(`
      SELECT
        COUNT(*)::int AS "duplicateGroups",
        COALESCE(SUM(duplicates), 0)::int AS "duplicateRows"
      FROM (
        SELECT COUNT(*) AS duplicates
        FROM ${quoteIdent(check.table)}
        ${where}
        GROUP BY ${groupBy}
        HAVING COUNT(*) > 1
      ) grouped
    `)

    const duplicateGroups = Number(rows[0]?.duplicateGroups ?? 0)
    const duplicateRows = Number(rows[0]?.duplicateRows ?? 0)
    report.duplicateChecks[check.name] = { duplicateGroups, duplicateRows }

    if (duplicateGroups > 0) {
      addBlocker(
        report,
        `duplicate:${check.name}`,
        `Hay ${duplicateGroups} grupos duplicados para ${check.name}; el schema actual no puede aplicarse sin resolverlos.`,
        { duplicateGroups, duplicateRows }
      )
    }
  }
}

async function backfillGymDefault(
  db: Db,
  inventory: Inventory,
  write: boolean,
  report: Report
): Promise<{ gymIds: string[]; defaultGymId: string | null }> {
  const actions: ActionCounters = {
    gyms: 0,
    action: "none",
    gymId: null,
    planned: 0,
    applied: 0,
  }
  report.actions.gymDefault = actions

  if (!hasTable(inventory, "Gym")) {
    addBlocker(report, "missing-table:Gym", "No existe la tabla Gym en el schema actual.")
    return { gymIds: [], defaultGymId: null }
  }

  const isDefaultColumn = hasColumn(inventory, "Gym", "isDefault")
  const activeColumn = hasColumn(inventory, "Gym", "active")
  const gymRows = await db.$queryRawUnsafe<
    Array<{ id: string; isDefault: boolean | null; active: boolean | null }>
  >(`
    SELECT
      "id",
      ${isDefaultColumn ? `"isDefault"` : `NULL::boolean`} AS "isDefault",
      ${activeColumn ? `"active"` : `true`} AS "active"
    FROM "Gym"
    ORDER BY "createdAt" ASC, "id" ASC
  `)

  const gyms: GymRow[] = gymRows.map((row) => ({
    id: row.id,
    isDefault: Boolean(row.isDefault),
    active: row.active !== false,
  }))
  actions.gyms = gyms.length

  if (!isDefaultColumn) {
    if (gyms.length > 0) {
      addBlocker(
        report,
        "missing-column:Gym.isDefault",
        "La tabla Gym existe con datos pero no tiene la columna isDefault. Aplicá el schema actual antes del backfill.",
        { gyms: gyms.length }
      )
    }
    return { gymIds: gyms.map((gym) => gym.id), defaultGymId: null }
  }

  const plan: GymDefaultPlan = planDefaultGym(gyms)
  actions.action = plan.action
  actions.gymId = plan.gymId

  if (plan.action === "ambiguous") {
    addBlocker(
      report,
      "ambiguous:gym-default",
      "Hay varios gimnasios activos y ninguno marcado como default. Definí Gym.isDefault manualmente antes de aplicar.",
      { candidates: plan.candidates }
    )
    return { gymIds: gyms.map((gym) => gym.id), defaultGymId: null }
  }

  if (plan.action === "set") {
    actions.planned = 1
    if (write) {
      const affected = await db.$executeRawUnsafe(
        `UPDATE "Gym" SET "isDefault" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
        plan.gymId
      )
      actions.applied = affected
    }
  }

  return {
    gymIds: gyms.map((gym) => gym.id),
    defaultGymId: plan.gymId,
  }
}

async function backfillGymExercises(db: Db, inventory: Inventory, write: boolean, report: Report) {
  const actions: ActionCounters = {
    gyms: 0,
    exercises: 0,
    planned: 0,
    applied: 0,
  }
  report.actions.gymExercises = actions

  if (!hasTable(inventory, "Gym") || !hasTable(inventory, "Exercise")) return

  actions.gyms = await count(db, `SELECT COUNT(*)::int AS count FROM "Gym"`)
  actions.exercises = await count(db, `SELECT COUNT(*)::int AS count FROM "Exercise"`)

  if (!hasTable(inventory, "GymExercise")) {
    if (Number(actions.gyms) > 0 && Number(actions.exercises) > 0) {
      addBlocker(
        report,
        "missing-table:GymExercise",
        "Hay gyms y ejercicios pero falta la tabla de activación GymExercise.",
        { gyms: actions.gyms, exercises: actions.exercises }
      )
    }
    return
  }

  const gymActiveColumn = hasColumn(inventory, "Gym", "active")
  const gymActiveFilter = gymActiveColumn ? `g."active" = true` : `true`

  actions.planned = await count(
    db,
    `SELECT COUNT(*)::int AS count
     FROM "Gym" g
     CROSS JOIN "Exercise" e
     LEFT JOIN "GymExercise" ge
       ON ge."gymId" = g."id" AND ge."exerciseId" = e."id"
     WHERE ${gymActiveFilter} AND ge."gymId" IS NULL`
  )

  if (write && Number(actions.planned) > 0) {
    actions.applied = await db.$executeRawUnsafe(
      `INSERT INTO "GymExercise" ("gymId", "exerciseId", "active", "createdAt")
       SELECT g."id", e."id", true, CURRENT_TIMESTAMP
       FROM "Gym" g
       CROSS JOIN "Exercise" e
       LEFT JOIN "GymExercise" ge
         ON ge."gymId" = g."id" AND ge."exerciseId" = e."id"
       WHERE ${gymActiveFilter} AND ge."gymId" IS NULL
       ON CONFLICT ("gymId", "exerciseId") DO NOTHING`
    )
  }
}

async function backfillRoutines(
  db: Db,
  inventory: Inventory,
  write: boolean,
  report: Report
): Promise<Map<string, string>> {
  const actions: ActionCounters = {
    legacyRoutines: 0,
    legacyRoutineExercises: 0,
    plansPlanned: 0,
    plansApplied: 0,
    splitsPlanned: 0,
    splitsApplied: 0,
    splitExercisesPlanned: 0,
    splitExercisesApplied: 0,
    assignmentsPlanned: 0,
    assignmentsApplied: 0,
    reusedSplits: 0,
    naturalKeyConflicts: 0,
  }
  report.actions.routines = actions

  const splitIdByRoutineId = new Map<string, string>()
  const hasRoutine = hasTable(inventory, "Routine")
  const hasRoutineExercise = hasTable(inventory, "RoutineExercise")

  if (!hasRoutine && !hasRoutineExercise) return splitIdByRoutineId

  if (!hasRoutine) {
    if (hasRoutineExercise) {
      const orphanCount = await count(db, `SELECT COUNT(*)::int AS count FROM "RoutineExercise"`)
      if (orphanCount > 0) {
        addBlocker(
          report,
          "missing-table:Routine",
          "Existen RoutineExercise sin tabla Routine; no se puede reconstruir el plan.",
          { routineExercises: orphanCount }
        )
      }
    }
    return splitIdByRoutineId
  }

  const requiredRoutineColumns = ["id", "name", "userId", "createdAt", "updatedAt"]
  const missingRoutineColumns = requiredRoutineColumns.filter(
    (column) => !hasColumn(inventory, "Routine", column)
  )
  if (missingRoutineColumns.length > 0) {
    addBlocker(
      report,
      "missing-column:Routine",
      "La tabla legacy Routine no tiene columnas requeridas para el mapeo.",
      { missing: missingRoutineColumns }
    )
    return splitIdByRoutineId
  }

  const routineRows = await db.$queryRawUnsafe<LegacyRoutineRow[]>(`
    SELECT
      "id",
      "name",
      ${hasColumn(inventory, "Routine", "description") ? `"description"` : `NULL::text`} AS "description",
      "userId",
      ${hasColumn(inventory, "Routine", "assignedToId") ? `"assignedToId"` : `NULL::text`} AS "assignedToId",
      "createdAt",
      "updatedAt"
    FROM "Routine"
    ORDER BY "id" ASC
  `)
  actions.legacyRoutines = routineRows.length

  const orphanRoutines = await count(
    db,
    `SELECT COUNT(*)::int AS count
     FROM "Routine" r
     LEFT JOIN "User" u ON u.id = r."userId"
     WHERE u.id IS NULL`
  )
  if (orphanRoutines > 0) {
    addBlocker(report, "orphan:Routine.userId", "Hay rutinas con userId inexistente.", {
      count: orphanRoutines,
    })
  }

  if (hasColumn(inventory, "Routine", "assignedToId")) {
    const orphanAssignments = await count(
      db,
      `SELECT COUNT(*)::int AS count
       FROM "Routine" r
       LEFT JOIN "User" u ON u.id = r."assignedToId"
       WHERE r."assignedToId" IS NOT NULL AND u.id IS NULL`
    )
    if (orphanAssignments > 0) {
      addBlocker(
        report,
        "orphan:Routine.assignedToId",
        "Hay rutinas asignadas a usuarios inexistentes.",
        { count: orphanAssignments }
      )
    }
  }

  let exerciseRows: LegacyRoutineExerciseRow[] = []
  if (hasRoutineExercise) {
    const requiredExerciseColumns = ["id", "routineId", "exerciseId"]
    const missingExerciseColumns = requiredExerciseColumns.filter(
      (column) => !hasColumn(inventory, "RoutineExercise", column)
    )
    if (missingExerciseColumns.length > 0) {
      addBlocker(
        report,
        "missing-column:RoutineExercise",
        "La tabla legacy RoutineExercise no tiene columnas requeridas.",
        { missing: missingExerciseColumns }
      )
    } else {
      exerciseRows = await db.$queryRawUnsafe<LegacyRoutineExerciseRow[]>(`
        SELECT
          "id",
          "routineId",
          "exerciseId",
          ${hasColumn(inventory, "RoutineExercise", "sets") ? `"sets"` : `3`} AS "sets",
          ${hasColumn(inventory, "RoutineExercise", "reps") ? `"reps"` : `10`} AS "reps",
          ${hasColumn(inventory, "RoutineExercise", "weight") ? `"weight"` : `0`} AS "weight",
          ${hasColumn(inventory, "RoutineExercise", "restSeconds") ? `"restSeconds"` : `60`} AS "restSeconds",
          ${hasColumn(inventory, "RoutineExercise", "order") ? `"order"` : `0`} AS "order",
          ${hasColumn(inventory, "RoutineExercise", "notes") ? `"notes"` : `NULL::text`} AS "notes"
        FROM "RoutineExercise"
        ORDER BY "routineId" ASC, "order" ASC, "id" ASC
      `)
      actions.legacyRoutineExercises = exerciseRows.length

      if (hasTable(inventory, "Exercise")) {
        const orphanExercises = await count(
          db,
          `SELECT COUNT(*)::int AS count
           FROM "RoutineExercise" re
           LEFT JOIN "Exercise" e ON e.id = re."exerciseId"
           WHERE e.id IS NULL`
        )
        if (orphanExercises > 0) {
          addBlocker(
            report,
            "orphan:RoutineExercise.exerciseId",
            "Hay RoutineExercise que apuntan a ejercicios inexistentes.",
            { count: orphanExercises }
          )
        }
      } else if (exerciseRows.length > 0) {
        addBlocker(
          report,
          "missing-table:Exercise",
          "Hay RoutineExercise pero no existe la tabla Exercise.",
          { routineExercises: exerciseRows.length }
        )
      }
    }
  } else if (routineRows.length > 0) {
    addBlocker(
      report,
      "missing-table:RoutineExercise",
      "Existen rutinas legacy sin tabla RoutineExercise; se perdería el detalle de ejercicios.",
      { routines: routineRows.length }
    )
  }

  if (routineRows.length === 0) return splitIdByRoutineId

  const requiredCurrentTables = ["RoutinePlan", "RoutineSplit", "RoutineSplitExercise"]
  const missingCurrentTables = requiredCurrentTables.filter((table) => !hasTable(inventory, table))
  if (missingCurrentTables.length > 0) {
    addBlocker(
      report,
      "missing-current-schema:routines",
      "Hay rutinas legacy pero falta el schema actual de rutinas.",
      { missingTables: missingCurrentTables }
    )
    return splitIdByRoutineId
  }

  const exercisesByRoutine = new Map<string, LegacyRoutineExerciseRow[]>()
  for (const exercise of exerciseRows) {
    const list = exercisesByRoutine.get(exercise.routineId) ?? []
    list.push(exercise)
    exercisesByRoutine.set(exercise.routineId, list)
  }

  const exerciseIds = [...new Set(exerciseRows.map((row) => row.exerciseId))]
  const muscleGroupByExerciseId = new Map<string, string>()
  if (exerciseIds.length > 0 && hasTable(inventory, "Exercise")) {
    const muscleRows = await db.$queryRawUnsafe<Array<{ id: string; muscleGroup: string }>>(
      `SELECT "id", "muscleGroup"::text AS "muscleGroup" FROM "Exercise" WHERE "id" = ANY($1::text[])`,
      exerciseIds
    )
    for (const row of muscleRows) muscleGroupByExerciseId.set(row.id, row.muscleGroup)
  }

  const userIds = [...new Set(routineRows.map((row) => row.userId))]
  const existingPlans = await db.$queryRawUnsafe<ExistingPlanRow[]>(
    `SELECT "id", "userId", "name" FROM "RoutinePlan" WHERE "userId" = ANY($1::text[])`,
    userIds
  )
  const existingPlanById = new Map(existingPlans.map((plan) => [plan.id, plan]))
  const existingPlanByNaturalKey = new Map(
    existingPlans.map((plan) => [`${plan.userId}\u0000${plan.name}`, plan])
  )

  const plannedRoutines = routineRows.map((routine) =>
    planLegacyRoutine(routine, exercisesByRoutine.get(routine.id) ?? [], muscleGroupByExerciseId)
  )

  const plannedKeys = new Map<string, string>()
  for (const planned of plannedRoutines) {
    const key = `${planned.plan.userId}\u0000${planned.plan.name}`
    const existing = existingPlanByNaturalKey.get(key)
    if (existing && existing.id !== planned.plan.id) {
      actions.naturalKeyConflicts = Number(actions.naturalKeyConflicts) + 1
      addBlocker(
        report,
        "conflict:routine-plan-name",
        "Ya existe un RoutinePlan con el mismo userId y nombre; resolvelo antes de migrar.",
        {
          userId: planned.plan.userId,
          name: planned.plan.name,
          existingPlanId: existing.id,
        }
      )
    }

    const plannedConflict = plannedKeys.get(key)
    if (plannedConflict && plannedConflict !== planned.plan.id) {
      actions.naturalKeyConflicts = Number(actions.naturalKeyConflicts) + 1
      addBlocker(
        report,
        "duplicate:routine-plan-name",
        "Dos rutinas legacy producen el mismo userId y nombre de RoutinePlan.",
        {
          userId: planned.plan.userId,
          name: planned.plan.name,
          planIds: [plannedConflict, planned.plan.id],
        }
      )
    }
    plannedKeys.set(key, planned.plan.id)
  }

  const planIds = [
    ...new Set([
      ...existingPlans.map((plan) => plan.id),
      ...plannedRoutines.map((planned) => planned.plan.id),
    ]),
  ]
  const existingSplits =
    planIds.length > 0
      ? await db.$queryRawUnsafe<ExistingSplitRow[]>(
          `SELECT "id", "planId", "label" FROM "RoutineSplit" WHERE "planId" = ANY($1::text[])`,
          planIds
        )
      : []
  const existingSplitById = new Map(existingSplits.map((split) => [split.id, split]))
  const splitsByPlanId = new Map<string, ExistingSplitRow[]>()
  for (const split of existingSplits) {
    const list = splitsByPlanId.get(split.planId) ?? []
    list.push(split)
    splitsByPlanId.set(split.planId, list)
  }

  const existingAssignments = await db.$queryRawUnsafe<ExistingAssignmentRow[]>(
    `SELECT "id", "userId", "planId" FROM "AssignedRoutinePlan" WHERE "planId" = ANY($1::text[])`,
    plannedRoutines.map((planned) => planned.plan.id)
  )
  const existingAssignmentById = new Map(
    existingAssignments.map((assignment) => [assignment.id, assignment])
  )
  const existingAssignmentByNaturalKey = new Map(
    existingAssignments.map((assignment) => [
      `${assignment.userId}\u0000${assignment.planId}`,
      assignment,
    ])
  )

  const existingExerciseIdRows = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "RoutineSplitExercise" WHERE "id" LIKE 'legacy-routine-exercise-%'`
  )
  const existingSplitExerciseIds = new Set(existingExerciseIdRows.map((row) => row.id))

  for (let index = 0; index < plannedRoutines.length; index++) {
    const routine = routineRows[index]
    const planned = plannedRoutines[index]
    let splitId = planned.split.id

    const existingPlan = existingPlanById.get(planned.plan.id)
    if (existingPlan) {
      if (existingPlan.userId !== planned.plan.userId || existingPlan.name !== planned.plan.name) {
        addBlocker(
          report,
          "conflict:routine-plan-id",
          "Un RoutinePlan existente con el ID determinístico tiene otro dueño o nombre.",
          { planId: planned.plan.id, routineId: routine.id }
        )
      }
    } else {
      const naturalKey = `${planned.plan.userId}\u0000${planned.plan.name}`
      actions.plansPlanned = Number(actions.plansPlanned) + 1
      if (write) {
        const affected = await db.$executeRawUnsafe(
          `INSERT INTO "RoutinePlan"
            ("id", "userId", "name", "description", "objective", "frequency", "difficulty", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NULL, NULL, NULL, $5, $6)
           ON CONFLICT ("id") DO NOTHING`,
          planned.plan.id,
          planned.plan.userId,
          planned.plan.name,
          planned.plan.description,
          planned.plan.createdAt,
          planned.plan.updatedAt
        )
        actions.plansApplied = Number(actions.plansApplied) + affected
      }
      existingPlanById.set(planned.plan.id, {
        id: planned.plan.id,
        userId: planned.plan.userId,
        name: planned.plan.name,
      })
      existingPlanByNaturalKey.set(naturalKey, {
        id: planned.plan.id,
        userId: planned.plan.userId,
        name: planned.plan.name,
      })
    }

    const existingSplit = existingSplitById.get(planned.split.id)
    if (existingSplit) {
      splitId = existingSplit.id
    } else {
      const splitsForPlan = splitsByPlanId.get(planned.plan.id) ?? []
      if (splitsForPlan.length === 0) {
        actions.splitsPlanned = Number(actions.splitsPlanned) + 1
        if (write) {
          const affected = await db.$executeRawUnsafe(
            `INSERT INTO "RoutineSplit"
              ("id", "planId", "label", "name", "description", "muscleGroups", "estimatedDuration", "difficulty", "order", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6::text[], NULL, NULL, $7, $8, $9)
             ON CONFLICT ("id") DO NOTHING`,
            planned.split.id,
            planned.split.planId,
            planned.split.label,
            planned.split.name,
            planned.split.description,
            planned.split.muscleGroups,
            planned.split.order,
            planned.split.createdAt,
            planned.split.updatedAt
          )
          actions.splitsApplied = Number(actions.splitsApplied) + affected
        }
        splitsByPlanId.set(planned.plan.id, [
          {
            id: planned.split.id,
            planId: planned.plan.id,
            label: planned.split.label,
          },
        ])
        existingSplitById.set(planned.split.id, {
          id: planned.split.id,
          planId: planned.plan.id,
          label: planned.split.label,
        })
      } else if (splitsForPlan.length === 1) {
        splitId = splitsForPlan[0].id
        actions.reusedSplits = Number(actions.reusedSplits) + 1
        addWarning(
          report,
          "reuse:routine-split",
          "El plan ya existía con un split no determinístico; se reutiliza ese split y no se duplican ejercicios.",
          { routineId: routine.id, planId: planned.plan.id, splitId }
        )
      } else {
        addBlocker(
          report,
          "ambiguous:routine-split",
          "Un RoutinePlan existente tiene más de un split; no se puede elegir uno sin ambigüedad.",
          {
            routineId: routine.id,
            planId: planned.plan.id,
            splitIds: splitsForPlan.map((split) => split.id),
          }
        )
      }
    }

    splitIdByRoutineId.set(routine.id, splitId)

    const isDeterministicSplit = splitId === planned.split.id
    if (isDeterministicSplit) {
      for (const exercise of planned.exercises) {
        if (existingSplitExerciseIds.has(exercise.id)) continue
        actions.splitExercisesPlanned = Number(actions.splitExercisesPlanned) + 1
        if (write) {
          const affected = await db.$executeRawUnsafe(
            `INSERT INTO "RoutineSplitExercise"
              ("id", "splitId", "exerciseId", "sets", "reps", "weight", "restSeconds", "order", "notes")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT ("id") DO NOTHING`,
            exercise.id,
            exercise.splitId,
            exercise.exerciseId,
            exercise.sets,
            exercise.reps,
            exercise.weight,
            exercise.restSeconds,
            exercise.order,
            exercise.notes
          )
          actions.splitExercisesApplied = Number(actions.splitExercisesApplied) + affected
        }
        existingSplitExerciseIds.add(exercise.id)
      }
    }

    if (planned.assignment) {
      const existingAssignment = existingAssignmentById.get(planned.assignment.id)
      const naturalAssignment = existingAssignmentByNaturalKey.get(
        `${planned.assignment.userId}\u0000${planned.assignment.planId}`
      )

      if (!existingAssignment && !naturalAssignment) {
        actions.assignmentsPlanned = Number(actions.assignmentsPlanned) + 1
        if (write) {
          const affected = await db.$executeRawUnsafe(
            `INSERT INTO "AssignedRoutinePlan" ("id", "userId", "planId", "active", "startedAt")
             VALUES ($1, $2, $3, true, $4)
             ON CONFLICT ("id") DO NOTHING`,
            planned.assignment.id,
            planned.assignment.userId,
            planned.assignment.planId,
            routine.createdAt
          )
          actions.assignmentsApplied = Number(actions.assignmentsApplied) + affected
        }
        existingAssignmentById.set(planned.assignment.id, {
          id: planned.assignment.id,
          userId: planned.assignment.userId,
          planId: planned.assignment.planId,
        })
        existingAssignmentByNaturalKey.set(
          `${planned.assignment.userId}\u0000${planned.assignment.planId}`,
          {
            id: planned.assignment.id,
            userId: planned.assignment.userId,
            planId: planned.assignment.planId,
          }
        )
      }
    }
  }

  return splitIdByRoutineId
}

async function backfillWorkoutLogs(
  db: Db,
  inventory: Inventory,
  splitIdByRoutineId: ReadonlyMap<string, string>,
  write: boolean,
  report: Report
) {
  const actions: ActionCounters = {
    legacyRoutineLogs: 0,
    planned: 0,
    applied: 0,
    orphanRoutineLogs: 0,
    withoutRoutine: 0,
  }
  report.actions.workoutLogs = actions

  if (!hasTable(inventory, "WorkoutLog")) return

  const hasRoutineId = hasColumn(inventory, "WorkoutLog", "routineId")
  const hasSplitId = hasColumn(inventory, "WorkoutLog", "splitId")

  if (!hasRoutineId) {
    if (hasSplitId) {
      actions.withoutRoutine = await count(
        db,
        `SELECT COUNT(*)::int AS count FROM "WorkoutLog" WHERE "splitId" IS NULL`
      )
    }
    return
  }

  const legacyLogs = await count(
    db,
    `SELECT COUNT(*)::int AS count FROM "WorkoutLog" WHERE "routineId" IS NOT NULL`
  )
  actions.legacyRoutineLogs = legacyLogs

  if (legacyLogs > 0 && !hasTable(inventory, "Routine")) {
    addBlocker(
      report,
      "missing-table:Routine-for-workout-logs",
      "Hay WorkoutLog con routineId pero no existe la tabla legacy Routine para mapearlos.",
      { legacyRoutineLogs: legacyLogs }
    )
  }

  if (!hasSplitId) {
    if (legacyLogs > 0) {
      addBlocker(
        report,
        "missing-column:WorkoutLog.splitId",
        "La tabla WorkoutLog tiene routineId legacy pero no splitId del schema actual.",
        { legacyRoutineLogs: legacyLogs }
      )
    }
    return
  }

  const groups = await db.$queryRawUnsafe<WorkoutLogGroupRow[]>(`
    SELECT "routineId", COUNT(*)::int AS count
    FROM "WorkoutLog"
    WHERE "routineId" IS NOT NULL AND "splitId" IS NULL
    GROUP BY "routineId"
    ORDER BY "routineId"
  `)

  for (const group of groups) {
    const splitId = splitIdByRoutineId.get(group.routineId)
    if (!splitId) {
      actions.orphanRoutineLogs = Number(actions.orphanRoutineLogs) + Number(group.count)
      addWarning(
        report,
        "orphan:workout-log-routine",
        "Hay WorkoutLog con routineId que no se pudo mapear a un split.",
        { routineId: group.routineId, logs: group.count }
      )
      continue
    }

    actions.planned = Number(actions.planned) + Number(group.count)
    if (write) {
      const affected = await db.$executeRawUnsafe(
        `UPDATE "WorkoutLog" SET "splitId" = $1 WHERE "routineId" = $2 AND "splitId" IS NULL`,
        splitId,
        group.routineId
      )
      actions.applied = Number(actions.applied) + affected
    }
  }

  actions.withoutRoutine = await count(
    db,
    `SELECT COUNT(*)::int AS count
     FROM "WorkoutLog"
     WHERE "routineId" IS NULL AND "splitId" IS NULL`
  )
  if (Number(actions.withoutRoutine) > 0) {
    addWarning(
      report,
      "workout-log:no-routine",
      "Hay WorkoutLog sin routineId legacy ni splitId; no se pueden mapear automáticamente.",
      { count: actions.withoutRoutine }
    )
  }
}

async function backfillClasses(
  db: Db,
  inventory: Inventory,
  gymIds: readonly string[],
  defaultGymId: string | null,
  write: boolean,
  report: Report
) {
  const actions: ActionCounters = {
    total: 0,
    startTimePlanned: 0,
    startTimeApplied: 0,
    gymPlanned: 0,
    gymApplied: 0,
    activePlanned: 0,
    activeApplied: 0,
    unresolvedStartTime: 0,
    unresolvedGym: 0,
    dayMismatches: 0,
  }
  report.actions.classes = actions

  if (!hasTable(inventory, "Class")) return

  actions.total = await count(db, `SELECT COUNT(*)::int AS count FROM "Class"`)
  if (Number(actions.total) === 0) return

  const hasStartTime = hasColumn(inventory, "Class", "startTime")
  const hasSchedule = hasColumn(inventory, "Class", "schedule")
  const hasGymId = hasColumn(inventory, "Class", "gymId")
  const hasActive = hasColumn(inventory, "Class", "active")

  if (!hasStartTime) {
    addBlocker(
      report,
      "missing-column:Class.startTime",
      "La tabla Class tiene filas pero no tiene la columna startTime del schema actual.",
      { classes: actions.total }
    )
  }
  if (!hasGymId) {
    addBlocker(
      report,
      "missing-column:Class.gymId",
      "La tabla Class tiene filas pero no tiene la columna gymId.",
      { classes: actions.total }
    )
    return
  }

  if (hasSchedule && hasColumn(inventory, "Class", "dayOfWeek")) {
    actions.dayMismatches = await count(
      db,
      `SELECT COUNT(*)::int AS count
       FROM "Class"
       WHERE "schedule" IS NOT NULL
         AND (ARRAY['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'])
             [EXTRACT(ISODOW FROM "schedule")::int] <> "dayOfWeek"::text`
    )
    if (Number(actions.dayMismatches) > 0) {
      addWarning(
        report,
        "class:day-mismatch",
        "Hay clases cuyo dayOfWeek no coincide con el día de schedule. Se conserva dayOfWeek y solo se toma la hora.",
        { classes: actions.dayMismatches }
      )
    }
  }

  const conditions: string[] = []
  if (hasStartTime) conditions.push(`(c."startTime" IS NULL OR btrim(c."startTime") = '')`)
  conditions.push(`c."gymId" IS NULL`)

  const rows = await db.$queryRawUnsafe<ClassRow[]>(`
    SELECT
      c."id",
      c."gymId",
      c."trainerId",
      t."gymId" AS "trainerGymId",
      ${hasSchedule ? `to_char(c."schedule", 'HH24:MI')` : `NULL::text`} AS "scheduleTime",
      ${hasStartTime ? `c."startTime"` : `NULL::text`} AS "startTime"
    FROM "Class" c
    LEFT JOIN "User" t ON t.id = c."trainerId"
    WHERE ${conditions.join(" OR ")}
    ORDER BY c."id"
  `)

  const unresolvedGymIds: string[] = []
  const unresolvedStartTimeIds: string[] = []

  for (const row of rows) {
    if (hasStartTime && (!row.startTime || row.startTime.trim() === "")) {
      const startTime = formatLegacyStartTime(row.scheduleTime)
      if (!startTime) {
        unresolvedStartTimeIds.push(row.id)
      } else {
        actions.startTimePlanned = Number(actions.startTimePlanned) + 1
        if (write) {
          const affected = await db.$executeRawUnsafe(
            `UPDATE "Class"
             SET "startTime" = $1
             WHERE "id" = $2 AND ("startTime" IS NULL OR btrim("startTime") = '')`,
            startTime,
            row.id
          )
          actions.startTimeApplied = Number(actions.startTimeApplied) + affected
        }
      }
    }

    if (row.gymId === null) {
      const resolution = resolveClassGymId({
        classGymId: row.gymId,
        trainerGymId: row.trainerGymId,
        defaultGymId,
        gymIds,
      })

      if (!resolution.gymId) {
        unresolvedGymIds.push(row.id)
      } else {
        actions.gymPlanned = Number(actions.gymPlanned) + 1
        if (write) {
          const affected = await db.$executeRawUnsafe(
            `UPDATE "Class" SET "gymId" = $1 WHERE "id" = $2 AND "gymId" IS NULL`,
            resolution.gymId,
            row.id
          )
          actions.gymApplied = Number(actions.gymApplied) + affected
        }
      }
    }
  }

  actions.unresolvedStartTime = unresolvedStartTimeIds.length
  if (unresolvedStartTimeIds.length > 0) {
    addBlocker(
      report,
      "unresolved:class-startTime",
      "Hay clases sin startTime y sin schedule válido; no se pueden completar.",
      { classIds: unresolvedStartTimeIds.slice(0, 50), count: unresolvedStartTimeIds.length }
    )
  }

  actions.unresolvedGym = unresolvedGymIds.length
  if (unresolvedGymIds.length > 0) {
    addBlocker(
      report,
      "ambiguous:class-gym",
      "Hay clases sin gymId y sin gimnasio inferible (trainer/default/único).",
      { classIds: unresolvedGymIds.slice(0, 50), count: unresolvedGymIds.length }
    )
  }

  if (hasActive) {
    actions.activePlanned = await count(
      db,
      `SELECT COUNT(*)::int AS count FROM "Class" WHERE "active" IS NULL`
    )
    if (write && Number(actions.activePlanned) > 0) {
      actions.activeApplied = await db.$executeRawUnsafe(
        `UPDATE "Class" SET "active" = true WHERE "active" IS NULL`
      )
    }
  }
}

async function backfillMemberships(db: Db, inventory: Inventory, write: boolean, report: Report) {
  const actions: ActionCounters = {
    total: 0,
    snapshotPlanned: 0,
    snapshotApplied: 0,
    nonPenPlans: 0,
    lowercasePaymentCurrencies: 0,
  }
  report.actions.memberships = actions

  if (!hasTable(inventory, "Membership") || !hasTable(inventory, "MembershipPlan")) return

  actions.total = await count(db, `SELECT COUNT(*)::int AS count FROM "Membership"`)

  const snapshotColumns = ["planPrice", "planCurrency", "planDurationDays"]
  const missingSnapshotColumns = snapshotColumns.filter(
    (column) => !hasColumn(inventory, "Membership", column)
  )

  if (missingSnapshotColumns.length > 0) {
    if (Number(actions.total) > 0) {
      addBlocker(
        report,
        "missing-column:Membership.snapshot",
        "Hay membresías pero faltan columnas de snapshot del schema actual.",
        { missing: missingSnapshotColumns, memberships: actions.total }
      )
    }
  } else {
    const where = `(
      m."planPrice" IS NULL
      OR (
        m."planPrice" = 0
        AND (
          m."planDurationDays" = 0
          OR m."planCurrency" IS NULL
          OR btrim(m."planCurrency") = ''
        )
      )
    )`
    actions.snapshotPlanned = await count(
      db,
      `SELECT COUNT(*)::int AS count
       FROM "Membership" m
       JOIN "MembershipPlan" p ON p.id = m."planId"
       WHERE ${where}`
    )

    if (write && Number(actions.snapshotPlanned) > 0) {
      actions.snapshotApplied = await db.$executeRawUnsafe(
        `UPDATE "Membership" m
         SET "planPrice" = p."price",
             "planCurrency" = p."currency",
             "planDurationDays" = p."durationDays"
         FROM "MembershipPlan" p
         WHERE m."planId" = p.id AND ${where}`
      )
    }
  }

  if (hasColumn(inventory, "MembershipPlan", "currency")) {
    actions.nonPenPlans = await count(
      db,
      `SELECT COUNT(*)::int AS count
       FROM "MembershipPlan"
       WHERE "currency" IS NULL OR upper(btrim("currency")) <> 'PEN'`
    )
    if (Number(actions.nonPenPlans) > 0) {
      addWarning(
        report,
        "membership-plan:non-pen",
        "Hay planes con moneda distinta de PEN. No se convierten automáticamente; revisá la decisión de negocio.",
        { plans: actions.nonPenPlans }
      )
    }
  }

  if (hasTable(inventory, "Payment") && hasColumn(inventory, "Payment", "currency")) {
    actions.lowercasePaymentCurrencies = await count(
      db,
      `SELECT COUNT(*)::int AS count FROM "Payment" WHERE "currency" <> upper("currency")`
    )
    if (Number(actions.lowercasePaymentCurrencies) > 0) {
      addWarning(
        report,
        "payment:lowercase-currency",
        "Hay pagos con moneda en minúsculas. El matching es case-insensitive y no se reescriben los valores.",
        { payments: actions.lowercasePaymentCurrencies }
      )
    }
  }
}

async function backfillPayments(db: Db, inventory: Inventory, write: boolean, report: Report) {
  const actions: ActionCounters = {
    unlinkedMembershipPayments: 0,
    linkedPlanned: 0,
    linkedApplied: 0,
    ambiguous: 0,
    unmatched: 0,
    confirmedAtPlanned: 0,
    confirmedAtApplied: 0,
    ambiguousPaymentIds: [],
  }
  report.actions.payments = actions

  if (!hasTable(inventory, "Payment")) return
  if (!hasTable(inventory, "Membership") || !hasTable(inventory, "MembershipPlan")) return

  const hasMembershipId = hasColumn(inventory, "Payment", "membershipId")
  const hasConfirmedAt = hasColumn(inventory, "Payment", "confirmedAt")

  if (!hasMembershipId) {
    const membershipPayments = await count(
      db,
      `SELECT COUNT(*)::int AS count FROM "Payment" WHERE "type" = 'MEMBERSHIP'`
    )
    if (membershipPayments > 0) {
      addBlocker(
        report,
        "missing-column:Payment.membershipId",
        "Hay pagos de membresía pero falta Payment.membershipId del schema actual.",
        { membershipPayments }
      )
    }
  }

  if (!hasConfirmedAt) {
    const completedPayments = await count(
      db,
      `SELECT COUNT(*)::int AS count FROM "Payment" WHERE "status" = 'COMPLETED'`
    )
    if (completedPayments > 0) {
      addBlocker(
        report,
        "missing-column:Payment.confirmedAt",
        "Hay pagos completados pero falta Payment.confirmedAt del schema actual.",
        { completedPayments }
      )
    }
  }

  if (!hasMembershipId) return

  const unlinked = await db.$queryRawUnsafe<PaymentRow[]>(`
    SELECT
      "id",
      "userId",
      "amount"::float8 AS "amount",
      "currency",
      "createdAt",
      "status"
    FROM "Payment"
    WHERE "membershipId" IS NULL AND "type" = 'MEMBERSHIP'
    ORDER BY "createdAt" ASC, "id" ASC
  `)
  actions.unlinkedMembershipPayments = unlinked.length

  const userIds = [...new Set(unlinked.map((payment) => payment.userId))]
  let candidates: MembershipCandidateRow[] = []

  if (userIds.length > 0) {
    const hasPlanPrice = hasColumn(inventory, "Membership", "planPrice")
    const hasPlanCurrency = hasColumn(inventory, "Membership", "planCurrency")
    const amountExpression =
      hasPlanPrice && hasPlanCurrency
        ? `COALESCE(NULLIF(m."planPrice"::numeric, 0), p."price")::float8`
        : `p."price"::float8`
    const currencyExpression =
      hasPlanPrice && hasPlanCurrency ? `COALESCE(m."planCurrency", p."currency")` : `p."currency"`

    candidates = await db.$queryRawUnsafe<MembershipCandidateRow[]>(
      `SELECT
         m."id",
         m."userId",
         m."startDate",
         m."endDate",
         ${amountExpression} AS "amount",
         ${currencyExpression} AS "currency"
       FROM "Membership" m
       JOIN "MembershipPlan" p ON p.id = m."planId"
       WHERE m."userId" = ANY($1::text[])`,
      userIds
    )
  }

  const candidatesByUser = new Map<string, MembershipCandidateRow[]>()
  for (const candidate of candidates) {
    const list = candidatesByUser.get(candidate.userId) ?? []
    list.push(candidate)
    candidatesByUser.set(candidate.userId, list)
  }

  const ambiguousIds: string[] = []

  for (const payment of unlinked) {
    const match = matchLegacyPayment(payment, candidatesByUser.get(payment.userId) ?? [])
    if (match.status === "ambiguous") {
      actions.ambiguous = Number(actions.ambiguous) + 1
      if (ambiguousIds.length < 50) ambiguousIds.push(payment.id)
      continue
    }
    if (match.status === "none") {
      actions.unmatched = Number(actions.unmatched) + 1
      continue
    }

    actions.linkedPlanned = Number(actions.linkedPlanned) + 1
    if (write) {
      const affected = await db.$executeRawUnsafe(
        `UPDATE "Payment" SET "membershipId" = $1 WHERE "id" = $2 AND "membershipId" IS NULL`,
        match.membershipId,
        payment.id
      )
      actions.linkedApplied = Number(actions.linkedApplied) + affected
    }
  }

  actions.ambiguousPaymentIds = ambiguousIds
  if (Number(actions.ambiguous) > 0) {
    addWarning(
      report,
      "ambiguous:payment-membership",
      "Hay pagos con más de una membresía candidata. Se omiten para revisión manual.",
      { count: actions.ambiguous, paymentIds: ambiguousIds }
    )
  }
  if (Number(actions.unmatched) > 0) {
    addWarning(
      report,
      "unmatched:payment-membership",
      "Hay pagos sin membresía candidata por monto/moneda/fecha.",
      { count: actions.unmatched }
    )
  }

  if (hasConfirmedAt) {
    actions.confirmedAtPlanned = await count(
      db,
      `SELECT COUNT(*)::int AS count
       FROM "Payment"
       WHERE "status" = 'COMPLETED' AND "confirmedAt" IS NULL`
    )
    if (write && Number(actions.confirmedAtPlanned) > 0) {
      actions.confirmedAtApplied = await db.$executeRawUnsafe(
        `UPDATE "Payment" SET "confirmedAt" = "updatedAt" WHERE "status" = 'COMPLETED' AND "confirmedAt" IS NULL`
      )
    }
  }
}

async function analyze(db: Db, write: boolean, mode: Mode): Promise<Report> {
  const inventory = await loadInventory(db)

  const report: Report = {
    tool: "migrate-legacy-contabo",
    mode,
    applied: false,
    database: {
      schema: inventory.schema,
      tables: inventory.tables.size,
      legacyTables: ["Routine", "RoutineExercise", "Class", "WorkoutLog"].filter((table) =>
        hasTable(inventory, table)
      ),
      currentTables: [
        "RoutinePlan",
        "RoutineSplit",
        "RoutineSplitExercise",
        "AssignedRoutinePlan",
        "GymExercise",
        "GymEquipmentActivation",
        "MembershipPlanPriceHistory",
        "TrainerRequest",
        "TrainerInvite",
      ].filter((table) => hasTable(inventory, table)),
    },
    legacyDetected: {
      routineTable: hasTable(inventory, "Routine"),
      routineExerciseTable: hasTable(inventory, "RoutineExercise"),
      workoutLogRoutineId: hasColumn(inventory, "WorkoutLog", "routineId"),
      classSchedule: hasColumn(inventory, "Class", "schedule"),
      classGymNullable: columnIsNullable(inventory, "Class", "gymId") === true,
      gymIsDefault: hasColumn(inventory, "Gym", "isDefault"),
      membershipSnapshots:
        hasColumn(inventory, "Membership", "planPrice") &&
        hasColumn(inventory, "Membership", "planCurrency") &&
        hasColumn(inventory, "Membership", "planDurationDays"),
      paymentMembershipLink: hasColumn(inventory, "Payment", "membershipId"),
    },
    actions: {},
    duplicateChecks: {},
    blockers: [],
    warnings: [],
    errors: [],
  }

  await runDuplicateChecks(db, inventory, report)

  const gym = await backfillGymDefault(db, inventory, write, report)
  await backfillGymExercises(db, inventory, write, report)
  const splitIdByRoutineId = await backfillRoutines(db, inventory, write, report)
  await backfillWorkoutLogs(db, inventory, splitIdByRoutineId, write, report)
  await backfillClasses(db, inventory, gym.gymIds, gym.defaultGymId, write, report)
  await backfillMemberships(db, inventory, write, report)
  await backfillPayments(db, inventory, write, report)

  return report
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    console.log(`Uso:
  npm run migrate:legacy:dry-run
  npm run migrate:legacy:apply

Opciones:
  --dry-run   Reporta conteos y acciones sin escribir (default).
  --apply     Ejecuta el backfill en una transacción e idempotente.
  --help      Muestra esta ayuda.

Variables:
  DATABASE_URL  Conexión PostgreSQL (obligatoria).`)
    return
  }

  const databaseUrl = readDatabaseUrl()
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  const prisma = new PrismaClient({ adapter })

  let report: Report | null = null

  try {
    if (args.mode === "apply") {
      report = await prisma.$transaction(
        async (tx) => {
          const preflight = await analyze(tx, false, "apply")
          if (preflight.blockers.length > 0) return preflight

          const applied = await analyze(tx, true, "apply")
          if (applied.blockers.length > 0) {
            throw new Error("Aparecieron bloqueos durante --apply; la transacción fue revertida.")
          }
          applied.applied = true
          return applied
        },
        { timeout: APPLY_TRANSACTION_TIMEOUT_MS, maxWait: 10_000 }
      )
    } else {
      report = await analyze(prisma, false, "dry-run")
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    report = report ?? {
      tool: "migrate-legacy-contabo",
      mode: args.mode,
      applied: false,
      database: { schema: "unknown", tables: 0, legacyTables: [], currentTables: [] },
      legacyDetected: {},
      actions: {},
      duplicateChecks: {},
      blockers: [],
      warnings: [],
      errors: [],
    }
    report.errors.push({ code: "migration:error", message })
    report.applied = false
  } finally {
    await prisma.$disconnect()
  }

  console.log(JSON.stringify(report, null, 2))

  const status = report.errors.length > 0 ? "ERROR" : report.blockers.length > 0 ? "BLOCKED" : "OK"
  console.error(
    `${status}: mode=${report.mode} applied=${report.applied} blockers=${report.blockers.length} warnings=${report.warnings.length} errors=${report.errors.length}`
  )

  if (status !== "OK") process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
