"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Dumbbell,
} from "lucide-react"

interface Exercise {
  id: string
  name: string
  muscleGroup: string
}

interface SplitExercise {
  id: string
  exerciseId: string
  sets: number
  reps: string
  weight: number
  restSeconds: number
  exercise: Exercise
}

interface Split {
  id: string
  label: string
  name: string
  description: string | null
  muscleGroups: string[]
  estimatedDuration: number | null
  difficulty: string | null
  exercises: SplitExercise[]
}

interface Plan {
  id: string
  name: string
  description: string | null
  objective: string | null
  frequency: number | null
  difficulty: string | null
  splits: Split[]
}

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "Bíceps",
  TRICEPS: "Tríceps", LEGS: "Piernas", GLUTES: "Glúteos", ABS: "Abdominales",
  CALVES: "Pantorrillas", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

const OBJECTIVES = [
  { value: "WEIGHT_LOSS", label: "Pérdida de peso" },
  { value: "MUSCLE_GAIN", label: "Ganancia muscular" },
  { value: "GENERAL_FITNESS", label: "Acondicionamiento general" },
  { value: "TONING", label: "Tonificación" },
  { value: "STRENGTH", label: "Fuerza" },
  { value: "ENDURANCE", label: "Resistencia" },
  { value: "REHABILITATION", label: "Rehabilitación" },
  { value: "COMPETITION", label: "Competición" },
]

const FREQUENCIES = [
  { value: "1", label: "1 día" },
  { value: "2", label: "2 días" },
  { value: "3", label: "3 días" },
  { value: "4", label: "4 días" },
  { value: "5", label: "5 días" },
  { value: "6", label: "6 días" },
  { value: "7", label: "7 días" },
]

const DIFFICULTIES = [
  { value: "BEGINNER", label: "Principiante" },
  { value: "INTERMEDIATE", label: "Intermedio" },
  { value: "ADVANCED", label: "Avanzado" },
  { value: "ELITE", label: "Élite" },
]

interface RoutineEditorDialogProps {
  plan: Plan
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlanUpdated: () => void
  onUnassign?: () => void
}

