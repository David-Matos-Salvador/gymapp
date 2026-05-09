import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { revalidatePath } from "next/cache"

const muscleGroupLabel: Record<string, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  LEGS: "Piernas",
  GLUTES: "Glúteos",
  ABS: "Abdominales",
  CALVES: "Pantorrillas",
  FOREARMS: "Antebrazos",
  TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo",
  CARDIO: "Cardio",
}

const equipmentLabel: Record<string, string> = {
  BARBELL: "Barra", DUMBBELL: "Mancuerna", MACHINE: "Máquina", CABLE: "Cable",
  BODYWEIGHT: "Peso corporal", KETTLEBELL: "Kettlebell", BAND: "Banda",
  SMITH_MACHINE: "Smith", EZ_BAR: "Barra EZ", BENCH: "Banco", PLATE: "Disco", OTHER: "Otro",
}

interface PageProps { params: Promise<{ id: string }> }

async function deleteRoutine(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  const id = formData.get("id") as string
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) redirect("/routines")
  await prisma.routine.delete({ where: { id } })
  revalidatePath("/routines")
  redirect("/routines")
}

export default async function RoutineDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect("/login")

  const routine = await prisma.routine.findUnique({
    where: { id },
    include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
  })
  if (!routine) redirect("/routines")

  const canDelete = user.role === "ADMIN" || user.role === "TRAINER"

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <Link href="/routines" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Volver a rutinas
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{routine.name}</h1>
        {routine.description && <p className="text-muted-foreground">{routine.description}</p>}

        <Button asChild>
          <Link href={`/workout/log/${routine.id}`}>Registrar entrenamiento</Link>
        </Button>

        <Card>
          <CardHeader><CardTitle className="text-lg">Ejercicios ({routine.exercises.length})</CardTitle></CardHeader>
          <CardContent>
            {routine.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin ejercicios</p>
            ) : (
              <div className="space-y-4">
                {routine.exercises.map((re) => (
                  <div key={re.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{re.exercise.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                        {muscleGroupLabel[re.exercise.muscleGroup] ?? re.exercise.muscleGroup}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                        {equipmentLabel[re.exercise.equipment] ?? re.exercise.equipment}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div><span className="text-[10px] text-muted-foreground block">Series</span><span className="font-medium">{re.sets}</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Reps</span><span className="font-medium">{re.reps}</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Peso</span><span className="font-medium">{re.weight} kg</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Descanso</span><span className="font-medium">{re.restSeconds}s</span></div>
                    </div>
                    {re.notes && <p className="text-xs text-muted-foreground">{re.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {canDelete && (
          <div className="border-t pt-6">
            <form action={deleteRoutine}>
              <input type="hidden" name="id" value={routine.id} />
              <Button type="submit" variant="destructive" size="sm">Eliminar rutina</Button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  )
}
