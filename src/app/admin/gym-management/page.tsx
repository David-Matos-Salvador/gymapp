import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { GymManagementTabs } from "@/components/admin/gym-management-tabs"

export default async function GymManagementPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) redirect("/dashboard")

  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
  })

  const plans = await prisma.routinePlan.findMany({
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })

  return (
    <AppShell>
      <GymManagementTabs
        exercises={JSON.parse(JSON.stringify(exercises))}
        plans={JSON.parse(JSON.stringify(plans))}
        members={JSON.parse(JSON.stringify(members))}
        currentUser={{ id: user.id, role: user.role }}
      />
    </AppShell>
  )
}