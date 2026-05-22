"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ExerciseImage } from "@/components/exercise/exercise-image"
import type { Exercise } from "@/types/exercise"

interface ExerciseDetailSheetProps {
  exercise: Exercise
  children: React.ReactNode
}

export function ExerciseDetailSheet({ exercise, children }: ExerciseDetailSheetProps) {
  const [open, setOpen] = useState(false)

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