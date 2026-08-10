"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dumbbell, Wrench, MapPin, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ExerciseImage } from "@/components/exercise/exercise-image"
import { EQUIPMENT_LABELS } from "@/constants/ui"
import { MUSCLE_LABELS } from "@/constants/user"
import type { Exercise } from "@/types/exercise"

function extractYouTubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return url
}

interface ExerciseDetailSheetProps {
  exercise: Exercise
  children: React.ReactNode
  userGymId?: string
  showMachineNumbers?: boolean
}

export function ExerciseDetailSheet({ exercise, children, userGymId, showMachineNumbers = false }: ExerciseDetailSheetProps) {
  const [open, setOpen] = useState(false)

  const gymEquipments = exercise.gymEquipments ?? []
  const equipmentLabel = EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment
  const muscleLabel = MUSCLE_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-[400px] p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-accent-yellow" />
            {exercise.name}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center py-6 px-6 space-y-4 overflow-y-auto">
          <ExerciseImage
            imageUrl={exercise.imageUrl}
            alt={exercise.name}
            size="xl"
          />

          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              <Layers className="h-3 w-3 text-muted-foreground" />
              {muscleLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Wrench className="h-3 w-3" />
              Equipo: {equipmentLabel}
            </span>
          </div>

          {gymEquipments.length > 0 && (
            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {showMachineNumbers
                  ? "Máquina en tu gimnasio"
                  : "Equipamiento en tu gimnasio"}
              </p>
              {gymEquipments.map((eq) => (
                <div
                  key={eq.id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="relative aspect-[3/1] w-full rounded-lg overflow-hidden bg-muted">
                    {eq.imageUrl ? (
                      <img
                        src={eq.imageUrl}
                        alt={eq.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Wrench className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    {showMachineNumbers && eq.machineNumber != null && (
                      <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                        {eq.machineNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{eq.name}</p>
                    {eq.location && (
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{eq.location}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {exercise.videoUrl && (
            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Video demostrativo
              </p>
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
                {exercise.videoUrl.includes("youtube.com") || exercise.videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(exercise.videoUrl)}`}
                    title={exercise.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <a
                    href={exercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full w-full items-center justify-center text-sm text-primary hover:underline"
                  >
                    Ver video
                  </a>
                )}
              </div>
            </div>
          )}

          {exercise.description ? (
            <p className="text-muted-foreground text-center text-sm max-w-[320px] leading-relaxed">
              {exercise.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-center text-sm max-w-[280px] leading-relaxed">
              Estamos trabajando en el detalle de este ejercicio.
              <br />
              Pronto podr&aacute;s ver instrucciones, videos y m&aacute;s informaci&oacute;n aqu&iacute;.
            </p>
          )}
          <Button variant="outline" onClick={() => setOpen(false)} className="gap-2 mt-4">
            Volver
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
