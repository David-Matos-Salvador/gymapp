"use client"

// TODO: Convert to Server Component - requires splitting into server data fetching + client interactive UI (charts, dialog, form)

import { useState, useEffect, useMemo } from "react"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useSound } from "@/hooks/use-sound"

interface BodyMeasurement {
  id: string; date: string; weight: number | null; height: number | null;
  bodyFat: number | null; bmi: number | null; neck: number | null;
  shoulders: number | null; chest: number | null; waist: number | null;
  hips: number | null; leftArm: number | null; leftThigh: number | null; leftCalf: number | null;
}

const emptyForm = { weight: "", height: "", bodyFat: "", neck: "", shoulders: "", chest: "", waist: "", hips: "", arms: "", thighs: "", calves: "" }

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" })
}

export default function ProgressPage() {
  const { play } = useSound()
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetch("/api/body-measurements")
      .then((r) => r.json()).then((d) => setMeasurements(d.measurements ?? []))
      .catch(() => toast.error("Error al cargar mediciones"))
  }, [])

  const bmi = useMemo(() => {
    const w = parseFloat(form.weight); const h = parseFloat(form.height)
    if (w > 0 && h > 0) return (w / ((h / 100) * (h / 100))).toFixed(1)
    return ""
  }, [form.weight, form.height])

  function updateField(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })) }
  function resetForm() { setForm(emptyForm) }

  async function handleSave() {
    const weight = parseFloat(form.weight) || undefined
    const height = parseFloat(form.height) || undefined
    const bodyFat = parseFloat(form.bodyFat) || undefined
    const bmiVal = bmi ? parseFloat(bmi) : undefined
    if (!weight && !height && !bodyFat) { toast.error("Agrega al menos un valor"); return }
    setSaving(true)
    const res = await fetch("/api/body-measurements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weight, height, bodyFat, bmi: bmiVal,
        neck: parseFloat(form.neck) || undefined,
        shoulders: parseFloat(form.shoulders) || undefined,
        chest: parseFloat(form.chest) || undefined,
        waist: parseFloat(form.waist) || undefined,
        hips: parseFloat(form.hips) || undefined,
        leftArm: parseFloat(form.arms) || undefined,
        leftThigh: parseFloat(form.thighs) || undefined,
        leftCalf: parseFloat(form.calves) || undefined,
      }),
    })
    if (res.ok) {
      play("success"); toast.success("Medición guardada")
      setDialogOpen(false); resetForm()
      const data = await fetch("/api/body-measurements").then((r) => r.json())
      setMeasurements(data.measurements ?? [])
    } else { toast.error("Error al guardar la medición") }
    setSaving(false)
  }

  const chartData = useMemo(() =>
    [...measurements].filter((m) => m.weight != null).reverse().map((m) => ({
      date: formatDate(m.date), weight: m.weight, bodyFat: m.bodyFat,
    })), [measurements])

  const hasBodyFatData = chartData.some((d) => d.bodyFat != null)

  const tableColumns = [
    { key: "weight", label: "Peso (kg)" }, { key: "height", label: "Altura (cm)" },
    { key: "bodyFat", label: "% Grasa" }, { key: "bmi", label: "IMC" },
    { key: "chest", label: "Pecho" }, { key: "waist", label: "Cintura" }, { key: "hips", label: "Cadera" },
  ] as const

  const measurementFields = [
    { key: "weight", label: "Peso (kg)", step: "0.1" },
    { key: "height", label: "Altura (cm)", step: "0.1" },
    { key: "bodyFat", label: "% Grasa corporal", step: "0.1" },
    { key: "neck", label: "Cuello (cm)", step: "0.1" },
    { key: "shoulders", label: "Hombros (cm)", step: "0.1" },
    { key: "chest", label: "Pecho (cm)", step: "0.1" },
    { key: "waist", label: "Cintura (cm)", step: "0.1" },
    { key: "hips", label: "Cadera (cm)", step: "0.1" },
    { key: "arms", label: "Brazos (cm)", step: "0.1" },
    { key: "thighs", label: "Muslos (cm)", step: "0.1" },
    { key: "calves", label: "Pantorrillas (cm)", step: "0.1" },
  ]

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Progreso</h1>
            <p className="text-muted-foreground">Seguimiento de medidas corporales</p>
          </div>
          <Button onClick={() => { play("click"); setDialogOpen(true) }}>
            <Plus className="h-4 w-4" /> Nueva medición
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Evolución del peso</CardTitle></CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos de peso registrados</p>
            ) : (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip /><Legend />
                    <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {hasBodyFatData && (
          <Card>
            <CardHeader><CardTitle>% Grasa corporal</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.filter((d) => d.bodyFat != null)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip /><Legend />
                    <Line type="monotone" dataKey="bodyFat" name="% Grasa" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Historial de mediciones</CardTitle></CardHeader>
          <CardContent>
            {measurements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay mediciones registradas todavía</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-1 font-medium text-muted-foreground">Fecha</th>
                      {tableColumns.map((col) => (
                        <th key={col.key} className="text-right py-2 px-1 font-medium text-muted-foreground">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m) => (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-1 whitespace-nowrap">{formatDate(m.date)}</td>
                        {tableColumns.map((col) => (
                          <td key={col.key} className="py-2 px-1 text-right tabular-nums">{m[col.key] != null ? m[col.key] : "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva medición</DialogTitle>
              <DialogDescription>Registra tus medidas corporales. Deja en blanco los campos que no necesites.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {measurementFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input id={field.key} type="number" step={field.step} min={0} placeholder="-"
                    value={form[field.key as keyof typeof form]} onChange={(e) => updateField(field.key, e.target.value)} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="bmi">IMC</Label>
                <Input id="bmi" value={bmi} readOnly className="bg-muted" placeholder="Auto-calculado" />
                <p className="text-[10px] text-muted-foreground">Se calcula automáticamente con peso y altura</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { play("click"); setDialogOpen(false); resetForm() }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
