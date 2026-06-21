"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { RoutineEditorDialog } from "@/components/coach/routine-editor-dialog"

interface SplitExercise {
  id: string
  exerciseId: string
  sets: number
  reps: string
  weight: number
  restSeconds: number
  exercise: { id: string; name: string; muscleGroup: string }
}

interface Split {
  id: string
  label: string
  name: string
  description: string | null
  muscleGroups: string[]
  estimatedDuration: number | null
  difficulty: string | null
  exercises: SplitExercise[]
}

interface Plan {
  id: string
  name: string
  description: string | null
  objective: string | null
  frequency: number | null
  difficulty: string | null
  splits: Split[]
}

export function RoutineEditButton({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="mr-1 h-4 w-4" /> Editar
      </Button>
      <RoutineEditorDialog
        plan={plan}
        open={open}
        onOpenChange={setOpen}
        onPlanUpdated={() => router.refresh()}
      />
    </>
  )
}
