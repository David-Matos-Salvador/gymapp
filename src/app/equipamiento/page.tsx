import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { canManageGymEquipment } from "@/lib/gym-equipment"

export default async function EquipamientoPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, gymId: true, role: true },
  })

  if (!user) redirect("/login")

  const gym = user.gymId
    ? await prisma.gym.findUnique({
        where: { id: user.gymId },
        select: { id: true, ownerId: true, showMachineNumbers: true },
      })
    : null

  if (canManageGymEquipment(user, gym)) {
    redirect("/admin/gym-management")
  }

  redirect("/dashboard")
}
