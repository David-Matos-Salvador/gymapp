"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExerciseAnimation } from "@/components/exercise-animation"
import { toast } from "sonner"
import {
  ChevronLeft,
  Play,
  Image as ImageIcon,
  Dumbbell,
  History,
  Save,
  Minus,
  Plus,
  Clock,
} from "lucide-react"
import type { Exercise } from "@/types/exercise"

interface HistoryEntry {
  id: string
  date: string
  weight: number
  reps: number
  setNumber: number
}

interface ExerciseDetailViewProps {
  exercise: Exercise & {
    description?: string | null
    videoUrl?: string | null
    imageUrl?: string | null
    animationData?: unknown
  }
  splitExerciseId?: string
  initialSets?: number
  initialReps?: number
  initialWeight?: number
  initialRestSeconds?: number
  history?: HistoryEntry[]
  onSave?: (data: { splitExerciseId?: string; sets: number; reps: number; weight: number; restSeconds: number }) => void
  onBack?: () => void
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  LEGS: "Piernas",
  GLUTES: "Glúteos",
  ABS: "Abdominales",
  CALVES: "Pantorrillas",
  FOREARMS: "Antebrazos",
  TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo",
  CARDIO: "Cardio",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.hostname.includes("youtu.be")
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v")
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }
    return null
  } catch {
    return null
  }
}

export function ExerciseDetailView({
  exercise,
  splitExerciseId,
  initialSets = 3,
  initialReps = 10,
  initialWeight = 0,
  initialRestSeconds = 60,
  history = [],
  onSave,
  onBack,
}: ExerciseDetailViewProps) {
  const [sets, setSets] = useState(initialSets)
  const [reps, setReps] = useState(initialReps)
  const [weight, setWeight] = useState(initialWeight)
  const [restSeconds, setRestSeconds] = useState(initialRestSeconds)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("media")

  const embedUrl = exercise.videoUrl ? getYouTubeEmbedUrl(exercise.videoUrl) : null

  const handleSave = useCallback(async () => {
    if (!onSave) return
    setSaving(true)
    try {
      onSave({ splitExerciseId, sets, reps, weight, restSeconds })
      toast.success("Ejercicio actualizado")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }, [splitExerciseId, sets, reps, weight, restSeconds, onSave])

  const incrementWeight = useCallback(() => setWeight((w) => w + 2.5), [])
  const decrementWeight = useCallback(() => setWeight((w) => Math.max(0, w - 2.5)), [])

  const incrementReps = useCallback(() => setReps((r) => parseInt(String(r), 10) + 1 || 1), [])
  const decrementReps = useCallback(() => setReps((r) => Math.max(1, parseInt(String(r), 10) - 1 || 1)), [])

  const incrementSets = useCallback(() => setSets((s) => s + 1), [])
  const decrementSets = useCallback(() => setSets((s) => Math.max(1, s - 1)), [])

  const incrementRest = useCallback(() => setRestSeconds((rs) => rs + 15), [])
  const decrementRest = useCallback(() => setRestSeconds((rs) => Math.max(0, rs - 15)), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto px-4 py-6 space-y-6 max-w-3xl"
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{exercise.name}</h1>
          <p className="text-sm text-muted-foreground">
            {MUSCLE_GROUP_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup}
            {exercise.equipment && ` · ${exercise.equipment}`}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="media" className="flex-1 gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Media
          </TabsTrigger>
          <TabsTrigger value="config" className="flex-1 gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" />
            Ajustes
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1.5">
            <History className="h-3.5 w-3.5" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="space-y-6 mt-6">
          {exercise.description && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed">{exercise.description}</p>
              </CardContent>
            </Card>
          )}

          {embedUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4 text-accent-yellow" />
                  Video demostrativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${exercise.name} - video`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {exercise.imageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-accent-yellow" />
                  Imagen de referencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden bg-muted">
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-full max-h-80 object-contain mx-auto"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-accent-yellow" />
                Animación
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ExerciseAnimation exerciseId={exercise.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Series, repeticiones y peso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <CounterRow
                label="Series"
                value={sets}
                onIncrement={incrementSets}
                onDecrement={decrementSets}
              />
              <CounterRow
                label="Repeticiones"
                value={parseInt(String(reps), 10) || 0}
                onIncrement={incrementReps}
                onDecrement={decrementReps}
              />
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Peso (kg)</Label>
                <div className="inline-flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                  <button
                    type="button"
                    onClick={decrementWeight}
                    className="flex items-center justify-center h-8 w-8 rounded-full border border-border/40 bg-background hover:bg-muted hover:border-border transition-all active:scale-90"
                    aria-label="Reducir peso"
                  >
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <span className="font-mono text-lg tabular-nums font-bold min-w-[4ch] text-center">
                    {weight}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">kg</span>
                  <button
                    type="button"
                    onClick={incrementWeight}
                    className="flex items-center justify-center h-8 w-8 rounded-full border border-border/40 bg-background hover:bg-muted hover:border-border transition-all active:scale-90"
                    aria-label="Aumentar peso"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <CounterRow
                label="Descanso (segundos)"
                value={restSeconds}
                onIncrement={incrementRest}
                onDecrement={decrementRest}
                icon={<Clock className="h-3.5 w-3.5" />}
              />
            </CardContent>
          </Card>

          {onSave && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-accent-yellow" />
                Historial de series
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay registros de entrenamiento para este ejercicio
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground">Serie</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground">Peso (kg)</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground">Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-2 whitespace-nowrap">{formatDate(entry.date)}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{entry.setNumber}</td>
                          <td className="py-2 px-2 text-right tabular-nums font-medium">{entry.weight}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{entry.reps}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

function CounterRow({
  label,
  value,
  onIncrement,
  onDecrement,
  icon,
}: {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <div className="inline-flex items-center gap-2 bg-muted/30 rounded-lg px-2 py-1">
        <button
          type="button"
          onClick={onDecrement}
          className="flex items-center justify-center h-7 w-7 rounded-full border border-border/40 bg-background hover:bg-muted hover:border-border transition-all active:scale-90"
          aria-label={`Reducir ${label}`}
        >
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <span className="font-mono text-sm tabular-nums font-bold min-w-[3ch] text-center">
          {value}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          className="flex items-center justify-center h-7 w-7 rounded-full border border-border/40 bg-background hover:bg-muted hover:border-border transition-all active:scale-90"
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
