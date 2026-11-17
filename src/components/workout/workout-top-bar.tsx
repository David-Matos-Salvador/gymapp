"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const EXIT_WITH_UNSAVED_SETS_MESSAGE =
  "Tienes series sin guardar. Quedan en este dispositivo y puedes retomarlas al volver. ¿Salir del entrenamiento?"

interface WorkoutTopBarProps {
  splitName: string
  isActive: boolean
  elapsedFormatted: string
  completedExercises: number
  totalExercises: number
  hasUnsavedSets: boolean
  onExit: () => void
}

// Barra fija de la pantalla de entrenar (issue #140): en modo inmersivo no hay header ni menú,
// así que esta barra es la forma de orientarse y de volver.
export function WorkoutTopBar({
  splitName,
  isActive,
  elapsedFormatted,
  completedExercises,
  totalExercises,
  hasUnsavedSets,
  onExit,
}: WorkoutTopBarProps) {
  const handleExit = () => {
    if (hasUnsavedSets && !window.confirm(EXIT_WITH_UNSAVED_SETS_MESSAGE)) return
    onExit()
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
      <div className="container mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 min-h-11"
          onClick={handleExit}
          aria-label="Salir a mi rutina"
        >
          <ArrowLeft className="h-4 w-4" /> Salir
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{splitName}</span>
        {isActive && (
          <div className="flex shrink-0 items-center gap-2 text-sm tabular-nums text-muted-foreground">
            <span aria-label={`${completedExercises} de ${totalExercises} ejercicios`}>
              {completedExercises}/{totalExercises}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{elapsedFormatted}</span>
          </div>
        )}
      </div>
    </header>
  )
}
