-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "CalendarConnectionStatus" AS ENUM ('ACTIVE', 'NEEDS_RECONNECT');

-- CreateTable
CREATE TABLE "CoachCalendarConnection" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'GOOGLE',
    "encryptedRefreshToken" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "status" "CalendarConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarBusyBlock" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarBusyBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachCalendarConnection_trainerId_key" ON "CoachCalendarConnection"("trainerId");

-- CreateIndex
CREATE INDEX "CalendarBusyBlock_connectionId_startsAt_idx" ON "CalendarBusyBlock"("connectionId", "startsAt");

-- AddForeignKey
ALTER TABLE "CoachCalendarConnection" ADD CONSTRAINT "CoachCalendarConnection_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarBusyBlock" ADD CONSTRAINT "CalendarBusyBlock_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CoachCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

