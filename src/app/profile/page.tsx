import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { ProfileForm } from "@/components/profile-form"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      sex: true,
      birthDate: true,
      objective: true,
      experienceLevel: true,
      medicalNotes: true,
      emergencyContact: true,
      emergencyPhone: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) redirect("/login")

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Perfil</h1>
          <p className="text-muted-foreground">Configuración de tu cuenta</p>
        </div>
        <ProfileForm user={{
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt?.toISOString(),
          birthDate: user.birthDate?.toISOString() ?? null,
        }} />
      </div>
    </AppShell>
  )
}
