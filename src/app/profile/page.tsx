import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileForm } from "@/components/profile/profile-form"
import { ProfileActions } from "@/components/profile/profile-actions"
import { Suspense } from "react"
import { ProfileSkeleton } from "@/components/profile/profile-skeleton"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Perfil",
}

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
      height: true,
      weight: true,
      image: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) redirect("/login")

  const serializedUser = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
    birthDate: user.birthDate?.toISOString() ?? null,
  }

  return (
    <AppShell>
      <Suspense fallback={<ProfileSkeleton />}>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl space-y-6">
          <ProfileHeader user={serializedUser} />
          <ProfileForm user={serializedUser} />
          <ProfileActions />
        </div>
      </Suspense>
    </AppShell>
  )
}
