"use client"

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
import { MUSCLE_LABELS } from "@/constants/user"
import { Plus, Pencil, Trash2, Upload, ExternalLink, ImageIcon, Dumbbell } from "lucide-react"

export interface Exercise {
  id: string
  name: string
  description: string | null
  category: string | null
  muscleGroup: string
  equipment: string
  imageUrl: string | null
  videoUrl: string | null
  userId: string | null
  createdAt: string
  updatedAt: string
}

const MUSCLE_GROUPS = [
  { value: "CHEST", label: "Pecho" },
  { value: "BACK", label: "Espalda" },
  { value: "SHOULDERS", label: "Hombros" },
  { value: "BICEPS", label: "Bíceps" },
  { value: "TRICEPS", label: "Tríceps" },
  { value: "LEGS", label: "Piernas" },
  { value: "GLUTES", label: "Glúteos" },
  { value: "ABS", label: "Abdominales" },
  { value: "CALVES", label: "Pantorrillas" },
  { value: "FOREARMS", label: "Antebrazos" },
  { value: "TRAPS", label: "Trapecios" },
  { value: "FULL_BODY", label: "Cuerpo completo" },
  { value: "CARDIO", label: "Cardio" },
]

const EQUIPMENT = [
  { value: "BARBELL", label: "Barra" },
  { value: "DUMBBELL", label: "Mancuernas" },
  { value: "MACHINE", label: "Máquina" },
  { value: "CABLE", label: "Cable" },
  { value: "BODYWEIGHT", label: "Peso corporal" },
  { value: "KETTLEBELL", label: "Kettlebell" },
  { value: "BAND", label: "Banda" },
  { value: "SMITH_MACHINE", label: "Smith" },
  { value: "EZ_BAR", label: "Barra EZ" },
  { value: "BENCH", label: "Banco" },
  { value: "PLATE", label: "Disco" },
  { value: "OTHER", label: "Otro" },
]

const EQUIPMENT_LABELS: Record<string, string> = Object.fromEntries(
  EQUIPMENT.map((e) => [e.value, e.label])
)

interface ExerciseForm {
  name: string
  description: string
  category: string
  muscleGroup: string
  equipment: string
  imageUrl: string
  videoUrl: string
}

const emptyForm: ExerciseForm = {
  name: "",
  description: "",
  category: "",
  muscleGroup: "CHEST",
  equipment: "OTHER",
  imageUrl: "",
  videoUrl: "",
}

interface ExerciseManagementProps {
  exercises: Exercise[]
  canEditExercise: (ex: Exercise) => boolean
  onExercisesChange: (exercises: Exercise[]) => void
}

export function ExerciseManagement({ exercises, canEditExercise, onExercisesChange }: ExerciseManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ExerciseForm>(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(ex: Exercise) {
    setEditingId(ex.id)
    setForm({
      name: ex.name,
      description: ex.description ?? "",
      category: ex.category ?? "",
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      imageUrl: ex.imageUrl ?? "",
      videoUrl: ex.videoUrl ?? "",
    })
    setDialogOpen(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("type", "general")

      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Error al subir imagen")
        return
      }
      const data = await res.json()
      setForm((prev) => ({ ...prev, imageUrl: data.url }))
      toast.success("Imagen subida")
    } catch {
      toast.error("Error al subir imagen")
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        muscleGroup: form.muscleGroup,
        equipment: form.equipment,
        imageUrl: form.imageUrl.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
      }

      if (editingId) {
        const res = await fetch(`/api/exercises/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Error al actualizar")
          return
        }
        const updated = await res.json()
        onExercisesChange(exercises.map((e) => (e.id === editingId ? updated : e)))
        toast.success("Ejercicio actualizado")
      } else {
        const res = await fetch("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? "Error al crear")
          return
        }
        const created = await res.json()
        onExercisesChange([...exercises, created])
        toast.success("Ejercicio creado")
      }

      setDialogOpen(false)
      setForm(emptyForm)
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Error al eliminar")
        return
      }
      onExercisesChange(exercises.filter((e) => e.id !== id))
      toast.success("Ejercicio eliminado")
      setDeleteConfirm(null)
    } catch {
      toast.error("Error de conexión")
    }
  }

  function formatYoutubeUrl(url: string) {
    if (!url) return null
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    )
    if (match) return `https://www.youtube.com/watch?v=${match[1]}`
    return url
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="size-4" />
          Nuevo ejercicio
        </Button>
      </div>

      {exercises.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
          <Dumbbell className="size-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay ejercicios. Crea el primero.</p>
        </div>
      ) : (
        <div className="border rounded-xl divide-y overflow-hidden">
          {exercises.map((ex) => (
            <div key={ex.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {ex.imageUrl ? (
                  <img
                    src={ex.imageUrl}
                    alt={ex.name}
                    className="size-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                      ;((e.target as HTMLImageElement).nextElementSibling as HTMLElement).style.display = "flex"
                    }}
                  />
                ) : null}
                <Dumbbell
                  className="size-5 text-muted-foreground"
                  style={{ display: ex.imageUrl ? "none" : "block" }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{ex.name}</span>
                  {ex.videoUrl && (
                    <a
                      href={formatYoutubeUrl(ex.videoUrl) ?? ex.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="size-3" />
                      Video
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {MUSCLE_LABELS[ex.muscleGroup] ?? ex.muscleGroup}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {EQUIPMENT_LABELS[ex.equipment] ?? ex.equipment}
                  </Badge>
                  {ex.category && (
                    <Badge variant="outline" className="text-xs">
                      {ex.category}
                    </Badge>
                  )}
                </div>
                {ex.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ex.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canEditExercise(ex) ? (
                  <>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(ex)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteConfirm(ex.id)}
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
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar ejercicio" : "Nuevo ejercicio"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Modifica los datos del ejercicio." : "Crea un nuevo ejercicio para tu gimnasio."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ex-name">Nombre *</Label>
              <Input
                id="ex-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej. Press de banca"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ex-desc">Descripción</Label>
              <Textarea
                id="ex-desc"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe cómo se realiza el ejercicio..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grupo muscular *</Label>
                <Select
                  value={form.muscleGroup}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, muscleGroup: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipamiento</Label>
                <Select
                  value={form.equipment}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, equipment: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ex-category">Categoría</Label>
              <Input
                id="ex-category"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Ej. Compuesto, Aislamiento..."
              />
            </div>

            <div className="space-y-2">
              <Label>Imagen</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" disabled={uploading} className="gap-2">
                    <Upload className="size-4" />
                    {uploading ? "Subiendo..." : "Subir imagen"}
                  </Button>
                </div>
                {form.imageUrl && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-8 rounded bg-muted overflow-hidden">
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="size-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    </div>
                    <span className="truncate max-w-[150px]">{form.imageUrl}</span>
                  </div>
                )}
              </div>
              {!form.imageUrl && (
                <p className="text-xs text-muted-foreground">
                  O pega una URL de imagen en el campo de abajo
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ex-imageurl">URL de imagen (opcional)</Label>
              <Input
                id="ex-imageurl"
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ex-videourl">URL de video (YouTube)</Label>
              <Input
                id="ex-videourl"
                value={form.videoUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {form.videoUrl && (
                <p className="text-xs text-muted-foreground">
                  Se detecta como: {formatYoutubeUrl(form.videoUrl) ?? "URL no reconocida como YouTube"}
                </p>
              )}
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear ejercicio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar ejercicio</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}