"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Dumbbell, MapPin } from "lucide-react"
import { toast } from "sonner"

interface ExerciseRef {
  id: string
  name: string
}

interface Equipment {
  id: string
  name: string
  category: string | null
  location: string | null
  imageUrl: string | null
  exerciseId: string | null
  exercise: ExerciseRef | null
}

interface GymEquipmentManagerProps {
  initialEquipment: Equipment[]
  exercises: ExerciseRef[]
  gymId: string | undefined
}

const categoryLabels: Record<string, string> = {
  CARDIO: "Cardio",
  STRENGTH: "Fuerza",
  FREE_WEIGHT: "Peso libre",
  MACHINE: "Máquina",
  FUNCTIONAL: "Funcional",
  ACCESSORY: "Accesorio",
  BARBELL: "Barra",
  DUMBBELL: "Mancuerna",
  CABLE: "Cable",
  BODYWEIGHT: "Peso corporal",
}

export function GymEquipmentManager({
  initialEquipment,
  exercises,
  gymId,
}: GymEquipmentManagerProps) {
  const router = useRouter()
  const { play } = useSound()
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [formName, setFormName] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formImageUrl, setFormImageUrl] = useState("")
  const [formExerciseId, setFormExerciseId] = useState("")

  function resetForm() {
    setFormName("")
    setFormCategory("")
    setFormLocation("")
    setFormImageUrl("")
    setFormExerciseId("")
  }

  async function handleCreate() {
    if (!formName.trim() || !gymId) return
    setSaving(true)
    play("select")

    const res = await fetch("/api/gym-equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName.trim(),
        category: formCategory.trim() || undefined,
        location: formLocation.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
        exerciseId: formExerciseId || undefined,
        gymId,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setEquipment((prev) => [...prev, data.equipment])
      play("success")
      toast.success("Equipo agregado")
      setDialogOpen(false)
      resetForm()
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error ?? "Error al crear equipo")
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    play("delete")

    const res = await fetch(`/api/gym-equipment/${id}`, { method: "DELETE" })

    if (res.ok) {
      setEquipment((prev) => prev.filter((e) => e.id !== id))
      toast.success("Equipo eliminado")
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error ?? "Error al eliminar")
    }
    setDeleting(null)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {equipment.length} {equipment.length === 1 ? "equipo" : "equipos"}
        </p>
        <Button
          onClick={() => {
            resetForm()
            setDialogOpen(true)
          }}
          disabled={!gymId}
          title={!gymId ? "No tienes un gimnasio asignado" : undefined}
        >
          <Plus className="h-4 w-4" />
          Agregar equipo
        </Button>
      </div>

      {!gymId && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Sin gimnasio asignado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Contacta a un administrador para que te asigne a un gimnasio
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {gymId && equipment.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Sin equipamiento</p>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega el equipamiento de tu gimnasio
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Agregar equipo
            </Button>
          </CardContent>
        </Card>
      )}

      {gymId && equipment.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipment.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="h-full hover:shadow-md transition-all">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-40 w-full object-cover"
                  />
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base pr-2">{item.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {item.category && (
                    <p className="text-xs text-muted-foreground">
                      {categoryLabels[item.category] ?? item.category}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {item.location}
                    </div>
                  )}
                  {item.exercise && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Dumbbell className="h-3 w-3 shrink-0" />
                      {item.exercise.name}
                    </div>
                  )}
                  {!item.location && !item.exercise && (
                    <p className="text-xs text-muted-foreground">Sin detalles adicionales</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar equipo</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo equipamiento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipName">Nombre</Label>
              <Input
                id="equipName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Prensa de pierna"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipCategory">Categoría</Label>
              <Input
                id="equipCategory"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="Ej: MACHINE, CARDIO..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipLocation">Ubicación</Label>
              <Input
                id="equipLocation"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Ej: Zona de pesas, 2do piso"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipImageUrl">URL de imagen</Label>
              <Input
                id="equipImageUrl"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipExercise">Ejercicio vinculado</Label>
              <Select
                value={formExerciseId}
                onValueChange={setFormExerciseId}
              >
                <SelectTrigger id="equipExercise" className="w-full">
                  <SelectValue placeholder="Seleccionar ejercicio..." />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
