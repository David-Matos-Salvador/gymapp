"use client"

import { pluralize } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Users, UserPlus } from "lucide-react"
import { MUSCLE_LABELS, DIFFICULTIES } from "@/constants/user"
import type { Exercise } from "./exercise-management"

export interface SplitExercise {
  id: string
  exerciseId: string
  sets: number
  reps: string
  weight: number
  restSeconds: number
  order: number
  notes: string | null
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
  order: number
  exercises: SplitExercise[]
}

export interface Plan {
  id: string
  userId: string
  name: string
  description: string | null
  objective: string | null
  frequency: number | null
  difficulty: string | null
  createdAt: string
  updatedAt: string
  splits: Split[]
  user: { id: string; name: string | null; email: string; role?: string }
}

export interface Member {
  id: string
  name: string | null
  email: string
}

const OBJECTIVES = [
  { value: "WEIGHT_LOSS", label: "Pérdida de peso" },
  { value: "MUSCLE_GAIN", label: "Ganancia muscular" },
  { value: "GENERAL_FITNESS", label: "Acondicionamiento general" },
]

const FREQUENCIES = [
  { value: "3", label: "3 días" },
  { value: "4", label: "4 días" },
  { value: "5", label: "5 días" },
]

interface RoutineManagementProps {
  plans: Plan[]
  exercises: Exercise[]
  members: Member[]
  canEditPlan: (plan: Plan) => boolean
  onPlansChange: (plans: Plan[]) => void
}

