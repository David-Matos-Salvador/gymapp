"use client"

import { cn } from "@/lib/utils"

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"]

interface WeeklyCalendarProps {
  workoutDates: Date[]
}

export function WeeklyCalendar({ workoutDates }: WeeklyCalendarProps) {
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
                isToday && "bg-gym-orange text-white shadow-sm shadow-gym-orange/30",
                !isToday && hasWorkout && "bg-gym-green/15 text-gym-green",
                !isToday && !hasWorkout && "text-muted-foreground"
              )}
            >
              {dayNumber}
            </span>
            {hasWorkout && (
              <span
                className={cn(
                  "h-1 w-1 rounded-full",
                  isToday ? "bg-gym-orange" : "bg-gym-green"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
