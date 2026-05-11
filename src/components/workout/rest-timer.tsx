"use client"

import { cn } from "@/lib/utils"
import { Pause, Play, SkipForward } from "lucide-react"

type RestStatus = "running" | "paused"

interface RestTimerProps {
  remaining: number
  total: number
  status: RestStatus
  onPause: () => void
  onResume: () => void
  onSkip: () => void
}

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function RestTimer({
  remaining,
  total,
  status,
  onPause,
  onResume,
  onSkip,
}: RestTimerProps) {
  const progress = total > 0 ? remaining / total : 0
  const offset = CIRCUMFERENCE * (1 - progress)

  const formatted = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`

  const strokeColor =
    remaining <= 5 ? "text-red-500" : remaining <= 10 ? "text-amber-500" : "text-accent-yellow"

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-accent-yellow/20 bg-accent-yellow/5 animate-in fade-in slide-in-from-top-2">
      <svg width="36" height="36" viewBox="0 0 120 120" className="-rotate-90 shrink-0">
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="6" stroke="currentColor" className="text-muted/20" />
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none" strokeWidth="6"
          stroke="currentColor" strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-1000 ease-linear", strokeColor)}
          style={{
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="flex-1 min-w-0">
        <span className={cn("font-mono text-lg font-bold tabular-nums", remaining <= 5 && "animate-pulse")}>
          {formatted}
        </span>
        <p className="text-xs text-muted-foreground">descanso</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={status === "paused" ? onResume : onPause}
          className="p-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors"
          aria-label={status === "paused" ? "Reanudar" : "Pausar"}
        >
          {status === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-input bg-background hover:bg-muted transition-colors"
        >
          <SkipForward className="h-3 w-3" />
          Saltar
        </button>
      </div>
    </div>
  )
}
