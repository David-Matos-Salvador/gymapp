"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSound } from "@/hooks/use-sound"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Plus, ArrowLeft, Save, Clock, FileText, Dumbbell, Play } from "lucide-react"
import { ExerciseAnimation } from "@/components/exercise-animation"
import { toast } from "sonner"

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "Bíceps",
  TRICEPS: "Tríceps", LEGS: "Piernas", GLUTES: "Glúteos", ABS: "Abdomen",
  CALVES: "Gemelos", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

interface Exercise { id: string; name: string; muscleGroup: string; equipment: string }
interface RoutineExercise { id: string; exerciseId: string; sets: number; reps: number; weight: number; restSeconds: number; order: number; exercise: Exercise }
interface Routine { id: string; name: string; description: string | null; exercises: RoutineExercise[] }
interface SetLog { exerciseId: string; exerciseName: string; setNumber: number; reps: number; weight: number; completed: boolean }

export default function LogWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const { play } = useSound()
  const routineId = params.routineId as string

  const [routine, setRoutine] = useState<Routine | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [duration, setDuration] = useState("")
  const [notes, setNotes] = useState("")
  const [setsData, setSetsData] = useState<Record<string, SetLog[]>>({})

  useEffect(() => {
    fetch(`/api/routines/${routineId}`)
      .then((r) => r.json())
      .then((data) => {
        const r = data.routine
        setRoutine(r)
        const initialSets: Record<string, SetLog[]> = {}
        r.exercises.forEach((re: RoutineExercise) => {
          initialSets[re.exerciseId] = Array.from({ length: re.sets }, (_, i) => ({
            exerciseId: re.exerciseId, exerciseName: re.exercise.name,
            setNumber: i + 1, reps: re.reps, weight: re.weight, completed: true,
          }))
        })
        setSetsData(initialSets)
        setLoading(false)
      })
      .catch(() => { toast.error("Error al cargar la rutina"); setLoading(false) })
  }, [routineId])

  function updateSet(exerciseId: string, setIdx: number, field: keyof SetLog, value: number | boolean) {
    setSetsData((prev) => ({
      ...prev, [exerciseId]: prev[exerciseId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s),
    }))
  }

  function addSet(exerciseId: string, exercise: Exercise) {
    play("select")
    setSetsData((prev) => {
      const current = prev[exerciseId] ?? []
      return {
        ...prev, [exerciseId]: [...current, {
          exerciseId, exerciseName: exercise.name,
          setNumber: current.length + 1,
          reps: current.length > 0 ? current[current.length - 1].reps : 10,
          weight: current.length > 0 ? current[current.length - 1].weight : 0,
          completed: true,
        }],
      }
    })
  }

  function removeSet(exerciseId: string, setIdx: number) {
    play("delete")
    setSetsData((prev) => ({
      ...prev, [exerciseId]: prev[exerciseId].filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, setNumber: i + 1 })),
    }))
  }

  async function handleSubmit() {
    const allSets = Object.values(setsData).flat().filter((s) => s.reps > 0)
    if (allSets.length === 0) { toast.error("Completa al menos una serie con repeticiones"); return }
    setSaving(true)
    const body = {
      routineId, duration: duration ? parseInt(duration, 10) : undefined,
      notes: notes.trim() || undefined,
      sets: allSets.map((s) => ({
        exerciseId: s.exerciseId, exerciseName: s.exerciseName,
        setNumber: s.setNumber, reps: s.reps, weight: s.weight, completed: s.completed,
      })),
    }
    const res = await fetch("/api/workout-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) {
      play("success")
      toast.success("Entrenamiento registrado")
      router.push("/rutina")
      router.refresh()
    } else {
      const err = await res.json()
      toast.error(err.error || "Error al guardar")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!routine) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl text-center">
          <p className="text-muted-foreground py-12">Rutina no encontrada</p>
          <Button variant="outline" onClick={() => router.back()}>Volver</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <button onClick={() => { play("click"); router.back() }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-gym-green" /> {routine.name}
          </h1>
          {routine.description && <p className="text-muted-foreground mt-1">{routine.description}</p>}
        </div>

        <Card>
          <CardHeader><CardTitle>Información del entrenamiento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Duración (minutos)
              </Label>
              <Input id="duration" type="number" min={1} placeholder="45" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Notas
              </Label>
              <textarea id="notes" rows={3} placeholder="Notas sobre el entrenamiento..." value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30 resize-none" />
            </div>
          </CardContent>
        </Card>

        {routine.exercises.map((re) => {
          const exerciseSets = setsData[re.exerciseId] ?? []
          const completedCount = exerciseSets.filter((s) => s.completed).length
          return (
            <Card key={re.exerciseId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span>{re.exercise.name}</span>
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {MUSCLE_GROUP_LABELS[re.exercise.muscleGroup] ?? re.exercise.muscleGroup}
                    </span>
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">{completedCount}/{exerciseSets.length} series</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr_40px_32px] gap-2 text-[10px] text-muted-foreground px-1">
                  <span>Set</span><span>Reps</span><span>Peso (kg)</span><span /><span />
                </div>
                {exerciseSets.map((set, idx) => (
                  <div key={`${re.exerciseId}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[40px_1fr_1fr_40px_32px] gap-2 items-center">
                    <span className="text-xs text-muted-foreground text-center hidden sm:inline">{set.setNumber}</span>
                    <Input type="number" min={0} value={set.reps} onChange={(e) => updateSet(re.exerciseId, idx, "reps", Number(e.target.value))} className="h-8 text-sm" placeholder="Reps" />
                    <Input type="number" min={0} step={2.5} value={set.weight} onChange={(e) => updateSet(re.exerciseId, idx, "weight", Number(e.target.value))} className="h-8 text-sm" placeholder="kg" />
                    <button type="button" onClick={() => { play("toggle"); updateSet(re.exerciseId, idx, "completed", !set.completed) }}
                      className={set.completed ? "h-8 w-8 flex items-center justify-center rounded-lg border bg-gym-green/10 border-gym-green text-gym-green transition-colors" : "h-8 w-8 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:border-foreground/30 transition-colors"}>
                      {set.completed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => removeSet(re.exerciseId, idx)}
                      className="h-8 w-8 hidden sm:flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => addSet(re.exerciseId, re.exercise)}>
                  <Plus className="h-4 w-4" /> Añadir set
                </Button>
              </CardContent>
            </Card>
          )
        })}

        <div className="flex gap-3 justify-end pb-4">
          <Button variant="outline" onClick={() => { play("click"); router.back() }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Finalizar entrenamiento"}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
