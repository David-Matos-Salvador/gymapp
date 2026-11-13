"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppShell } from "@/components/layout/shell"
import { useSound } from "@/hooks/use-sound"
import {
  User,
  Phone,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  Dumbbell,
  TrendingUp,
  CheckCircle,
  Plus,
  Pencil,
  ArrowLeft,
  RefreshCw,
  UserMinus,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { pluralize } from "@/lib/utils"
import { measurementFormError } from "@/constants/measurements"
import {
  OBJECTIVE_LABELS,
  EXPERIENCE_LABELS,
  calculateAge,
  formatMuscleGroups,
} from "@/constants/user"

interface BodyMeasurement {
  id: string
  date: string
  weight: number | null
  height: number | null
  bodyFat: number | null
  muscleMass: number | null
  bmi: number | null
  neck: number | null
  shoulders: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  leftArm: number | null
  rightArm: number | null
  leftForearm: number | null
  rightForearm: number | null
  leftThigh: number | null
  rightThigh: number | null
  leftCalf: number | null
  rightCalf: number | null
  notes: string | null
}
interface PlanAssignment {
  id: string
  plan: {
    id: string
    name: string
    splits: {
      id: string
      label: string
      name: string
      muscleGroups: string[]
      exercises: { exercise: { name: string } }[]
    }[]
  }
}
interface WorkoutLogData {
  id: string
  splitId: string | null
  date: string
  duration: number | null
  sets: { id: string; exerciseName: string; reps: number; weight: number }[]
}
interface ClientData {
  id: string
  name: string | null
  email: string
  phone: string | null
  birthDate: string | null
  objective: string | null
  experienceLevel: string | null
  medicalNotes: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  onboardingCompleted: boolean
  bodyMeasurements: BodyMeasurement[]
  assignedRoutinePlans: PlanAssignment[]
  workoutLogs: WorkoutLogData[]
  memberShips: {
    status: string
    endDate: string
    paymentConfirmed: boolean
    plan: { name: string } | null
  }[]
}

export default function CoachClientDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { play } = useSound()
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [measureOpen, setMeasureOpen] = useState(false)
  const [routineOpen, setRoutineOpen] = useState(false)
  const [unassigning, setUnassigning] = useState(false)
  const [measureForm, setMeasureForm] = useState({
    weight: "",
    height: "",
    bodyFat: "",
    muscleMass: "",
    neck: "",
    shoulders: "",
    chest: "",
    waist: "",
    hips: "",
    leftArm: "",
    rightArm: "",
    leftForearm: "",
    rightForearm: "",
    leftThigh: "",
    rightThigh: "",
    leftCalf: "",
    rightCalf: "",
    notes: "",
  })
  const [measureSaving, setMeasureSaving] = useState(false)
  const [availableRoutines, setAvailableRoutines] = useState<{ id: string; name: string }[]>([])
  const [routineLoading, setRoutineLoading] = useState(false)

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/trainer/clients/${id}`)
        const data = await res.json()
        if (data.client) {
          setClient(data.client)
        } else {
          toast.error("Cliente no encontrado")
          router.push("/coach/clients")
        }
      } catch {
        toast.error("Error al cargar cliente")
        router.push("/coach/clients")
      }
      setLoading(false)
    }
    fetchClient()
  }, [id, router])

  const age = calculateAge(client?.birthDate ?? null)
  const currentMembership = client?.memberShips[0]
  const isMembershipActive =
    currentMembership?.status === "ACTIVE" &&
    new Date(currentMembership.endDate) > new Date() &&
    currentMembership.paymentConfirmed

  const activeAssignment = client?.assignedRoutinePlans[0]
  const activePlan = activeAssignment?.plan

  async function handleUnassign() {
    if (!window.confirm("¿Desasignar este cliente? Podrá solicitar otro entrenador.")) return
    setUnassigning(true)
    try {
      const res = await fetch(`/api/trainer/clients/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Error al desasignar")
        return
      }
      toast.success("Cliente desasignado")
      router.push("/coach/clients")
      router.refresh()
    } finally {
      setUnassigning(false)
    }
  }

  async function handleAddMeasurement() {
    if (!measureForm.weight.trim() && !measureForm.bodyFat.trim()) {
      toast.error("Agrega al menos peso o % de grasa")
      return
    }
    const rangeError = measurementFormError(measureForm)
    if (rangeError) {
      toast.error(rangeError)
      return
    }
    setMeasureSaving(true)
    const p = (k: string) =>
      measureForm[k as keyof typeof measureForm].trim()
        ? parseFloat(measureForm[k as keyof typeof measureForm])
        : undefined
    const weight = p("weight") as number | undefined
    const height = p("height") as number | undefined
    const body: Record<string, unknown> = { userId: client!.id, date: new Date().toISOString() }
    if (weight != null) body.weight = weight
    if (height != null) body.height = height
    if (p("bodyFat")) body.bodyFat = p("bodyFat")
    if (p("muscleMass")) body.muscleMass = p("muscleMass")
    if (weight != null && height != null)
      body.bmi = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1))
    const circumferenceFields = [
      "neck",
      "shoulders",
      "chest",
      "waist",
      "hips",
      "leftArm",
      "rightArm",
      "leftForearm",
      "rightForearm",
      "leftThigh",
      "rightThigh",
      "leftCalf",
      "rightCalf",
    ]
    circumferenceFields.forEach((k) => {
      const v = p(k)
      if (v != null) body[k] = v
    })
    if (measureForm.notes.trim()) body.notes = measureForm.notes

    try {
      const res = await fetch("/api/body-measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        play("success")
        toast.success("Medición registrada")
        setMeasureOpen(false)
        setMeasureForm({
          weight: "",
          height: "",
          bodyFat: "",
          muscleMass: "",
          neck: "",
          shoulders: "",
          chest: "",
          waist: "",
          hips: "",
          leftArm: "",
          rightArm: "",
          leftForearm: "",
          rightForearm: "",
          leftThigh: "",
          rightThigh: "",
          leftCalf: "",
          rightCalf: "",
          notes: "",
        })
        router.refresh()
      } else {
        toast.error("Error al guardar medición")
      }
    } catch {
      toast.error("Error de conexión")
    }
    setMeasureSaving(false)
  }

  async function fetchRoutines() {
    setRoutineLoading(true)
    try {
      const res = await fetch("/api/routines")
      const data = await res.json()
      const plans = data.plans || []
      setAvailableRoutines(
        plans.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
      )
    } catch {
      toast.error("Error al cargar rutinas")
    }
    setRoutineLoading(false)
  }

  async function assignRoutine(planId: string) {
    try {
      const res = await fetch("/api/routines/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, assignToUserId: client!.id }),
      })
      if (res.ok) {
        play("success")
        toast.success(activePlan ? "Rutina cambiada" : "Rutina asignada")
        setRoutineOpen(false)
        // Re-fetch client data instead of router.refresh()
        const clientRes = await fetch(`/api/trainer/clients/${id}`)
        const clientData = await clientRes.json()
        if (clientData.client) setClient(clientData.client)
      } else {
        toast.error("Error al asignar rutina")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl space-y-6">
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Cargando cliente...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!client) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl space-y-6">
          <Link
            href="/coach/clients"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Volver a clientes
          </Link>
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Cliente no encontrado</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl space-y-6">
        <Link
          href="/coach/clients"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Volver a clientes
        </Link>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent-yellow" /> Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-yellow/10 text-accent-yellow text-xl font-bold">
                {(client.name ?? client.email)[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-lg">{client.name || "Sin nombre"}</p>
                <p className="text-sm text-muted-foreground">{client.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isMembershipActive ? (
                  <span className="inline-flex items-center gap-1 text-xs text-accent-yellow bg-accent-yellow/10 rounded-full px-2 py-0.5">
                    <CheckCircle className="h-3 w-3" /> Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                    Sin membresía activa
                  </span>
                )}
                {!client.onboardingCompleted && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    <AlertTriangle className="h-3 w-3" /> Pendiente de onboarding
                  </span>
                )}
                {currentMembership?.plan && (
                  <span className="text-xs text-muted-foreground">
                    {currentMembership.plan.name}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm pt-2">
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{client.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{age ?? "Edad no registrada"}</span>
                </div>
                {client.objective && (
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <span>{OBJECTIVE_LABELS[client.objective] || client.objective}</span>
                  </div>
                )}
                {client.experienceLevel && (
                  <div className="flex items-center gap-2">
                    <Award className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {EXPERIENCE_LABELS[client.experienceLevel] || client.experienceLevel}
                    </span>
                  </div>
                )}
              </div>
              {client.medicalNotes && (
                <div className="rounded-lg bg-accent-yellow/10 p-3 mt-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="h-3 w-3 text-accent-yellow" />
                    <span className="font-medium text-accent-yellow">Notas médicas</span>
                  </div>
                  <p className="text-xs mt-1">{client.medicalNotes}</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full text-destructive hover:text-destructive"
                onClick={handleUnassign}
                disabled={unassigning}
              >
                <UserMinus className="mr-1 h-4 w-4" />
                {unassigning ? "Desasignando..." : "Desasignar cliente"}
              </Button>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent-yellow" /> Últimas mediciones
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    play("click")
                    setMeasureOpen(true)
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Nueva medición
                </Button>
              </CardHeader>
              <CardContent>
                {client.bodyMeasurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin mediciones registradas
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-1 font-medium text-muted-foreground text-xs">
                            Fecha
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">
                            Peso
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">
                            Altura
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">
                            % Grasa
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">
                            Masa musc.
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">
                            IMC
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">
                            Pe.
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">
                            Ci.
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground text-xs">
                            Ca.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {client.bodyMeasurements.map((m) => (
                          <tr key={m.id} className="border-b last:border-0">
                            <td className="py-1.5 px-1 text-xs">
                              {new Date(m.date).toLocaleDateString("es")}
                            </td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.weight ?? "-"}</td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.height ?? "-"}</td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.bodyFat ?? "-"}</td>
                            <td className="py-1.5 px-1 text-right text-xs">
                              {m.muscleMass ?? "-"}
                            </td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.bmi ?? "-"}</td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.chest ?? "-"}</td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.waist ?? "-"}</td>
                            <td className="py-1.5 px-1 text-right text-xs">{m.hips ?? "-"}</td>
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
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-accent-yellow" /> Rutinas
                </CardTitle>
                {activePlan ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => {
                        play("click")
                        router.push(`/coach/clients/${id}/personalize?planId=${activePlan!.id}`)
                      }}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Personalizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        play("click")
                        setRoutineOpen(true)
                        fetchRoutines()
                      }}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" /> Cambiar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      play("click")
                      setRoutineOpen(true)
                      fetchRoutines()
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Asignar rutina
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!activePlan ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin rutinas asignadas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activePlan.splits.map((s) => (
                      <Link
                        key={s.id}
                        href={`/routines/${activePlan.id}`}
                        className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-yellow/10 text-accent-yellow font-bold text-sm">
                          {s.label}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pluralize(s.exercises.length, "ejercicio", "ejercicios")} ·{" "}
                            {formatMuscleGroups(s.muscleGroups)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent-yellow" /> Últimos entrenamientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.workoutLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin entrenamientos registrados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {client.workoutLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {log.splitId ? "Entrenamiento con rutina" : "Entrenamiento libre"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.date).toLocaleDateString("es")}
                          </span>
                        </div>
                        {log.duration && (
                          <p className="text-xs text-muted-foreground">{log.duration} min</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {log.sets.slice(0, 5).map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center text-[10px] bg-muted px-1.5 py-0.5 rounded"
                            >
                              {s.exerciseName}: {s.reps}x{s.weight}kg
                            </span>
                          ))}
                          {log.sets.length > 5 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{log.sets.length - 5} más
                            </span>
                          )}
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
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva medición para {client.name}</DialogTitle>
              <DialogDescription>Registra las medidas corporales del cliente.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mWeight">Peso (kg)</Label>
                <Input
                  id="mWeight"
                  type="number"
                  step="0.1"
                  value={measureForm.weight}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, weight: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mHeight">Altura (cm)</Label>
                <Input
                  id="mHeight"
                  type="number"
                  step="0.1"
                  value={measureForm.height}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, height: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mBodyFat">% Grasa</Label>
                <Input
                  id="mBodyFat"
                  type="number"
                  step="0.1"
                  value={measureForm.bodyFat}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, bodyFat: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mMuscleMass">Masa muscular (kg)</Label>
                <Input
                  id="mMuscleMass"
                  type="number"
                  step="0.1"
                  value={measureForm.muscleMass}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, muscleMass: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mNeck">Cuello (cm)</Label>
                <Input
                  id="mNeck"
                  type="number"
                  step="0.1"
                  value={measureForm.neck}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, neck: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mShoulders">Hombros (cm)</Label>
                <Input
                  id="mShoulders"
                  type="number"
                  step="0.1"
                  value={measureForm.shoulders}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, shoulders: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mChest">Pecho (cm)</Label>
                <Input
                  id="mChest"
                  type="number"
                  step="0.1"
                  value={measureForm.chest}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, chest: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mWaist">Cintura (cm)</Label>
                <Input
                  id="mWaist"
                  type="number"
                  step="0.1"
                  value={measureForm.waist}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, waist: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mHips">Cadera (cm)</Label>
                <Input
                  id="mHips"
                  type="number"
                  step="0.1"
                  value={measureForm.hips}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, hips: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mLeftArm">Bíceps izq. (cm)</Label>
                <Input
                  id="mLeftArm"
                  type="number"
                  step="0.1"
                  value={measureForm.leftArm}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, leftArm: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mRightArm">Bíceps der. (cm)</Label>
                <Input
                  id="mRightArm"
                  type="number"
                  step="0.1"
                  value={measureForm.rightArm}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, rightArm: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mLeftForearm">Antebrazo izq. (cm)</Label>
                <Input
                  id="mLeftForearm"
                  type="number"
                  step="0.1"
                  value={measureForm.leftForearm}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, leftForearm: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mRightForearm">Antebrazo der. (cm)</Label>
                <Input
                  id="mRightForearm"
                  type="number"
                  step="0.1"
                  value={measureForm.rightForearm}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, rightForearm: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mLeftThigh">Muslo izq. (cm)</Label>
                <Input
                  id="mLeftThigh"
                  type="number"
                  step="0.1"
                  value={measureForm.leftThigh}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, leftThigh: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mRightThigh">Muslo der. (cm)</Label>
                <Input
                  id="mRightThigh"
                  type="number"
                  step="0.1"
                  value={measureForm.rightThigh}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, rightThigh: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mLeftCalf">Pantorrilla izq. (cm)</Label>
                <Input
                  id="mLeftCalf"
                  type="number"
                  step="0.1"
                  value={measureForm.leftCalf}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, leftCalf: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mRightCalf">Pantorrilla der. (cm)</Label>
                <Input
                  id="mRightCalf"
                  type="number"
                  step="0.1"
                  value={measureForm.rightCalf}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, rightCalf: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="mNotes">Notas</Label>
                <Input
                  id="mNotes"
                  value={measureForm.notes}
                  onChange={(e) => setMeasureForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMeasureOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMeasurement} disabled={measureSaving}>
                {measureSaving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={routineOpen} onOpenChange={setRoutineOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {activePlan ? "Cambiar" : "Asignar"} rutina {activePlan ? "de" : "a"} {client.name}
              </DialogTitle>
              <DialogDescription>
                Selecciona una de tus rutinas para {activePlan ? "reasignar" : "asignar"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {routineLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
              ) : availableRoutines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tienes rutinas disponibles para asignar
                </p>
              ) : (
                availableRoutines.map((r) => (
                  <Button
                    key={r.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => assignRoutine(r.id)}
                  >
                    <Dumbbell className="mr-2 h-4 w-4" /> {r.name}
                  </Button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
