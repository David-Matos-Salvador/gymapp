import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Phone, Calendar, Target, Award, AlertTriangle, Dumbbell, TrendingUp, CheckCircle } from "lucide-react"

const muscleGroupLabel: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "Bíceps",
  TRICEPS: "Tríceps", LEGS: "Piernas", GLUTES: "Glúteos", ABS: "Abdominales",
  CALVES: "Pantorrillas", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

const objectiveLabels: Record<string, string> = {
  WEIGHT_LOSS: "Pérdida de peso", MUSCLE_GAIN: "Ganancia muscular", TONING: "Tonificación",
  STRENGTH: "Fuerza", ENDURANCE: "Resistencia", GENERAL_FITNESS: "Fitness general",
  REHABILITATION: "Rehabilitación", COMPETITION: "Competición",
}

const experienceLabels: Record<string, string> = {
  BEGINNER: "Principiante", INTERMEDIATE: "Intermedio", ADVANCED: "Avanzado", ELITE: "Élite",
}

interface PageProps { params: Promise<{ id: string }> }

export default async function CoachClientDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.role !== "TRAINER") redirect("/coach")

  const { id } = await params

  const client = await prisma.user.findUnique({
    where: { id, assignedTrainerId: user.id },
    select: {
      id: true, name: true, email: true, phone: true, sex: true, birthDate: true,
      objective: true, experienceLevel: true, medicalNotes: true, emergencyContact: true, emergencyPhone: true,
      createdAt: true,
      bodyMeasurements: { orderBy: { date: "desc" }, take: 5 },
      routines: { include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }, orderBy: { updatedAt: "desc" } },
      workoutLogs: { include: { sets: { orderBy: { setNumber: "asc" } } }, orderBy: { date: "desc" }, take: 10 },
      checkIns: { orderBy: { date: "desc" }, take: 10 },
      memberShips: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!client) redirect("/coach")

  const age = client.birthDate
    ? new Date().getFullYear() - new Date(client.birthDate).getFullYear()
    : null

  const currentMembership = client.memberShips[0]
  const isMembershipActive = currentMembership?.status === "ACTIVE" && new Date(currentMembership.endDate) > new Date()

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl space-y-6">
        <Link href="/coach" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Volver al panel
        </Link>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-gym-green" /> Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gym-green/10 text-gym-green text-xl font-bold">
                {(client.name ?? client.email)[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-lg">{client.name || "Sin nombre"}</p>
                <p className="text-sm text-muted-foreground">{client.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isMembershipActive ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gym-green bg-gym-green/10 rounded-full px-2 py-0.5">
                    <CheckCircle className="h-3 w-3" /> Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                    Sin membresía activa
                  </span>
                )}
                {currentMembership?.plan && (
                  <span className="text-xs text-muted-foreground">{currentMembership.plan.name}</span>
                )}
              </div>
              <div className="space-y-1 text-sm pt-2">
                {client.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{client.phone}</span></div>}
                <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{age ? `${age} años` : "Edad no registrada"}</span></div>
                {client.objective && <div className="flex items-center gap-2"><Target className="h-3 w-3 text-muted-foreground" /><span>{objectiveLabels[client.objective] || client.objective}</span></div>}
                {client.experienceLevel && <div className="flex items-center gap-2"><Award className="h-3 w-3 text-muted-foreground" /><span>{experienceLabels[client.experienceLevel] || client.experienceLevel}</span></div>}
              </div>
              {client.medicalNotes && (
                <div className="rounded-lg bg-gym-orange/10 p-3 mt-2">
                  <div className="flex items-center gap-1.5 text-xs"><AlertTriangle className="h-3 w-3 text-gym-orange" /><span className="font-medium text-gym-orange">Notas médicas</span></div>
                  <p className="text-xs mt-1">{client.medicalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-gym-green" /> Últimas mediciones</CardTitle>
              </CardHeader>
              <CardContent>
                {client.bodyMeasurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin mediciones registradas</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-1 font-medium text-muted-foreground text-xs">Fecha</th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">Peso</th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">% Grasa</th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">IMC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {client.bodyMeasurements.map((m) => (
                          <tr key={m.id} className="border-b last:border-0">
                            <td className="py-1.5 px-1 text-xs">{new Date(m.date).toLocaleDateString("es")}</td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.weight ?? "-"} kg</td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.bodyFat ?? "-"}%</td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.bmi ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-gym-green" /> Rutinas</CardTitle>
              </CardHeader>
              <CardContent>
                {client.routines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin rutinas asignadas</p>
                ) : (
                  <div className="space-y-2">
                    {client.routines.map((r) => (
                      <Link key={r.id} href={`/routines/${r.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gym-green/10"><Dumbbell className="h-5 w-5 text-gym-green" /></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.exercises.length} ejercicios</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-gym-violet" /> Últimos entrenamientos</CardTitle>
              </CardHeader>
              <CardContent>
                {client.workoutLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin entrenamientos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {client.workoutLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{log.routineId ? "Entrenamiento con rutina" : "Entrenamiento libre"}</p>
                          <span className="text-xs text-muted-foreground">{new Date(log.date).toLocaleDateString("es")}</span>
                        </div>
                        {log.duration && <p className="text-xs text-muted-foreground">{log.duration} min</p>}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {log.sets.slice(0, 5).map((s) => (
                            <span key={s.id} className="inline-flex items-center text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {s.exerciseName}: {s.reps}×{s.weight}kg
                            </span>
                          ))}
                          {log.sets.length > 5 && <span className="text-[10px] text-muted-foreground">+{log.sets.length - 5} más</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
