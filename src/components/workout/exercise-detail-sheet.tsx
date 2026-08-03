"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dumbbell, Wrench, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ExerciseImage } from "@/components/exercise/exercise-image"
import type { Exercise } from "@/types/exercise"

interface ExerciseDetailSheetProps {
  exercise: Exercise
  children: React.ReactNode
  userGymId?: string
  showMachineNumbers?: boolean
}

export function ExerciseDetailSheet({ exercise, children, userGymId, showMachineNumbers = false }: ExerciseDetailSheetProps) {
  const [open, setOpen] = useState(false)

  const gymEquipments = (exercise.gymEquipments ?? []).filter((e) => e.gymId === userGymId)

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
        <div className="flex flex-col items-center py-6 px-6 space-y-4">
          <ExerciseImage
            imageUrl={exercise.imageUrl}
            alt={exercise.name}
            size="lg"
          />
          {gymEquipments.length > 0 && (
            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Equipo en tu gimnasio
              </p>
              {gymEquipments.map((eq) => (
                <div
                  key={eq.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{eq.name}</p>
                    {eq.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{eq.location}</span>
                      </p>
                    )}
                  </div>
                  {showMachineNumbers && eq.machineNumber != null && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                      {eq.machineNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-muted-foreground text-center text-sm max-w-[280px] leading-relaxed">
            Estamos trabajando en el detalle de este ejercicio.
            <br />
            Pronto podr&aacute;s ver instrucciones, videos y m&aacute;s informaci&oacute;n aqu&iacute;.
          </p>
          <Button variant="outline" onClick={() => setOpen(false)} className="gap-2 mt-4">
            Volver
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
