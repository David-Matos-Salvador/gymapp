import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, onboardingCompleted: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (user.role === "MEMBER" && !user.onboardingCompleted) {
    redirect("/onboarding")
  }

  switch (user.role) {
    case "SUPER_ADMIN":
      redirect("/super-admin")
    case "ADMIN":
      redirect("/admin")
    case "TRAINER":
      redirect("/coach")
    case "MEMBER":
      redirect("/rutinas")
    default:
      redirect("/login")
  }
}
