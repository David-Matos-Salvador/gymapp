"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AppShell } from "@/components/layout/shell"
import { useSound } from "@/hooks/use-sound"
import { User, Mail, Phone, Calendar, Target, Award, AlertTriangle, Dumbbell, TrendingUp, CheckCircle, Plus, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const objectiveLabels: Record<string, string> = {
  WEIGHT_LOSS: "Pérdida de peso", MUSCLE_GAIN: "Ganancia muscular", TONING: "Tonificación",
  STRENGTH: "Fuerza", ENDURANCE: "Resistencia", GENERAL_FITNESS: "Fitness general",
  REHABILITATION: "Rehabilitación", COMPETITION: "Competición",
}
const experienceLabels: Record<string, string> = {
  BEGINNER: "Principiante", INTERMEDIATE: "Intermedio", ADVANCED: "Avanzado", ELITE: "Élite",
}

interface BodyMeasurement {
  id: string; date: string; weight: number | null; bodyFat: number | null; bmi: number | null
}
interface RoutineData { id: string; name: string; exercises: { exercise: { name: string } }[] }
interface WorkoutLogData { id: string; routineId: string | null; date: string; duration: number | null; sets: { id: string; exerciseName: string; reps: number; weight: number }[] }
interface ClientData {
  id: string; name: string | null; email: string; phone: string | null; birthDate: string | null
  objective: string | null; experienceLevel: string | null; medicalNotes: string | null
  emergencyContact: string | null; emergencyPhone: string | null
  bodyMeasurements: BodyMeasurement[]
  routines: RoutineData[]
  workoutLogs: WorkoutLogData[]
  memberShips: { status: string; endDate: string; plan: { name: string } | null }[]
}

export default function CoachClientDetail({ clientData }: { clientData: ClientData }) {
  const router = useRouter()
  const { play } = useSound()
  const [client, setClient] = useState(clientData)
  const [measureOpen, setMeasureOpen] = useState(false)
  const [routineOpen, setRoutineOpen] = useState(false)
  const [measureForm, setMeasureForm] = useState({ weight: "", bodyFat: "", height: "", notes: "" })
  const [measureSaving, setMeasureSaving] = useState(false)
  const [availableRoutines, setAvailableRoutines] = useState<{ id: string; name: string }[]>([])
  const [routineLoading, setRoutineLoading] = useState(false)

  const age = client.birthDate ? new Date().getFullYear() - new Date(client.birthDate).getFullYear() : null
  const currentMembership = client.memberShips[0]
  const isMembershipActive = currentMembership?.status === "ACTIVE" && new Date(currentMembership.endDate) > new Date()

  async function handleAddMeasurement() {
    if (!measureForm.weight.trim() && !measureForm.bodyFat.trim()) {
      toast.error("Agrega al menos peso o % de grasa")
      return
    }
    setMeasureSaving(true)
    const body: Record<string, unknown> = { userId: client.id, date: new Date().toISOString() }
    if (measureForm.weight) body.weight = parseFloat(measureForm.weight)
    if (measureForm.bodyFat) body.bodyFat = parseFloat(measureForm.bodyFat)
    if (measureForm.height) body.height = parseFloat(measureForm.height)
    if (measureForm.notes) body.notes = measureForm.notes
    if (body.weight && body.height) {
      body.bmi = parseFloat(((body.weight as number) / Math.pow((body.height as number) / 100, 2)).toFixed(1))
    }

    try {
      const res = await fetch("/api/body-measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        play("success")
        toast.success("Medicion registrada")
        setMeasureOpen(false)
        setMeasureForm({ weight: "", bodyFat: "", height: "", notes: "" })
        router.refresh()
      } else {
        toast.error("Error al guardar medicion")
      }
    } catch { toast.error("Error de conexion") }
    setMeasureSaving(false)
  }

  async function fetchRoutines() {
    setRoutineLoading(true)
    try {
      const res = await fetch("/api/routines")
      const data = await res.json()
      const routines = data.routines || []
      const existingIds = new Set(client.routines.map((r) => r.id))
      setAvailableRoutines(routines.filter((r: { id: string }) => !existingIds.has(r.id)))
    } catch { toast.error("Error al cargar rutinas") }
    setRoutineLoading(false)
  }

  async function assignRoutine(routineId: string) {
    try {
      const res = await fetch(`/api/routines/${routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: client.id }),
      })
      if (res.ok) {
        play("success")
        toast.success("Rutina asignada")
        setRoutineOpen(false)
        router.refresh()
      } else {
        toast.error("Error al asignar rutina")
      }
    } catch { toast.error("Error de conexion") }
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl space-y-6">
        <Link href="/coach/clients" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Volver a clientes
        </Link>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-gym-green" /> Perfil</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gym-green/10 text-gym-green text-xl font-bold">
                {(client.name ?? client.email)[0].toUpperCase()}
              </div>
              <div><p className="font-semibold text-lg">{client.name || "Sin nombre"}</p><p className="text-sm text-muted-foreground">{client.email}</p></div>
              <div className="flex flex-wrap gap-2">
                {isMembershipActive ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gym-green bg-gym-green/10 rounded-full px-2 py-0.5"><CheckCircle className="h-3 w-3" /> Activo</span>
                ) : <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5">Sin membresia activa</span>}
                {currentMembership?.plan && <span className="text-xs text-muted-foreground">{currentMembership.plan.name}</span>}
              </div>
              <div className="space-y-1 text-sm pt-2">
                {client.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{client.phone}</span></div>}
                <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{age ? `${age} anos` : "Edad no registrada"}</span></div>
                {client.objective && <div className="flex items-center gap-2"><Target className="h-3 w-3 text-muted-foreground" /><span>{objectiveLabels[client.objective] || client.objective}</span></div>}
                {client.experienceLevel && <div className="flex items-center gap-2"><Award className="h-3 w-3 text-muted-foreground" /><span>{experienceLabels[client.experienceLevel] || client.experienceLevel}</span></div>}
              </div>
              {client.medicalNotes && (
                <div className="rounded-lg bg-gym-orange/10 p-3 mt-2">
                  <div className="flex items-center gap-1.5 text-xs"><AlertTriangle className="h-3 w-3 text-gym-orange" /><span className="font-medium text-gym-orange">Notas medicas</span></div>
                  <p className="text-xs mt-1">{client.medicalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-gym-green" /> Ultimas mediciones</CardTitle>
                <Button size="sm" onClick={() => { play("click"); setMeasureOpen(true) }}>
                  <Plus className="mr-1 h-4 w-4" /> Nueva medicion
                </Button>
              </CardHeader>
              <CardContent>
                {client.bodyMeasurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin mediciones registradas</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b">
                        <th className="text-left py-2 px-1 font-medium text-muted-foreground text-xs">Fecha</th>
                        <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">Peso</th>
                        <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">% Grasa</th>
                        <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">IMC</th>
                      </tr></thead>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-gym-green" /> Rutinas</CardTitle>
                <Button size="sm" onClick={() => { play("click"); setRoutineOpen(true); fetchRoutines() }}>
                  <Plus className="mr-1 h-4 w-4" /> Asignar rutina
                </Button>
              </CardHeader>
              <CardContent>
                {client.routines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin rutinas asignadas</p>
                ) : (
                  <div className="space-y-2">
                    {client.routines.map((r) => (
                      <Link key={r.id} href={`/routines/${r.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gym-green/10"><Dumbbell className="h-5 w-5 text-gym-green" /></div>
                        <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.exercises.length} ejercicios</p></div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-gym-violet" /> Ultimos entrenamientos</CardTitle></CardHeader>
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
                            <span key={s.id} className="inline-flex items-center text-[10px] bg-muted px-1.5 py-0.5 rounded">{s.exerciseName}: {s.reps}x{s.weight}kg</span>
                          ))}
                          {log.sets.length > 5 && <span className="text-[10px] text-muted-foreground">+{log.sets.length - 5} mas</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={measureOpen} onOpenChange={setMeasureOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nueva medicion para {client.name}</DialogTitle><DialogDescription>Registra peso, % grasa y altura.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label htmlFor="mWeight">Peso (kg)</Label><Input id="mWeight" type="number" step="0.1" value={measureForm.weight} onChange={(e) => setMeasureForm((p) => ({ ...p, weight: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="mBodyFat">% Grasa</Label><Input id="mBodyFat" type="number" step="0.1" value={measureForm.bodyFat} onChange={(e) => setMeasureForm((p) => ({ ...p, bodyFat: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="mHeight">Altura (cm)</Label><Input id="mHeight" type="number" step="0.1" value={measureForm.height} onChange={(e) => setMeasureForm((p) => ({ ...p, height: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="mNotes">Notas</Label><Input id="mNotes" value={measureForm.notes} onChange={(e) => setMeasureForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMeasureOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddMeasurement} disabled={measureSaving}>{measureSaving ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={routineOpen} onOpenChange={setRoutineOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Asignar rutina a {client.name}</DialogTitle><DialogDescription>Selecciona una de tus rutinas para asignar.</DialogDescription></DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {routineLoading ? <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p> : availableRoutines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tienes rutinas disponibles para asignar</p>
              ) : availableRoutines.map((r) => (
                <Button key={r.id} variant="outline" className="w-full justify-start" onClick={() => assignRoutine(r.id)}>
                  <Dumbbell className="mr-2 h-4 w-4" /> {r.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
