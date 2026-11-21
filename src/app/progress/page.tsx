"use client"

// TODO: Convert to Server Component - requires splitting into server data fetching + client interactive UI (charts, dialog, form)

import { useState, useEffect, useMemo } from "react"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatCard } from "@/components/ui/stat-card"
import { ProgressChart } from "@/components/charts/progress-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Scale,
  Percent,
  Dumbbell,
  Activity,
  TrendingDown,
  TrendingUp,
  Minus,
  History,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { useSound } from "@/hooks/use-sound"
import { cn, formatDate } from "@/lib/utils"
import { measurementFormError } from "@/constants/measurements"

interface BodyMeasurement {
  id: string
  date: string
  weight: number | null
  height: number | null
  bodyFat: number | null
  muscleMass: number | null
  bmi: number | null
  neck: number | null
  shoulders: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  leftArm: number | null
  rightArm: number | null
  leftForearm: number | null
  rightForearm: number | null
  leftThigh: number | null
  rightThigh: number | null
  leftCalf: number | null
  rightCalf: number | null
}

const emptyForm = {
  weight: "",
  height: "",
  bodyFat: "",
  muscleMass: "",
  neck: "",
  shoulders: "",
  chest: "",
  waist: "",
  hips: "",
  leftArm: "",
  rightArm: "",
  leftForearm: "",
  rightForearm: "",
  leftThigh: "",
  rightThigh: "",
  leftCalf: "",
  rightCalf: "",
}

const CHART_COLORS = {
  weight: "hsl(var(--chart-1))",
  bodyFat: "hsl(var(--chart-2))",
  muscleMass: "hsl(var(--chart-3))",
}

interface MetricDef {
  key: Exclude<keyof BodyMeasurement, "id" | "date">
  label: string
  unit: string
}

const KEY_METRICS: MetricDef[] = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "bodyFat", label: "Grasa", unit: "%" },
  { key: "muscleMass", label: "Masa muscular", unit: "kg" },
  { key: "bmi", label: "IMC", unit: "" },
]

function metricValue(
  m: BodyMeasurement,
  key: Exclude<keyof BodyMeasurement, "id" | "date">
): number | null {
  if (key === "bmi" && m.bmi == null && m.weight != null && m.height != null) {
    return m.weight / ((m.height / 100) * (m.height / 100))
  }
  return m[key]
}

function relativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return "hoy"
  if (days === 1) return "ayer"
  if (days < 7) return `hace ${days} días`
  if (days < 30) {
    const w = Math.floor(days / 7)
    return `hace ${w} semana${w !== 1 ? "s" : ""}`
  }
  if (days < 365) {
    const mo = Math.floor(days / 30)
    return `hace ${mo} mes${mo !== 1 ? "es" : ""}`
  }
  const y = Math.floor(days / 365)
  return `hace ${y} año${y !== 1 ? "s" : ""}`
}

function DeltaIndicator({ delta, unit }: { delta: number | null; unit?: string }) {
  if (delta == null) {
    return <span className="text-xs text-muted-foreground">Sin datos previos</span>
  }
  if (delta === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> Sin cambios
      </span>
    )
  }
  const Icon = delta < 0 ? TrendingDown : TrendingUp
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}
      {delta.toFixed(1)}
      {unit ? ` ${unit}` : ""} desde el inicio
    </span>
  )
}

