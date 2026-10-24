-- Expand phase: legacy schema (20260510025951_init) -> current schema.
--
-- This migration is ADDITIVE and IDEMPOTENT. It never drops or renames legacy
-- tables/columns, and it never deletes rows. Apply it to a restored legacy
-- database before running scripts/migrate-legacy-contabo.ts.
--
-- Deliberately NOT created here (contract phase, after verification):
--   * UNIQUE indexes that legacy data may violate:
--       Exercise(name), MembershipPlan(gymId, name), Membership(userId, planId),
--       CheckIn(userId, date), BodyMeasurement(userId, date), Booking(userId, classId)
--   * NOT NULL on Class.startTime / Class.gymId (the backfill may still be filling them)
--   * Removal of Routine, RoutineExercise, WorkoutLog.routineId, Class.schedule
--
-- On a database created from 20261024000000_baseline every statement is a no-op.
-- On the legacy database it creates/relaxes exactly what the application needs.

SET search_path TO public;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'YAPE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TRAINER_REQUEST';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'TrainerRequestStatus'
      AND t.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE "TrainerRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'InviteStatus'
      AND t.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- New columns on existing tables
-- ---------------------------------------------------------------------------

ALTER TABLE "Gym"
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showMachineNumbers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "height" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;

ALTER TABLE "Membership"
  ADD COLUMN IF NOT EXISTS "planPrice" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "planCurrency" TEXT NOT NULL DEFAULT 'PEN',
  ADD COLUMN IF NOT EXISTS "planDurationDays" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "GymEquipment"
  ADD COLUMN IF NOT EXISTS "machineNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN "gymId" DROP NOT NULL;

ALTER TABLE "Exercise"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "WorkoutLog"
  ADD COLUMN IF NOT EXISTS "splitId" TEXT;

ALTER TABLE "Class"
  ADD COLUMN IF NOT EXISTS "startTime" TEXT,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "membershipId" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedById" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Currency defaults changed in the current schema. Existing legacy rows keep
-- their original currency ("MXN"/"mxn"); the backfill only reports them.
ALTER TABLE "MembershipPlan" ALTER COLUMN "currency" SET DEFAULT 'PEN';
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'PEN';

-- Legacy money columns were DOUBLE PRECISION; the current schema uses
-- DECIMAL(12,2). The guard keeps this migration cheap/idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'MembershipPlan'
      AND column_name = 'price'
      AND (data_type <> 'numeric' OR numeric_precision <> 12 OR numeric_scale <> 2)
  ) THEN
    ALTER TABLE "MembershipPlan"
      ALTER COLUMN "price" TYPE DECIMAL(12,2) USING "price"::numeric(12,2);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Payment'
      AND column_name = 'amount'
      AND (data_type <> 'numeric' OR numeric_precision <> 12 OR numeric_scale <> 2)
  ) THEN
    ALTER TABLE "Payment"
      ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::numeric(12,2);
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- New tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "MembershipPlanPriceHistory" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,2),
    "newPrice" DECIMAL(12,2) NOT NULL,
    "oldCurrency" TEXT,
    "newCurrency" TEXT NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPlanPriceHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembershipPlanPriceHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MembershipPlanPriceHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "GymExercise" (
    "gymId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymExercise_pkey" PRIMARY KEY ("gymId","exerciseId"),
    CONSTRAINT "GymExercise_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GymExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "GymEquipmentActivation" (
    "gymId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "machineNumber" INTEGER,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymEquipmentActivation_pkey" PRIMARY KEY ("gymId","equipmentId"),
    CONSTRAINT "GymEquipmentActivation_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GymEquipmentActivation_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "GymEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RoutinePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" "FitnessGoal",
    "frequency" INTEGER,
    "difficulty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutinePlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoutinePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RoutineSplit" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "muscleGroups" TEXT[],
    "estimatedDuration" INTEGER,
    "difficulty" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineSplit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoutineSplit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutinePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RoutineSplitExercise" (
    "id" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" TEXT NOT NULL DEFAULT '10',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "restSeconds" INTEGER NOT NULL DEFAULT 60,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "RoutineSplitExercise_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoutineSplitExercise_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "RoutineSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoutineSplitExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AssignedRoutinePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedRoutinePlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AssignedRoutinePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssignedRoutinePlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutinePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TrainerRequest" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "TrainerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "TrainerRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TrainerRequest_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainerRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TrainerInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "gymId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerInvite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TrainerInvite_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainerInvite_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainerInvite_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Only indexes that are safe before the backfill / on empty new tables are
-- created here. Unique indexes on legacy-populated columns stay deferred to the
-- contract phase; they are checked by scripts/verify-migration.sh.

CREATE UNIQUE INDEX IF NOT EXISTS "Gym_ownerId_key" ON "Gym"("ownerId");

CREATE INDEX IF NOT EXISTS "MembershipPlanPriceHistory_planId_createdAt_idx"
  ON "MembershipPlanPriceHistory"("planId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "RoutinePlan_name_userId_key" ON "RoutinePlan"("name", "userId");

CREATE INDEX IF NOT EXISTS "AssignedRoutinePlan_userId_idx" ON "AssignedRoutinePlan"("userId");
CREATE INDEX IF NOT EXISTS "AssignedRoutinePlan_planId_idx" ON "AssignedRoutinePlan"("planId");
CREATE UNIQUE INDEX IF NOT EXISTS "AssignedRoutinePlan_userId_planId_key"
  ON "AssignedRoutinePlan"("userId", "planId");

CREATE INDEX IF NOT EXISTS "Payment_membershipId_idx" ON "Payment"("membershipId");

CREATE INDEX IF NOT EXISTS "TrainerRequest_trainerId_idx" ON "TrainerRequest"("trainerId");
CREATE INDEX IF NOT EXISTS "TrainerRequest_clientId_idx" ON "TrainerRequest"("clientId");
CREATE INDEX IF NOT EXISTS "TrainerRequest_status_idx" ON "TrainerRequest"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "TrainerRequest_trainerId_clientId_key"
  ON "TrainerRequest"("trainerId", "clientId");

CREATE UNIQUE INDEX IF NOT EXISTS "TrainerInvite_token_key" ON "TrainerInvite"("token");
CREATE INDEX IF NOT EXISTS "TrainerInvite_trainerId_idx" ON "TrainerInvite"("trainerId");
CREATE INDEX IF NOT EXISTS "TrainerInvite_status_idx" ON "TrainerInvite"("status");

-- ---------------------------------------------------------------------------
-- Foreign keys on existing tables
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Gym_ownerId_fkey'
      AND conrelid = 'public."Gym"'::regclass
  ) THEN
    ALTER TABLE "Gym"
      ADD CONSTRAINT "Gym_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Exercise_userId_fkey'
      AND conrelid = 'public."Exercise"'::regclass
  ) THEN
    ALTER TABLE "Exercise"
      ADD CONSTRAINT "Exercise_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WorkoutLog_splitId_fkey'
      AND conrelid = 'public."WorkoutLog"'::regclass
  ) THEN
    ALTER TABLE "WorkoutLog"
      ADD CONSTRAINT "WorkoutLog_splitId_fkey"
      FOREIGN KEY ("splitId") REFERENCES "RoutineSplit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Payment_membershipId_fkey'
      AND conrelid = 'public."Payment"'::regclass
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_membershipId_fkey"
      FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Payment_confirmedById_fkey'
      AND conrelid = 'public."Payment"'::regclass
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_confirmedById_fkey"
      FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
