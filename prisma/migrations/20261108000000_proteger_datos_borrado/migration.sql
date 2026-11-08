-- Borrado lógico de usuarios y protección de pagos, membresías, clases y rutinas.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Class" DROP CONSTRAINT "Class_trainerId_fkey";
ALTER TABLE "Class" ADD CONSTRAINT "Class_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RoutinePlan" DROP CONSTRAINT "RoutinePlan_userId_fkey";
ALTER TABLE "RoutinePlan" ADD CONSTRAINT "RoutinePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MembershipPlan" DROP CONSTRAINT "MembershipPlan_gymId_fkey";
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
