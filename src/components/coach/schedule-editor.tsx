"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DAYS_OF_WEEK,
  DAY_LABELS,
  SLOT_MINUTES,
  validateAvailability,
  type AvailabilityBlock,
  type DayOfWeekName,
} from "@/lib/coach-schedule"

interface EditableBlock extends AvailabilityBlock {
  key: number
}

export function ScheduleEditor({ initialBlocks }: { initialBlocks: AvailabilityBlock[] }) {
  const router = useRouter()
  const [blocks, setBlocks] = useState<EditableBlock[]>(() =>
    initialBlocks.map((block, index) => ({ ...block, key: index }))
  )
  const [nextKey, setNextKey] = useState(initialBlocks.length)
  const [saving, setSaving] = useState(false)

  function addBlock(dayOfWeek: DayOfWeekName) {
    setBlocks((prev) => [
      ...prev,
      { key: nextKey, dayOfWeek, startTime: "09:00", endTime: "12:00" },
    ])
    setNextKey((prev) => prev + 1)
  }

  function updateBlock(key: number, field: "startTime" | "endTime", value: string) {
    setBlocks((prev) =>
      prev.map((block) => (block.key === key ? { ...block, [field]: value } : block))
    )
  }

  function removeBlock(key: number) {
    setBlocks((prev) => prev.filter((block) => block.key !== key))
  }

  async function save() {
    const payload = blocks.map(({ dayOfWeek, startTime, endTime }) => ({
      dayOfWeek,
      startTime,
      endTime,
    }))
    const invalid = validateAvailability(payload)
    if (invalid) {
      toast.error(invalid)
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/trainer/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: payload }),
      })
      if (res.ok) {
        toast.success("Horas de atención guardadas")
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "No se pudieron guardar tus horas")
      }
    } catch {
      toast.error("No se pudieron guardar tus horas")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cada sesión dura {SLOT_MINUTES} minutos. Las horas de tus clases grupales y las que ya están
        reservadas no se ofrecen a tus clientes.
      </p>

      {DAYS_OF_WEEK.map((day) => {
        const dayBlocks = blocks.filter((block) => block.dayOfWeek === day)
        const label = DAY_LABELS[day]
        return (
          <Card key={day} data-testid={`availability-${day}`}>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{label}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addBlock(day)}
                  aria-label={`Agregar horas el ${label.toLowerCase()}`}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar horas
                </Button>
              </div>

              {dayBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No atiendes este día</p>
              ) : (
                dayBlocks.map((block) => (
                  <div key={block.key} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={block.startTime}
                      onChange={(event) => updateBlock(block.key, "startTime", event.target.value)}
                      aria-label={`Desde, ${label.toLowerCase()}`}
                      className="min-w-0 flex-1 sm:max-w-36"
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={block.endTime}
                      onChange={(event) => updateBlock(block.key, "endTime", event.target.value)}
                      aria-label={`Hasta, ${label.toLowerCase()}`}
                      className="min-w-0 flex-1 sm:max-w-36"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBlock(block.key)}
                      aria-label={`Quitar horas del ${label.toLowerCase()}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )
      })}

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Guardando…" : "Guardar horas de atención"}
      </Button>
    </div>
  )
}
