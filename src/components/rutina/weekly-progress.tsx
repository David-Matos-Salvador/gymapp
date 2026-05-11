"use client"

import { cn } from "@/lib/utils"

interface WeeklyProgressProps {
  completed: number
  target: number
}

export function WeeklyProgress({ completed, target }: WeeklyProgressProps) {
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0
  const isComplete = completed >= target

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Progreso semanal</span>
        <span className={cn(
          "text-sm font-bold tabular-nums",
          isComplete ? "text-accent-yellow" : "text-foreground"
        )}>
          {completed} de {target} día{target !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            isComplete ? "bg-accent-yellow" : "bg-accent-yellow"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
