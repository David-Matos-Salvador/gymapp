"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSound } from "@/hooks/use-sound"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { toast } from "sonner"

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
}

interface RoutineExercise {
  exerciseId: string
  exercise?: Exercise
  sets: number
  reps: number
  weight: number
  restSeconds: number
  order: number
}

export default function NewRoutinePage() {
  const router = useRouter()
  const { play } = useSound()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [selected, setSelected] = useState<RoutineExercise[]>([])
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => setAllExercises(d.exercises ?? []))
  }, [])

  function addExercise(exercise: Exercise) {
    play("select")
    setSelected((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        exercise,
        sets: 3,
        reps: 10,
        weight: 0,
        restSeconds: 60,
        order: prev.length,
      },
    ])
    setSearch("")
  }

  function removeExercise(index: number) {
    play("delete")
    setSelected((prev) => prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, order: i })))
  }

  function updateExercise(index: number, field: keyof RoutineExercise, value: number) {
    setSelected((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)))
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    if (selected.length === 0) {
      toast.error("Agrega al menos un ejercicio")
      return
    }

    setSaving(true)
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        exercises: selected.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restSeconds: e.restSeconds,
          order: e.order,
        })),
      }),
    })

    if (res.ok) {
      play("success")
      toast.success("Rutina creada")
      router.push("/routines")
      router.refresh()
    } else {
      toast.error("Error al crear la rutina")
    }
    setSaving(false)
  }

  const filteredExercises = allExercises
    .filter(
      (e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 15)

  const muscleGroups = [...new Set(allExercises.map((e) => e.muscleGroup))]

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva rutina</h1>
          <p className="text-muted-foreground">Crea un plan de entrenamiento</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Ej: Push Day - Avanzado"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descripción (opcional)</Label>
              <Input
                id="desc"
                placeholder="Enfoque en pecho y tríceps"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ejercicios seleccionados ({selected.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Busca y agrega ejercicios
              </p>
            ) : (
              <div className="space-y-3">
                {selected.map((ex, index) => (
                  <div key={ex.exerciseId + index} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{ex.exercise?.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeExercise(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Series</Label>
                        <Input
                          type="number"
                          min={1}
                          value={ex.sets}
                          onChange={(e) => updateExercise(index, "sets", Number(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Reps</Label>
                        <Input
                          type="number"
                          min={1}
                          value={ex.reps}
                          onChange={(e) => updateExercise(index, "reps", Number(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Peso (kg)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={2.5}
                          value={ex.weight}
                          onChange={(e) => updateExercise(index, "weight", Number(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Descanso (s)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={15}
                          value={ex.restSeconds}
                          onChange={(e) =>
                            updateExercise(index, "restSeconds", Number(e.target.value))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Buscar ejercicios</Label>
              <Input
                placeholder="Buscar por nombre o grupo muscular..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <div className="mt-2 rounded-lg border divide-y max-h-60 overflow-y-auto">
                  {filteredExercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      No se encontraron ejercicios
                    </p>
                  ) : (
                    filteredExercises
                      .filter((ex) => !selected.find((s) => s.exerciseId === ex.id))
                      .map((ex) => (
                        <button
                          key={ex.id}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                          onClick={() => addExercise(ex)}
                        >
                          <Plus className="h-4 w-4 text-accent-yellow shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{ex.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {ex.muscleGroup} · {ex.equipment}
                            </p>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>

            {!search && (
              <div className="flex flex-wrap gap-1">
                {muscleGroups.slice(0, 8).map((group) => (
                  <button
                    key={group}
                    className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted transition-colors"
                    onClick={() => setSearch(group)}
                  >
                    {group}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => router.back()}
            onClickCapture={() => play("click")}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Crear rutina"}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
