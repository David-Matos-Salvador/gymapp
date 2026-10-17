"use client"

import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"

interface DailyStreakProps {
  streakDays: number
}

export function DailyStreak({ streakDays }: DailyStreakProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
        streakDays > 0 ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"
      )}
    >
      <Flame className={cn("h-4 w-4", streakDays > 0 && "fill-orange-500")} />
      <span>
        {streakDays} día{streakDays !== 1 ? "s" : ""} seguido{streakDays !== 1 ? "s" : ""}
      </span>
    </div>
  )
}