export function RoutineManagement({
  plans,
  exercises,
  members,
  canEditPlan,
  onPlansChange,
}: RoutineManagementProps) {
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const [expandedSplits, setExpandedSplits] = useState<Set<string>>(new Set())

  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    objective: "",
    frequency: "",
    difficulty: "",
  })
  const [planSaving, setPlanSaving] = useState(false)

  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [editingSplitId, setEditingSplitId] = useState<string | null>(null)
  const [splitForm, setSplitForm] = useState({
    planId: "",
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
  const [exerciseConfig, setExerciseConfig] = useState({
    sets: 3,
    reps: "10",
    weight: 0,
    restSeconds: 60,
  })

  const [deletePlanConfirm, setDeletePlanConfirm] = useState<string | null>(null)
  const [deleteSplitConfirm, setDeleteSplitConfirm] = useState<string | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState<string | null>(null)
  const [assignMemberId, setAssignMemberId] = useState("")

  function togglePlan(id: string) {
    setExpandedPlans((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSplit(id: string) {
    setExpandedSplits((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openCreatePlan() {
    setEditingPlanId(null)
    setPlanForm({ name: "", description: "", objective: "", frequency: "", difficulty: "" })
    setPlanDialogOpen(true)
  }

  function openEditPlan(plan: Plan) {
    setEditingPlanId(plan.id)
    setPlanForm({
      name: plan.name,
      description: plan.description ?? "",
      objective: plan.objective ?? "",
      frequency: plan.frequency ? String(plan.frequency) : "",
      difficulty: plan.difficulty ?? "",
    })
    setPlanDialogOpen(true)
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

      if (editingPlanId) {
        const res = await fetch(`/api/routines/${editingPlanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        onPlansChange(plans.map((p) => (p.id === editingPlanId ? { ...p, ...data.plan } : p)))
        toast.success("Rutina actualizada")
      } else {
        const res = await fetch("/api/routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        onPlansChange([data.plan, ...plans])
        toast.success("Rutina creada")
      }
      setPlanDialogOpen(false)
    } catch {
      toast.error("Error al guardar")
    } finally {
      setPlanSaving(false)
    }
  }

  async function handleDeletePlan(id: string) {
    try {
      const res = await fetch(`/api/routines/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onPlansChange(plans.filter((p) => p.id !== id))
      toast.success("Rutina eliminada")
      setDeletePlanConfirm(null)
    } catch {
      toast.error("Error al eliminar")
    }
  }

  function openCreateSplit(planId: string) {
    setEditingSplitId(null)
    setSplitForm({
      planId,
      label: "",
      name: "",
      description: "",
      difficulty: "",
      estimatedDuration: "",
      muscleGroups: "",
    })
    setSplitDialogOpen(true)
  }

  function openEditSplit(split: Split) {
    setEditingSplitId(split.id)
    setSplitForm({
      planId: "",
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
        planId: splitForm.planId,
        label: splitForm.label.trim(),
        name: splitForm.name.trim(),
        description: splitForm.description.trim() || null,
        difficulty: splitForm.difficulty || null,
        estimatedDuration: splitForm.estimatedDuration ? Number(splitForm.estimatedDuration) : null,
        muscleGroups: splitForm.muscleGroups
          ? splitForm.muscleGroups
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      }

      if (editingSplitId) {
        const res = await fetch(`/api/routine-splits/${editingSplitId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        onPlansChange(
          plans.map((p) => ({
            ...p,
            splits: p.splits.map((s) => (s.id === editingSplitId ? { ...s, ...data.split } : s)),
          }))
        )
        toast.success("Split actualizado")
      } else {
        const res = await fetch("/api/routine-splits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        onPlansChange(
          plans.map((p) =>
            p.id === splitForm.planId ? { ...p, splits: [...p.splits, data.split] } : p
          )
        )
        toast.success("Split creado")
      }
      setSplitDialogOpen(false)
    } catch {
      toast.error("Error al guardar split")
    } finally {
      setSplitSaving(false)
    }
  }

  async function handleDeleteSplit(id: string) {
    try {
      const res = await fetch(`/api/routine-splits/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onPlansChange(
        plans.map((p) => ({
          ...p,
          splits: p.splits.filter((s) => s.id !== id),
        }))
      )
      toast.success("Split eliminado")
      setDeleteSplitConfirm(null)
    } catch {
      toast.error("Error al eliminar")
    }
  }

  function openAddExercise(splitId: string) {
    setAddExerciseSplitId(splitId)
    setSelectedExerciseId("")
    setExerciseConfig({ sets: 3, reps: "10", weight: 0, restSeconds: 60 })
    setAddExerciseOpen(true)
  }

  async function handleAddExercise() {
    if (!selectedExerciseId || !addExerciseSplitId) {
      toast.error("Selecciona un ejercicio")
      return
    }
    try {
      const body = {
        splitId: addExerciseSplitId,
        exerciseId: selectedExerciseId,
        sets: exerciseConfig.sets,
        reps: String(exerciseConfig.reps),
        weight: exerciseConfig.weight,
        restSeconds: exerciseConfig.restSeconds,
      }
      const res = await fetch("/api/split-exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onPlansChange(
        plans.map((p) => ({
          ...p,
          splits: p.splits.map((s) =>
            s.id === addExerciseSplitId
              ? { ...s, exercises: [...s.exercises, data.splitExercise] }
              : s
          ),
        }))
      )
      toast.success("Ejercicio agregado")
      setAddExerciseOpen(false)
    } catch {
      toast.error("Error al agregar ejercicio")
    }
  }

  async function handleRemoveExercise(id: string) {
    try {
      const res = await fetch(`/api/split-exercises/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onPlansChange(
        plans.map((p) => ({
          ...p,
          splits: p.splits.map((s) => ({
            ...s,
            exercises: s.exercises.filter((e) => e.id !== id),
          })),
        }))
      )
      toast.success("Ejercicio removido")
    } catch {
      toast.error("Error al remover ejercicio")
    }
  }

  async function handleAssign() {
    if (!assignDialogOpen || !assignMemberId) return
    try {
      const res = await fetch("/api/routines/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: assignDialogOpen, assignToUserId: assignMemberId }),
      })
      if (!res.ok) throw new Error()
      toast.success("Rutina asignada")
      setAssignDialogOpen(null)
      setAssignMemberId("")
    } catch {
      toast.error("Error al asignar")
    }
  }

  const availableExercises = exercises.filter(
    (ex) =>
      !plans.some((p) =>
        p.splits.some(
          (s) => s.id === addExerciseSplitId && s.exercises.some((e) => e.exerciseId === ex.id)
        )
      )
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {plans.length} rutina{plans.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreatePlan} size="sm" className="gap-2">
          <Plus className="size-4" />
          Nueva rutina
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
          <Users className="size-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay rutinas. Crea la primera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="border rounded-xl overflow-hidden">
              <button
                onClick={() => togglePlan(plan.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
              >
                {expandedPlans.has(plan.id) ? (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{plan.name}</span>
                    {plan.objective && (
                      <Badge variant="secondary" className="text-xs">
                        {OBJECTIVES.find((o) => o.value === plan.objective)?.label ??
                          plan.objective}
                      </Badge>
                    )}
                    {plan.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        {DIFFICULTIES.find((d) => d.value === plan.difficulty)?.label ??
                          plan.difficulty}
                      </Badge>
                    )}
                    {plan.frequency && (
                      <Badge variant="outline" className="text-xs">
                        {plan.frequency} días
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan.splits.length} split{plan.splits.length !== 1 ? "s" : ""}
                    {plan.user.name && ` · Creado por ${plan.user.name}`}
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setAssignDialogOpen(plan.id)}
                  >
                    <UserPlus className="size-4" />
                  </Button>
                  {canEditPlan(plan) ? (
                    <>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditPlan(plan)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletePlanConfirm(plan.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Sistema
                    </Badge>
                  )}
                </div>
              </button>

              {expandedPlans.has(plan.id) && (
                <div className="border-t">
                  {plan.description && (
                    <p className="text-sm text-muted-foreground px-4 pt-3">{plan.description}</p>
                  )}
                  <div className="p-3 space-y-2">
                    {plan.splits.map((split) => (
                      <div key={split.id} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSplit(split.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
                        >
                          {expandedSplits.has(split.id) ? (
                            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">
                            {split.label} — {split.name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {pluralize(split.exercises.length, "ejercicio", "ejercicios")}
                          </span>
                          <div
                            className="flex items-center gap-0.5 shrink-0 ml-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canEditPlan(plan) ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7"
                                  onClick={() => openEditSplit(split)}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteSplitConfirm(split.id)}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </button>

                        {expandedSplits.has(split.id) && (
                          <div className="border-t">
                            {split.muscleGroups.length > 0 && (
                              <div className="px-3 py-2 flex items-center gap-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">Músculos:</span>
                                {split.muscleGroups.map((mg) => (
                                  <Badge key={mg} variant="secondary" className="text-[10px]">
                                    {MUSCLE_LABELS[mg] ?? mg}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="divide-y">
                              {split.exercises.map((se) => (
                                <div
                                  key={se.id}
                                  className="flex items-center gap-2 px-3 py-2 text-sm"
                                >
                                  <span className="flex-1 truncate">{se.exercise.name}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {se.sets}x{se.reps}
                                    {se.weight > 0 ? ` @ ${se.weight}kg` : ""}
                                    {se.restSeconds > 0 ? ` · ${se.restSeconds}s` : ""}
                                  </span>
                                  {canEditPlan(plan) && (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="size-7 text-destructive hover:text-destructive shrink-0"
                                      onClick={() => handleRemoveExercise(se.id)}
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {canEditPlan(plan) && (
                              <div className="px-3 py-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs gap-1"
                                  onClick={() => openAddExercise(split.id)}
                                >
                                  <Plus className="size-3" />
                                  Agregar ejercicio
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {canEditPlan(plan) && (
                    <div className="px-4 pb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => openCreateSplit(plan.id)}
                      >
                        <Plus className="size-3" />
                        Agregar split
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlanId ? "Editar rutina" : "Nueva rutina"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Rutina de fuerza"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={planForm.description}
                onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select
                  value={planForm.objective || "__none__"}
                  onValueChange={(v) =>
                    setPlanForm((p) => ({ ...p, objective: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguno</SelectItem>
                    {OBJECTIVES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificultad</Label>
                <Select
                  value={planForm.difficulty || "__none__"}
                  onValueChange={(v) =>
                    setPlanForm((p) => ({ ...p, difficulty: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguno</SelectItem>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select
                value={planForm.frequency || "__none__"}
                onValueChange={(v) =>
                  setPlanForm((p) => ({ ...p, frequency: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguno</SelectItem>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleSavePlan} disabled={planSaving}>
              {planSaving ? "Guardando..." : editingPlanId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSplitId ? "Editar split" : "Nuevo split"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  value={splitForm.label}
                  onChange={(e) => setSplitForm((s) => ({ ...s, label: e.target.value }))}
                  placeholder="A"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={splitForm.name}
                  onChange={(e) => setSplitForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Día de pecho"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={splitForm.description}
                onChange={(e) => setSplitForm((s) => ({ ...s, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Grupos musculares (separados por coma)</Label>
              <Input
                value={splitForm.muscleGroups}
                onChange={(e) => setSplitForm((s) => ({ ...s, muscleGroups: e.target.value }))}
                placeholder="CHEST, SHOULDERS, TRICEPS"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dificultad</Label>
                <Select
                  value={splitForm.difficulty || "__none__"}
                  onValueChange={(v) =>
                    setSplitForm((s) => ({ ...s, difficulty: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguno</SelectItem>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleSaveSplit} disabled={splitSaving}>
              {splitSaving ? "Guardando..." : editingSplitId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addExerciseOpen} onOpenChange={setAddExerciseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar ejercicio al split</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ejercicio</Label>
              <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ejercicio" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {availableExercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name} ({MUSCLE_LABELS[ex.muscleGroup] ?? ex.muscleGroup})
                    </SelectItem>
                  ))}
                  {availableExercises.length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No hay ejercicios disponibles
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Series</Label>
                <Input
                  type="number"
                  value={exerciseConfig.sets}
                  onChange={(e) =>
                    setExerciseConfig((c) => ({ ...c, sets: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Repeticiones</Label>
                <Input
                  value={exerciseConfig.reps}
                  onChange={(e) => setExerciseConfig((c) => ({ ...c, reps: e.target.value }))}
                  placeholder="10-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  value={exerciseConfig.weight}
                  onChange={(e) =>
                    setExerciseConfig((c) => ({ ...c, weight: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Descanso (seg)</Label>
                <Input
                  type="number"
                  value={exerciseConfig.restSeconds}
                  onChange={(e) =>
                    setExerciseConfig((c) => ({ ...c, restSeconds: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleAddExercise}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePlanConfirm} onOpenChange={() => setDeletePlanConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar rutina</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará la rutina y todos sus splits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => deletePlanConfirm && handleDeletePlan(deletePlanConfirm)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSplitConfirm} onOpenChange={() => setDeleteSplitConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar split</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => deleteSplitConfirm && handleDeleteSplit(deleteSplitConfirm)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!assignDialogOpen}
        onOpenChange={() => {
          setAssignDialogOpen(null)
          setAssignMemberId("")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar rutina a miembro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Miembro</Label>
              <Select value={assignMemberId} onValueChange={setAssignMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar miembro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleAssign} disabled={!assignMemberId}>
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
