"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
            <Loader2 className="h-5 w-5 animate-spin text-accent-yellow" />
            {exercise.name}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center py-12 px-6 space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-accent-yellow/60" />
          </div>
          <p className="text-muted-foreground text-center text-sm max-w-[280px] leading-relaxed">
            Estamos trabajando en el detalle de este ejercicio.
            <br />
            Pronto podrás ver instrucciones, videos y más información aquí.
          </p>
          <Button variant="outline" onClick={() => setOpen(false)} className="gap-2 mt-4">
            Volver
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}