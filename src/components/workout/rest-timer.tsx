"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Pause, Play, SkipForward } from "lucide-react"

interface RestTimerProps {
  remaining: number
  total: number
  isPaused: boolean
  isVisible: boolean
  onPause: () => void
  onResume: () => void
  onSkip: () => void
}

export function RestTimer({
  remaining,
  total,
  isPaused,
  isVisible,
  onPause,
  onResume,
  onSkip,
}: RestTimerProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? remaining / total : 0
  const offset = circumference * (1 - progress)

  const formatted = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`

  if (!isVisible) return null

  return (
    <div className="flex flex-col items-center gap-2 py-2 animate-in fade-in slide-in-from-top-4">
      <div className="relative inline-flex items-center justify-center">
        <svg width="140" height="140" viewBox="0 0 120 120" className="-rotate-90">
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            strokeWidth="6"
            stroke="currentColor"
            className="text-muted/20"
          />
          <circle
            ref={circleRef}
            cx="60" cy="60" r={radius}
            fill="none"
            strokeWidth="6"
            stroke="currentColor"
            className={cn(
              "transition-[stroke-dashoffset] duration-1000 ease-linear",
              remaining <= 5 ? "text-red-500" : remaining <= 10 ? "text-amber-500" : "text-accent-yellow"
            )}
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-mono text-3xl font-bold tabular-nums tracking-tight",
              remaining <= 5 && "animate-pulse"
            )}
          >
            {formatted}
          </span>
          <span className="text-xs text-muted-foreground">descanso</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isPaused ? onResume : onPause}
          className="inline-flex items-center justify-center rounded-full border border-input bg-background p-2 text-sm hover:bg-muted transition-colors"
          aria-label={isPaused ? "Reanudar" : "Pausar"}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted transition-colors"
        >
          <SkipForward className="h-3 w-3" />
          Saltar
        </button>
      </div>
    </div>
  )
}
