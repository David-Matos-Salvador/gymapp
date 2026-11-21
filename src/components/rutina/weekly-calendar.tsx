"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"]

interface WeeklyCalendarProps {
  workoutDates: Date[]
}

export function WeeklyCalendar({ workoutDates }: WeeklyCalendarProps) {
  const { days, workoutDaySet, todayKey } = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
    monday.setHours(0, 0, 0, 0)

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      return date
    })

    const workoutDaySet = new Set(
      workoutDates.map((d) => {
        const dd = new Date(d)
        dd.setHours(0, 0, 0, 0)
        return dd.toISOString()
      })
    )

    const todayIso = new Date(today)
    todayIso.setHours(0, 0, 0, 0)
    const todayKey = todayIso.toISOString()

    return { days, workoutDaySet, todayKey }
  }, [workoutDates])

  return (
    <div className="flex items-center justify-between gap-1">
      {days.map((date, i) => {
        const dateKey = new Date(date)
        dateKey.setHours(0, 0, 0, 0)
        const key = dateKey.toISOString()
        const isToday = key === todayKey
        const hasWorkout = workoutDaySet.has(key)
        const dayNumber = date.getDate()

        return (
          <div key={key} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {DAY_LABELS[i]}
            </span>
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                isToday && "bg-accent-yellow text-white shadow-sm shadow-accent-yellow/30",
                !isToday && hasWorkout && "bg-accent-yellow/15 text-gold",
                !isToday && !hasWorkout && "text-muted-foreground"
              )}
            >
              {dayNumber}
            </span>
            {hasWorkout && (
              <span
                className={cn(
                  "h-1 w-1 rounded-full",
                  isToday ? "bg-accent-yellow" : "bg-accent-yellow"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
