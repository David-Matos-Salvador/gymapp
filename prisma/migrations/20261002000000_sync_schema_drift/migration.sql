-- CreateEnum
CREATE TYPE "TrainerRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TRAINER_REQUEST';

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'YAPE';

-- DropForeignKey
ALTER TABLE "Routine" DROP CONSTRAINT "Routine_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "Routine" DROP CONSTRAINT "Routine_userId_fkey";

-- DropForeignKey
ALTER TABLE "RoutineExercise" DROP CONSTRAINT "RoutineExercise_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "RoutineExercise" DROP CONSTRAINT "RoutineExercise_routineId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutLog" DROP CONSTRAINT "WorkoutLog_routineId_fkey";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "schedule",
ADD COLUMN     "startTime" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "showMachineNumbers" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GymEquipment" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "machineNumber" INTEGER,
ALTER COLUMN "gymId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MembershipPlan" ALTER COLUMN "currency" SET DEFAULT 'PEN';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "receiptUrl" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'PEN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WorkoutLog" DROP COLUMN "routineId",
ADD COLUMN     "splitId" TEXT;

-- DropTable
DROP TABLE "Routine";

-- DropTable
DROP TABLE "RoutineExercise";

-- CreateTable
CREATE TABLE "GymExercise" (
    "gymId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymExercise_pkey" PRIMARY KEY ("gymId","exerciseId")
);

-- CreateTable
CREATE TABLE "GymEquipmentActivation" (
    "gymId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymEquipmentActivation_pkey" PRIMARY KEY ("gymId","equipmentId")
);

-- CreateTable
CREATE TABLE "RoutinePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" "FitnessGoal",
    "frequency" INTEGER,
    "difficulty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutinePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineSplit" (
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

    CONSTRAINT "RoutineSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineSplitExercise" (
    "id" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" TEXT NOT NULL DEFAULT '10',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "restSeconds" INTEGER NOT NULL DEFAULT 60,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "RoutineSplitExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedRoutinePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedRoutinePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerRequest" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "TrainerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "TrainerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerInvite" (
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

    CONSTRAINT "TrainerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoutinePlan_name_userId_key" ON "RoutinePlan"("name", "userId");

-- CreateIndex
CREATE INDEX "AssignedRoutinePlan_userId_idx" ON "AssignedRoutinePlan"("userId");

-- CreateIndex
CREATE INDEX "AssignedRoutinePlan_planId_idx" ON "AssignedRoutinePlan"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignedRoutinePlan_userId_planId_key" ON "AssignedRoutinePlan"("userId", "planId");

-- CreateIndex
CREATE INDEX "TrainerRequest_trainerId_idx" ON "TrainerRequest"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerRequest_clientId_idx" ON "TrainerRequest"("clientId");

-- CreateIndex
CREATE INDEX "TrainerRequest_status_idx" ON "TrainerRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerRequest_trainerId_clientId_key" ON "TrainerRequest"("trainerId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerInvite_token_key" ON "TrainerInvite"("token");

-- CreateIndex
CREATE INDEX "TrainerInvite_trainerId_idx" ON "TrainerInvite"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerInvite_status_idx" ON "TrainerInvite"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BodyMeasurement_userId_date_key" ON "BodyMeasurement"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_userId_classId_key" ON "Booking"("userId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_userId_date_key" ON "CheckIn"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Gym_ownerId_key" ON "Gym"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_planId_key" ON "Membership"("userId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_gymId_name_key" ON "MembershipPlan"("gymId", "name");

-- AddForeignKey
ALTER TABLE "Gym" ADD CONSTRAINT "Gym_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExercise" ADD CONSTRAINT "GymExercise_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExercise" ADD CONSTRAINT "GymExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEquipmentActivation" ADD CONSTRAINT "GymEquipmentActivation_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEquipmentActivation" ADD CONSTRAINT "GymEquipmentActivation_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "GymEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutinePlan" ADD CONSTRAINT "RoutinePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineSplit" ADD CONSTRAINT "RoutineSplit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutinePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineSplitExercise" ADD CONSTRAINT "RoutineSplitExercise_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "RoutineSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineSplitExercise" ADD CONSTRAINT "RoutineSplitExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedRoutinePlan" ADD CONSTRAINT "AssignedRoutinePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedRoutinePlan" ADD CONSTRAINT "AssignedRoutinePlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutinePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "RoutineSplit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerRequest" ADD CONSTRAINT "TrainerRequest_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerRequest" ADD CONSTRAINT "TrainerRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInvite" ADD CONSTRAINT "TrainerInvite_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInvite" ADD CONSTRAINT "TrainerInvite_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInvite" ADD CONSTRAINT "TrainerInvite_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