export function RoutineEditorDialog({
  plan,
  open,
  onOpenChange,
  onPlanUpdated,
  onUnassign,
}: RoutineEditorDialogProps) {
  const [planForm, setPlanForm] = useState({
    name: plan.name,
    description: plan.description ?? "",
    objective: plan.objective ?? "",
    frequency: plan.frequency ? String(plan.frequency) : "",
    difficulty: plan.difficulty ?? "",
  })
  const [planSaving, setPlanSaving] = useState(false)

  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [editingSplitId, setEditingSplitId] = useState<string | null>(null)
  const [splitForm, setSplitForm] = useState({
    label: "",
    name: "",
    description: "",
    difficulty: "",
    estimatedDuration: "",
    muscleGroups: "",
  })
  const [splitSaving, setSplitSaving] = useState(false)

  const [addExerciseOpen, setAddExerciseOpen] = useState(false)
  const [addExerciseSplitId, setAddExerciseSplitId] = useState<string | null>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState("")
  const [exerciseConfig, setExerciseConfig] = useState({ sets: 3, reps: "10", weight: 0, restSeconds: 60 })
  const [exercises, setExercises] = useState<Exercise[]>([])

  const [expandedSplits, setExpandedSplits] = useState<Set<string>>(() => new Set(plan.splits.map((s) => s.id)))

  const [unassignConfirm, setUnassignConfirm] = useState(false)

  async function fetchExercises() {
    try {
      const res = await fetch("/api/exercises")
      const data = await res.json()
      setExercises(data.exercises || [])
    } catch {
      toast.error("Error al cargar ejercicios")
    }
  }

  function toggleSplit(id: string) {
    setExpandedSplits((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSavePlan() {
    if (!planForm.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setPlanSaving(true)
    try {
      const body = {
        name: planForm.name.trim(),
        description: planForm.description.trim() || null,
        objective: planForm.objective || null,
        frequency: planForm.frequency ? Number(planForm.frequency) : null,
        difficulty: planForm.difficulty || null,
      }
      const res = await fetch(`/api/routines/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success("Rutina actualizada")
      onPlanUpdated()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setPlanSaving(false)
    }
  }

  function openCreateSplit() {
    setEditingSplitId(null)
    setSplitForm({ label: "", name: "", description: "", difficulty: "", estimatedDuration: "", muscleGroups: "" })
    setSplitDialogOpen(true)
  }

  function openEditSplit(split: Split) {
    setEditingSplitId(split.id)
    setSplitForm({
      label: split.label,
      name: split.name,
      description: split.description ?? "",
      difficulty: split.difficulty ?? "",
      estimatedDuration: split.estimatedDuration ? String(split.estimatedDuration) : "",
      muscleGroups: split.muscleGroups.join(", "),
    })
    setSplitDialogOpen(true)
  }

  async function handleSaveSplit() {
    if (!splitForm.label.trim() || !splitForm.name.trim()) {
      toast.error("Label y nombre son requeridos")
      return
    }
    setSplitSaving(true)
    try {
      const body = {
        planId: plan.id,
        label: splitForm.label.trim(),
        name: splitForm.name.trim(),
        description: splitForm.description.trim() || null,
        difficulty: splitForm.difficulty || null,
        estimatedDuration: splitForm.estimatedDuration ? Number(splitForm.estimatedDuration) : null,
        muscleGroups: splitForm.muscleGroups
          ? splitForm.muscleGroups.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      }
      if (editingSplitId) {
        const res = await fetch(`/api/routine-splits/${editingSplitId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        toast.success("Día actualizado")
      } else {
        const res = await fetch("/api/routine-splits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        toast.success("Día creado")
      }
      setSplitDialogOpen(false)
      onPlanUpdated()
    } catch {
      toast.error("Error al guardar día")
    } finally {
      setSplitSaving(false)
    }
  }

  async function handleDeleteSplit(id: string) {
    try {
      const res = await fetch(`/api/routine-splits/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Día eliminado")
      onPlanUpdated()
    } catch {
      toast.error("Error al eliminar día")
    }
  }

  function openAddExercise(splitId: string) {
    setAddExerciseSplitId(splitId)
    setSelectedExerciseId("")
    setExerciseConfig({ sets: 3, reps: "10", weight: 0, restSeconds: 60 })
    fetchExercises()
    setAddExerciseOpen(true)
  }

  async function handleAddExercise() {
    if (!selectedExerciseId || !addExerciseSplitId) {
      toast.error("Selecciona un ejercicio")
      return
    }
    try {
      const res = await fetch("/api/split-exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splitId: addExerciseSplitId,
          exerciseId: selectedExerciseId,
          sets: exerciseConfig.sets,
          reps: exerciseConfig.reps,
          weight: exerciseConfig.weight,
          restSeconds: exerciseConfig.restSeconds,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Ejercicio agregado")
      setAddExerciseOpen(false)
      onPlanUpdated()
    } catch {
      toast.error("Error al agregar ejercicio")
    }
  }

  async function handleDeleteExercise(id: string) {
    try {
      const res = await fetch(`/api/split-exercises/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Ejercicio eliminado")
      onPlanUpdated()
    } catch {
      toast.error("Error al eliminar ejercicio")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-accent-yellow" />
              Editar rutina
            </DialogTitle>
            <DialogDescription>Modifica el plan de entrenamiento y sus días.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Plan details */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Datos del plan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rpName">Nombre</Label>
                  <Input id="rpName" value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rpObjective">Objetivo</Label>
                  <Select value={planForm.objective} onValueChange={(v) => setPlanForm((p) => ({ ...p, objective: v }))}>
                    <SelectTrigger id="rpObjective"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rpFrequency">Frecuencia</Label>
                  <Select value={planForm.frequency} onValueChange={(v) => setPlanForm((p) => ({ ...p, frequency: v }))}>
                    <SelectTrigger id="rpFrequency"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rpDifficulty">Dificultad</Label>
                  <Select value={planForm.difficulty} onValueChange={(v) => setPlanForm((p) => ({ ...p, difficulty: v }))}>
                    <SelectTrigger id="rpDifficulty"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpDesc">Descripción</Label>
                <Textarea id="rpDesc" rows={2} value={planForm.description} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <Button variant="outline" size="sm" onClick={handleSavePlan} disabled={planSaving}>
                {planSaving ? "Guardando..." : "Guardar cambios del plan"}
              </Button>
            </div>

            {/* Splits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Días de entrenamiento</h3>
                <Button size="sm" variant="outline" onClick={openCreateSplit}>
                  <Plus className="mr-1 h-3 w-3" /> Agregar día
                </Button>
              </div>

              {plan.splits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin días de entrenamiento</p>
              ) : (
                <div className="space-y-2">
                  {plan.splits.map((split) => (
                    <div key={split.id} className="rounded-lg border">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => toggleSplit(split.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-yellow/10 text-accent-yellow font-bold text-xs">
                            {split.label}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{split.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {split.exercises.length} ejercicios
                              {split.muscleGroups.length > 0 && ` · ${split.muscleGroups.map((g) => MUSCLE_LABELS[g] ?? g).join(", ")}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); openEditSplit(split) }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSplit(split.id) }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {expandedSplits.has(split.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {expandedSplits.has(split.id) && (
                        <div className="border-t px-3 py-2 space-y-1.5">
                          {split.exercises.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">Sin ejercicios</p>
                          ) : (
                            split.exercises.map((se) => (
                              <div key={se.id} className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5 text-xs">
                                <span className="font-medium">{se.exercise.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">
                                    {se.sets}x{se.reps}
                                    {se.weight > 0 ? ` ${se.weight}kg` : ""}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteExercise(se.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => openAddExercise(split.id)}
                          >
                            <Plus className="mr-1 h-3 w-3" /> Agregar ejercicio
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            {onUnassign && (
              <Button variant="destructive" size="sm" onClick={() => setUnassignConfirm(true)}>
                Desasignar rutina
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSplitId ? "Editar día" : "Nuevo día"}</DialogTitle>
            <DialogDescription>Configura el día de entrenamiento.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rsLabel">Label *</Label>
              <Input id="rsLabel" placeholder="Día A" value={splitForm.label} onChange={(e) => setSplitForm((p) => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rsName">Nombre *</Label>
              <Input id="rsName" placeholder="Pecho y Bíceps" value={splitForm.name} onChange={(e) => setSplitForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="rsMuscle">Grupos musculares</Label>
              <Input id="rsMuscle" placeholder="CHEST, BICEPS" value={splitForm.muscleGroups} onChange={(e) => setSplitForm((p) => ({ ...p, muscleGroups: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rsDuration">Duración (min)</Label>
              <Input id="rsDuration" type="number" value={splitForm.estimatedDuration} onChange={(e) => setSplitForm((p) => ({ ...p, estimatedDuration: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rsDifficulty">Dificultad</Label>
              <Select value={splitForm.difficulty} onValueChange={(v) => setSplitForm((p) => ({ ...p, difficulty: v }))}>
                <SelectTrigger id="rsDifficulty"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="rsDesc">Descripción</Label>
              <Textarea id="rsDesc" rows={2} value={splitForm.description} onChange={(e) => setSplitForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSplit} disabled={splitSaving}>{splitSaving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={addExerciseOpen} onOpenChange={setAddExerciseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar ejercicio</DialogTitle>
            <DialogDescription>Selecciona un ejercicio y configura las series.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reExercise">Ejercicio</Label>
              <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                <SelectTrigger id="reExercise"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {exercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reSets">Series</Label>
                <Input id="reSets" type="number" value={exerciseConfig.sets} onChange={(e) => setExerciseConfig((p) => ({ ...p, sets: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reReps">Reps</Label>
                <Input id="reReps" value={exerciseConfig.reps} onChange={(e) => setExerciseConfig((p) => ({ ...p, reps: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reWeight">Peso (kg)</Label>
                <Input id="reWeight" type="number" value={exerciseConfig.weight} onChange={(e) => setExerciseConfig((p) => ({ ...p, weight: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reRest">Descanso (s)</Label>
                <Input id="reRest" type="number" value={exerciseConfig.restSeconds} onChange={(e) => setExerciseConfig((p) => ({ ...p, restSeconds: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExerciseOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddExercise}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Confirm Dialog */}
      <Dialog open={unassignConfirm} onOpenChange={setUnassignConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Desasignar rutina</DialogTitle>
            <DialogDescription>
              ¿Estás seguro? El cliente se quedará sin rutina asignada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnassignConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { setUnassignConfirm(false); onUnassign?.() }}>Desasignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
