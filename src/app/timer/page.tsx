"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

const DEFAULT_DURATION = 60
const DURATIONS = [30, 45, 60, 90, 120]

export default function TimerPage() {
  const router = useRouter()
  const [total, setTotal] = useState(DEFAULT_DURATION)
  const [remaining, setRemaining] = useState(DEFAULT_DURATION)
  const [status, setStatus] = useState<"running" | "paused">("paused")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (status === "running" && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearTimer()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return clearTimer
  }, [status, remaining, clearTimer])

  useEffect(() => {
    if (remaining === 0 && intervalRef.current) {
      clearTimer()
      setStatus("paused")
    }
  }, [remaining, clearTimer])

  const selectDuration = (seconds: number) => {
    clearTimer()
    setTotal(seconds)
    setRemaining(seconds)
    setStatus("paused")
  }

  const resetTimer = () => {
    clearTimer()
    setRemaining(total)
    setStatus("paused")
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-sm px-4">
        <h1 className="text-2xl font-bold">Temporizador</h1>

        <div className="relative flex items-center justify-center">
          <svg width="240" height="240" viewBox="0 0 120 120" className="-rotate-90">
            <circle
              cx="60" cy="60" r={54}
              fill="none" strokeWidth="6"
              stroke="currentColor"
              className="text-muted/20"
            />
            <circle
              cx="60" cy="60" r={54}
              fill="none" strokeWidth="6"
              stroke="currentColor" strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear text-accent-yellow"
              style={{
                strokeDasharray: 2 * Math.PI * 54,
                strokeDashoffset: 2 * Math.PI * 54 * (1 - (remaining / total)),
              }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-mono text-5xl font-bold tabular-nums">
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground mt-1">segundos</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "paused" && remaining < total ? (
            <Button
              variant="outline"
              size="sm"
              onClick={resetTimer}
            >
              Reiniciar
            </Button>
          ) : null}
          <Button
            size="lg"
            className="rounded-full px-8"
            onClick={() =>
              remaining === 0
                ? resetTimer()
                : setStatus(status === "paused" ? "running" : "paused")
            }
          >
            {remaining === 0 ? "Reiniciar" : status === "paused" ? "Iniciar" : "Pausar"}
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full justify-center">
          {DURATIONS.map((d) => (
            <Button
              key={d}
              variant={total === d ? "default" : "outline"}
              size="sm"
              onClick={() => selectDuration(d)}
            >
              {d}s
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
