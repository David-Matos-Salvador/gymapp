"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Share2, Check, Trophy } from "lucide-react"
import { toast } from "sonner"

interface WorkoutSummary {
  exerciseCount: number
  duration: number
  totalWeight: number
}

interface ShareProgressProps {
  workout: WorkoutSummary
  open: boolean
  onClose: () => void
}

function buildSummary(workout: WorkoutSummary): string {
  const lines = [`Hoy completé ${workout.exerciseCount} ejercicios en ${workout.duration} minutos.`]
  if (workout.totalWeight > 0) {
    lines.push(`Peso total levantado: ${workout.totalWeight} kg.`)
  }
  lines.push("\u{1F4AA} #GymApp")
  return lines.join(" ")
}

export function ShareProgress({ workout, open, onClose }: ShareProgressProps) {
  const [copied, setCopied] = useState(false)
  const summary = buildSummary(workout)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      toast.success("Copiado al portapapeles")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Error al copiar")
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      toast.error("Compartir no está disponible en este navegador")
      return
    }
    try {
      await navigator.share({
        title: "Mi entrenamiento en GymApp",
        text: summary,
      })
      toast.success("Compartido exitosamente")
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      toast.error("Error al compartir")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <Trophy className="size-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Entrenamiento completado</DialogTitle>
          <DialogDescription className="text-center">
            Comparte tu progreso con amigos
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted/50 p-4 text-sm leading-relaxed">{summary}</div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-600" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </>
            )}
          </Button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button variant="default" className="flex-1" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartir
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
