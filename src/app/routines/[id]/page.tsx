import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { revalidatePath } from "next/cache"

interface PageProps { params: Promise<{ id: string }> }

async function deletePlan(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  const id = formData.get("id") as string
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) redirect("/routines")
  await prisma.routinePlan.delete({ where: { id } })
  revalidatePath("/routines")
  redirect("/routines")
}

export default async function RoutineDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect("/login")

  const plan = await prisma.routinePlan.findUnique({
    where: { id },
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  })
  if (!plan) redirect("/routines")

  const canDelete = user.role === "ADMIN" || user.role === "TRAINER"

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <Link href="/routines" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Volver a rutinas
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{plan.name}</h1>
        {plan.description && <p className="text-muted-foreground">{plan.description}</p>}

        {plan.splits.map((split) => (
          <Card key={split.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-yellow/10 text-accent-yellow font-bold text-sm">
                  {split.label}
                </span>
                {split.name}
              </CardTitle>
              {split.muscleGroups.length > 0 && (
                <p className="text-xs text-muted-foreground">{split.muscleGroups.join(", ")}</p>
              )}
            </CardHeader>
            <CardContent>
              {split.exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin ejercicios</p>
              ) : (
                <div className="space-y-3">
                  {split.exercises.map((re) => (
                    <div key={re.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{re.exercise.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {re.sets}×{re.reps}
                          {re.weight > 0 ? ` · ${re.weight}kg` : ""} · {re.restSeconds}s descanso
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {canDelete && (
          <div className="border-t pt-6">
            <form action={deletePlan}>
              <input type="hidden" name="id" value={plan.id} />
              <Button type="submit" variant="destructive" size="sm">Eliminar rutina</Button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  )
}
