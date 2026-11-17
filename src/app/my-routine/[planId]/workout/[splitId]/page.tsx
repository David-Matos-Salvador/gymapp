import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSplitForWorkout } from "@/lib/workout-split"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { WorkoutClient } from "./workout-client"

interface PageProps {
  params: Promise<{ planId: string; splitId: string }>
}

// La pantalla de entrenar llega con sus datos desde el servidor (issue #12): antes se
// dibujaba vacía y los pedía después desde el navegador.
export const metadata: Metadata = {
  title: "Entrenamiento",
}

export default async function LogWorkoutPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) redirect("/login")

  const { planId, splitId } = await params
  const data = await getSplitForWorkout(splitId, user)

  if (!data) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl text-center">
          <p className="text-muted-foreground py-12">Entrenamiento no encontrado</p>
          <Button variant="outline" className="min-h-11" asChild>
            <Link href={`/my-routine/${planId}`}>Volver</Link>
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <WorkoutClient
      planId={planId}
      split={data.split}
      gym={data.gym}
      lastPerformance={data.lastPerformance}
    />
  )
}
