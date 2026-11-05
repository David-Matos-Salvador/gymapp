"use client"

import { useRef, useState } from "react"
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
import {
  Plus,
  Trash2,
  Pencil,
  Dumbbell,
  MapPin,
  Power,
  PowerOff,
  ImagePlus,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

interface ExerciseRef {
  id: string
  name: string
}

export interface Equipment {
  id: string
  name: string
  category: string | null
  location: string | null
  imageUrl: string | null
  exerciseId: string | null
  exercise: ExerciseRef | null
  machineNumber: number | null
  isSystem?: boolean
}

interface GymEquipmentManagerProps {
  initialEquipment: Equipment[]
  systemEquipment?: Equipment[]
  equipActiveMap?: Record<string, boolean>
  exercises: ExerciseRef[]
  gymId: string | undefined
  showMachineNumbers: boolean
  onToggleEquipment?: (equipmentId: string, active: boolean) => void
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
  systemEquipment = [],
  equipActiveMap = {},
  exercises,
  gymId,
  showMachineNumbers,
  onToggleEquipment,
}: GymEquipmentManagerProps) {
  const router = useRouter()
  const { play } = useSound()
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSystem, setEditingSystem] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formName, setFormName] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formImageUrl, setFormImageUrl] = useState("")
  const [formExerciseId, setFormExerciseId] = useState("")
  const [formMachineNumber, setFormMachineNumber] = useState("")

  const machineNumberValue = formMachineNumber.trim() ? Number(formMachineNumber) : null
  const machineNumberError =
    machineNumberValue !== null &&
    (!Number.isInteger(machineNumberValue) || machineNumberValue < 1 || machineNumberValue > 9999)
      ? "Ingresa un número entero entre 1 y 9999"
      : null

  function resetForm() {
    setFormName("")
    setFormCategory("")
    setFormLocation("")
    setFormImageUrl("")
    setFormExerciseId("")
    setFormMachineNumber("")
    setImageError(null)
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Formato no permitido. Usa JPEG, PNG, WebP o GIF.")
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("La imagen supera el máximo de 5 MB.")
      return
    }

    setImageError(null)
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "equipment")
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al subir la imagen")
      }
      const data = await res.json()
      setFormImageUrl(data.url)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Error al subir la imagen")
    } finally {
      setUploadingImage(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setEditingSystem(false)
    setImageError(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(item: Equipment) {
    setEditingId(item.id)
    setEditingSystem(!!item.isSystem)
    setImageError(null)
    setFormName(item.name)
    setFormCategory(item.category ?? "")
    setFormLocation(item.location ?? "")
    setFormImageUrl(item.imageUrl ?? "")
    setFormExerciseId(item.exerciseId ?? "")
    setFormMachineNumber(item.machineNumber != null ? String(item.machineNumber) : "")
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formName.trim() || !gymId || machineNumberError) return
    setSaving(true)
    play("select")

    if (editingSystem && editingId) {
      const res = await fetch("/api/gym-equipment-activations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: editingId,
          gymId,
          machineNumber: formMachineNumber.trim() ? Number(formMachineNumber) : null,
          imageUrl: formImageUrl.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success("Máquina actualizada")
        play("success")
        setDialogOpen(false)
        resetForm()
        setEditingId(null)
        setEditingSystem(false)
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Error al guardar la máquina")
      }
      setSaving(false)
      return
    }

    const body = {
      name: formName.trim(),
      category: formCategory.trim() || (editingId ? null : undefined),
      location: formLocation.trim() || (editingId ? null : undefined),
      imageUrl: formImageUrl.trim() || (editingId ? null : undefined),
      exerciseId: formExerciseId || (editingId ? null : undefined),
      machineNumber: formMachineNumber.trim() ? Number(formMachineNumber) : null,
    }

    const res = editingId
      ? await fetch(`/api/gym-equipment/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/gym-equipment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, gymId }),
        })

    if (res.ok) {
      const data = await res.json()
      if (editingId) {
        setEquipment((prev) => prev.map((e) => (e.id === editingId ? data.equipment : e)))
        toast.success("Equipo actualizado")
      } else {
        setEquipment((prev) => [...prev, data.equipment])
        toast.success("Equipo agregado")
      }
      play("success")
      setDialogOpen(false)
      resetForm()
      setEditingId(null)
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error ?? "Error al guardar equipo")
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
      setDeleteConfirm(null)
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
          {equipment.length} {equipment.length === 1 ? "equipo" : "equipos"} personalizados
        </p>
        <Button
          onClick={openCreate}
          disabled={!gymId}
          title={!gymId ? "No tienes un gimnasio asignado" : undefined}
        >
          <Plus className="h-4 w-4" />
          Agregar equipo
        </Button>
      </div>

      {/* System equipment: catálogo global con configuración por gimnasio */}
      {systemEquipment.length > 0 && onToggleEquipment && (
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Equipamiento del sistema
            </p>
            <p className="text-[10px] text-muted-foreground">
              El nombre es global. El número, la imagen y la activación son de este gimnasio.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {systemEquipment.map((item) => {
              const active = equipActiveMap[item.id] !== false
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors ${active ? "bg-card" : "bg-muted/30"}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-10 w-10 shrink-0 rounded border object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-medium ${active ? "" : "text-muted-foreground line-through"}`}
                      >
                        {item.name}
                      </p>
                      {item.machineNumber != null && (
                        <span className="inline-flex items-center rounded-full bg-accent-yellow/10 px-2 py-0.5 text-[10px] font-medium text-accent-yellow">
                          Máquina #{item.machineNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit({ ...item, isSystem: true })}
                      aria-label="Editar máquina"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className={
                        active
                          ? "bg-accent-yellow text-black hover:bg-accent-yellow/80 shrink-0"
                          : "shrink-0"
                      }
                      onClick={() => onToggleEquipment(item.id, !active)}
                    >
                      {active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
            <Button onClick={openCreate}>
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
                  <div className="relative">
                    <img src={item.imageUrl} alt={item.name} className="h-40 w-full object-cover" />
                    {showMachineNumbers && item.machineNumber != null && (
                      <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                        {item.machineNumber}
                      </span>
                    )}
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 pr-2">
                      {!item.imageUrl && showMachineNumbers && item.machineNumber != null && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                          {item.machineNumber}
                        </span>
                      )}
                      <CardTitle className="text-base">{item.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(item)}
                        aria-label="Editar equipo"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirm(item.id)}
                        disabled={deleting === item.id}
                        aria-label="Eliminar equipo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingId(null)
            setEditingSystem(false)
            resetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSystem ? "Editar máquina" : editingId ? "Editar equipo" : "Agregar equipo"}
            </DialogTitle>
            <DialogDescription>
              {editingSystem
                ? "El nombre es global. El número, la imagen y la activación son de este gimnasio."
                : editingId
                  ? "Modifica los datos del equipamiento"
                  : "Ingresa los datos del nuevo equipamiento"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipName">Nombre {editingSystem && "(global)"}</Label>
              <Input
                id="equipName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Prensa de pierna"
                disabled={editingSystem}
              />
            </div>
            {!editingSystem && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="equipCategory">Categoría</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger id="equipCategory" className="w-full">
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </>
            )}
            <div className="space-y-2">
              <Label>Imagen {editingSystem && "(este gimnasio)"}</Label>
              {formImageUrl ? (
                <div className="relative overflow-hidden rounded-lg border">
                  <img
                    src={formImageUrl}
                    alt="Vista previa del equipo"
                    className="h-40 w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => setFormImageUrl("")}
                  >
                    Quitar
                  </Button>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Sin imagen
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {formImageUrl ? "Cambiar imagen" : "Subir imagen"}
              </Button>
              <p className="text-xs text-muted-foreground">JPEG, PNG, WebP o GIF. Máx. 5 MB.</p>
              {editingSystem && (
                <p className="text-xs text-muted-foreground">
                  Si la quitas, se usa la imagen del catálogo.
                </p>
              )}
              {imageError && <p className="text-xs text-destructive">{imageError}</p>}
            </div>
            {!editingSystem && (
              <div className="space-y-2">
                <Label htmlFor="equipExercise">Ejercicio vinculado</Label>
                <Select value={formExerciseId} onValueChange={setFormExerciseId}>
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
            )}
            <div className="space-y-2">
              <Label htmlFor="equipMachineNumber">
                Número de máquina {editingSystem && "(este gimnasio)"}
              </Label>
              <Input
                id="equipMachineNumber"
                type="number"
                min={1}
                max={9999}
                step={1}
                inputMode="numeric"
                value={formMachineNumber}
                onChange={(e) => setFormMachineNumber(e.target.value.replace(/[^\d]/g, ""))}
                aria-invalid={!!machineNumberError}
                aria-describedby={machineNumberError ? "equipMachineNumberError" : undefined}
                placeholder="Ej: 1, 2, 3..."
              />
              {machineNumberError && (
                <p id="equipMachineNumberError" className="text-xs text-destructive">
                  {machineNumberError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploadingImage || !formName.trim() || !!machineNumberError}
            >
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar equipo</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleting === deleteConfirm}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
