"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"

const DAYS_OF_WEEK = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Mi\u00e9rcoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "S\u00e1bado" },
  { key: "sunday", label: "Domingo" },
]

interface Split {
  id: string
  name: string
}

interface SplitDaySchedulerProps {
  splits: Split[]
  onAssign: (assignments: Record<string, string>) => void
  initialAssignments?: Record<string, string>
}

export function SplitDayScheduler({ splits, onAssign, initialAssignments = {} }: SplitDaySchedulerProps) {
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments)

  function handleAssign(day: string, splitId: string) {
    const next = { ...assignments }
    if (splitId === "rest") {
      delete next[day]
    } else {
      next[day] = splitId
    }
    setAssignments(next)
    onAssign(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-accent-yellow" />
          Asignaci\u00f3n por d\u00eda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {DAYS_OF_WEEK.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-24 text-sm font-medium shrink-0">{label}</span>
            <Select
              value={assignments[key] ?? "rest"}
              onValueChange={(val) => handleAssign(key, val)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rest">Descanso</SelectItem>
                {splits.map((split) => (
                  <SelectItem key={split.id} value={split.id}>
                    {split.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