export default function ProgressPage() {
  const { play } = useSound()
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [dialogOpen, setDialogOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("open")
  )
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/body-measurements")
      .then((r) => r.json())
      .then((d) => setMeasurements(d.measurements ?? []))
      .catch(() => toast.error("Error al cargar mediciones"))

    if (new URLSearchParams(window.location.search).has("open")) {
      window.history.replaceState({}, "", "/progress")
    }
  }, [])

  const bmi = useMemo(() => {
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    if (w > 0 && h > 0) return (w / ((h / 100) * (h / 100))).toFixed(1)
    return ""
  }, [form.weight, form.height])

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }
  function resetForm() {
    setForm(emptyForm)
  }

  async function handleSave() {
    const weight = parseFloat(form.weight) || undefined
    const height = parseFloat(form.height) || undefined
    const bodyFat = parseFloat(form.bodyFat) || undefined
    const muscleMass = parseFloat(form.muscleMass) || undefined
    const bmiVal = bmi ? parseFloat(bmi) : undefined
    const hasAnyValue = Object.entries(form).some(
      ([key, value]) => key !== "notes" && parseFloat(value) > 0
    )
    if (!hasAnyValue) {
      toast.error("Agrega al menos un valor")
      return
    }
    const rangeError = measurementFormError(form)
    if (rangeError) {
      toast.error(rangeError)
      return
    }
    setSaving(true)
    const p = (k: string) => parseFloat(form[k as keyof typeof form]) || undefined
    const res = await fetch("/api/body-measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weight,
        height,
        bodyFat,
        muscleMass,
        bmi: bmiVal,
        neck: p("neck"),
        shoulders: p("shoulders"),
        chest: p("chest"),
        waist: p("waist"),
        hips: p("hips"),
        leftArm: p("leftArm"),
        rightArm: p("rightArm"),
        leftForearm: p("leftForearm"),
        rightForearm: p("rightForearm"),
        leftThigh: p("leftThigh"),
        rightThigh: p("rightThigh"),
        leftCalf: p("leftCalf"),
        rightCalf: p("rightCalf"),
      }),
    })
    if (res.ok) {
      play("success")
      toast.success("Medición guardada")
      setDialogOpen(false)
      resetForm()
      const data = await fetch("/api/body-measurements").then((r) => r.json())
      setMeasurements(data.measurements ?? [])
    } else {
      toast.error("Error al guardar la medición")
    }
    setSaving(false)
  }

  const chartData = useMemo(
    () =>
      [...measurements]
        .filter((m) => m.weight != null || m.bodyFat != null || m.muscleMass != null)
        .reverse()
        .map((m) => ({
          date: formatDate(m.date),
          weight: m.weight,
          bodyFat: m.bodyFat,
          muscleMass: m.muscleMass,
        })),
    [measurements]
  )

  const weightPoints = chartData.filter((d) => d.weight != null)
  const hasBodyFatData = chartData.some((d) => d.bodyFat != null)
  const hasMuscleMassData = chartData.some((d) => d.muscleMass != null)

  const stats = useMemo(() => {
    const latest = measurements[0]
    const oldest = [...measurements].reverse()[0]
    const firstWeight = [...measurements].reverse().find((m) => m.weight != null)?.weight ?? null
    const lastWeight = measurements.find((m) => m.weight != null)?.weight ?? null
    const firstFat = [...measurements].reverse().find((m) => m.bodyFat != null)?.bodyFat ?? null
    const lastFat = measurements.find((m) => m.bodyFat != null)?.bodyFat ?? null
    const firstMuscle =
      [...measurements].reverse().find((m) => m.muscleMass != null)?.muscleMass ?? null
    const lastMuscle = measurements.find((m) => m.muscleMass != null)?.muscleMass ?? null
    const withBmi = measurements.find(
      (m) => m.bmi != null || (m.weight != null && m.height != null)
    )
    let bmi = withBmi?.bmi ?? null
    if (bmi == null && withBmi?.weight != null && withBmi?.height != null) {
      bmi = withBmi.weight / ((withBmi.height / 100) * (withBmi.height / 100))
    }
    return {
      weight: lastWeight,
      weightDelta: lastWeight != null && firstWeight != null ? lastWeight - firstWeight : null,
      bodyFat: lastFat,
      bodyFatDelta: lastFat != null && firstFat != null ? lastFat - firstFat : null,
      muscleMass: lastMuscle,
      muscleMassDelta: lastMuscle != null && firstMuscle != null ? lastMuscle - firstMuscle : null,
      bmi,
      bmiDate: withBmi?.date ?? latest?.date ?? oldest?.date ?? null,
    }
  }, [measurements])

  const avgWeight = useMemo(() => {
    if (weightPoints.length === 0) return null
    const sum = weightPoints.reduce((acc, d) => acc + (d.weight ?? 0), 0)
    return sum / weightPoints.length
  }, [weightPoints])

  const tableColumns = [
    { key: "weight", label: "Peso (kg)" },
    { key: "height", label: "Altura (cm)" },
    { key: "bodyFat", label: "% Grasa" },
    { key: "muscleMass", label: "Masa musc. (kg)" },
    { key: "bmi", label: "IMC" },
    { key: "neck", label: "Cuello" },
    { key: "shoulders", label: "Hombros" },
    { key: "chest", label: "Pecho" },
    { key: "waist", label: "Cintura" },
    { key: "hips", label: "Cadera" },
    { key: "leftArm", label: "Bíceps izq." },
    { key: "rightArm", label: "Bíceps der." },
    { key: "leftForearm", label: "Anteb. izq." },
    { key: "rightForearm", label: "Anteb. der." },
    { key: "leftThigh", label: "Muslo izq." },
    { key: "rightThigh", label: "Muslo der." },
    { key: "leftCalf", label: "Pant. izq." },
    { key: "rightCalf", label: "Pant. der." },
  ] as const

  const detailColumns = tableColumns.filter(
    (c) => c.key !== "weight" && c.key !== "bodyFat" && c.key !== "muscleMass" && c.key !== "bmi"
  )

  const measurementFields = [
    { key: "weight", label: "Peso (kg)", step: "0.1" },
    { key: "height", label: "Altura (cm)", step: "0.1" },
    { key: "bodyFat", label: "% Grasa corporal", step: "0.1" },
    { key: "muscleMass", label: "Masa muscular (kg)", step: "0.1" },
    { key: "neck", label: "Cuello (cm)", step: "0.1" },
    { key: "shoulders", label: "Hombros (cm)", step: "0.1" },
    { key: "chest", label: "Pecho (cm)", step: "0.1" },
    { key: "waist", label: "Cintura (cm)", step: "0.1" },
    { key: "hips", label: "Cadera (cm)", step: "0.1" },
    { key: "leftArm", label: "Bíceps izq. (cm)", step: "0.1" },
    { key: "rightArm", label: "Bíceps der. (cm)", step: "0.1" },
    { key: "leftForearm", label: "Antebrazo izq. (cm)", step: "0.1" },
    { key: "rightForearm", label: "Antebrazo der. (cm)", step: "0.1" },
    { key: "leftThigh", label: "Muslo izq. (cm)", step: "0.1" },
    { key: "rightThigh", label: "Muslo der. (cm)", step: "0.1" },
    { key: "leftCalf", label: "Pantorrilla izq. (cm)", step: "0.1" },
    { key: "rightCalf", label: "Pantorrilla der. (cm)", step: "0.1" },
  ]

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-8 max-w-4xl">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Progreso</h1>
              <p className="text-muted-foreground">Seguimiento de medidas corporales</p>
            </div>
            <Button
              onClick={() => {
                play("click")
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Nueva medición
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Peso actual" icon={Scale} delay={0.05}>
            <p className="text-3xl font-bold tabular-nums">
              {stats.weight != null ? stats.weight.toFixed(1) : "-"}
              <span className="text-sm font-normal text-muted-foreground"> kg</span>
            </p>
            <div className="mt-1">
              <DeltaIndicator delta={stats.weightDelta} unit="kg" />
            </div>
          </StatCard>
          <StatCard label="% Grasa corporal" icon={Percent} delay={0.1}>
            <p className="text-3xl font-bold tabular-nums">
              {stats.bodyFat != null ? stats.bodyFat.toFixed(1) : "-"}
              <span className="text-sm font-normal text-muted-foreground"> %</span>
            </p>
            <div className="mt-1">
              <DeltaIndicator delta={stats.bodyFatDelta} unit="pp" />
            </div>
          </StatCard>
          <StatCard label="Masa muscular" icon={Dumbbell} delay={0.15}>
            <p className="text-3xl font-bold tabular-nums">
              {stats.muscleMass != null ? stats.muscleMass.toFixed(1) : "-"}
              <span className="text-sm font-normal text-muted-foreground"> kg</span>
            </p>
            <div className="mt-1">
              <DeltaIndicator delta={stats.muscleMassDelta} unit="kg" />
            </div>
          </StatCard>
          <StatCard label="IMC" icon={Activity} delay={0.2}>
            <p className="text-3xl font-bold tabular-nums">
              {stats.bmi != null ? stats.bmi.toFixed(1) : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.bmiDate ? `Último registro: ${formatDate(stats.bmiDate)}` : "Sin registros"}
            </p>
          </StatCard>
        </div>

        <Tabs defaultValue="graficos">
          <TabsList variant="line" className="w-full justify-start border-b">
            <TabsTrigger value="graficos" className="gap-2">
              <TrendingUp className="size-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-2">
              <History className="size-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graficos" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-gold" />
                  Evolución del peso
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weightPoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sin datos de peso registrados
                  </p>
                ) : (
                  <ProgressChart
                    data={weightPoints}
                    xKey="date"
                    series={[
                      {
                        key: "weight",
                        label: "Peso (kg)",
                        color: CHART_COLORS.weight,
                        unit: "kg",
                        showArea: true,
                      },
                    ]}
                    referenceLine={
                      avgWeight != null
                        ? { value: avgWeight, label: `Promedio ${avgWeight.toFixed(1)}` }
                        : undefined
                    }
                  />
                )}
              </CardContent>
            </Card>

            {(hasBodyFatData || hasMuscleMassData) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-gold" />
                    Composición corporal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressChart
                    data={chartData}
                    xKey="date"
                    series={[
                      ...(hasBodyFatData
                        ? [
                            {
                              key: "bodyFat",
                              label: "% Grasa",
                              color: CHART_COLORS.bodyFat,
                              unit: "%",
                              showArea: true,
                            },
                          ]
                        : []),
                      ...(hasMuscleMassData
                        ? [
                            {
                              key: "muscleMass",
                              label: "Masa muscular (kg)",
                              color: CHART_COLORS.muscleMass,
                              unit: "kg",
                              yAxisId: "right" as const,
                            },
                          ]
                        : []),
                    ]}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="historial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Historial de mediciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {measurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay mediciones registradas todavía
                  </p>
                ) : (
                  measurements.map((m, i) => {
                    const prev = measurements[i + 1]
                    const isExpanded = expandedId === m.id
                    return (
                      <div key={m.id} className="rounded-lg border">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                          className="flex w-full items-center justify-between gap-3 p-3 text-left"
                        >
                          <div>
                            <p className="text-sm font-medium">{formatDate(m.date)}</p>
                            <p className="text-xs text-muted-foreground">{relativeDays(m.date)}</p>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>

                        <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4">
                          {KEY_METRICS.map((metric) => {
                            const value = metricValue(m, metric.key)
                            const prevValue = prev ? metricValue(prev, metric.key) : null
                            const delta =
                              value != null && prevValue != null ? value - prevValue : null
                            return (
                              <div
                                key={metric.key}
                                className="rounded-lg bg-muted/50 p-2 text-center"
                              >
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {metric.label}
                                </p>
                                <p className="mt-0.5 text-sm font-bold tabular-nums">
                                  {value != null ? value.toFixed(1) : "-"}
                                  {metric.unit && (
                                    <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                                      {metric.unit}
                                    </span>
                                  )}
                                </p>
                                {delta != null && delta !== 0 && (
                                  <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground tabular-nums">
                                    {delta < 0 ? (
                                      <TrendingDown className="h-2.5 w-2.5" />
                                    ) : (
                                      <TrendingUp className="h-2.5 w-2.5" />
                                    )}
                                    {delta > 0 ? "+" : ""}
                                    {delta.toFixed(1)}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {isExpanded && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t px-3 py-3 sm:grid-cols-3">
                            {detailColumns.map((col) => {
                              const v = m[col.key]
                              return (
                                <div
                                  key={col.key}
                                  className="flex items-baseline justify-between gap-2"
                                >
                                  <span className="text-xs text-muted-foreground">{col.label}</span>
                                  <span className="text-xs font-medium tabular-nums">
                                    {v != null ? v : "-"}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva medición</DialogTitle>
              <DialogDescription>
                Registra tus medidas corporales. Deja en blanco los campos que no necesites.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {measurementFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type="number"
                    step={field.step}
                    min={0}
                    placeholder="-"
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="bmi">IMC</Label>
                <Input
                  id="bmi"
                  value={bmi}
                  readOnly
                  className="bg-muted"
                  placeholder="Auto-calculado"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se calcula automáticamente con peso y altura
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  play("click")
                  setDialogOpen(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
