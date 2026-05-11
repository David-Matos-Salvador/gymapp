import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

interface PageProps {
  params: Promise<{ splitId: string }>
}

export default async function OldWorkoutLogPage({ params }: PageProps) {
  const { splitId } = await params

  const split = await prisma.routineSplit.findUnique({
    where: { id: splitId },
    select: { planId: true },
  })

  if (!split) redirect("/rutinas")

  redirect(`/rutinas/${split.planId}/entrenar/${splitId}`)
}
