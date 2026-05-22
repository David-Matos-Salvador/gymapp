"use client"

import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, CalendarDays } from "lucide-react"

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false })
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false })
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false })
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false })
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false })

const TOOLTIP_STYLE = {
  fontSize: "12px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
}

interface Measurement {
  date: string
  weight: number
}

interface Workout {
  week: string
  count: number
}

interface TrainerClientProgressChartProps {
  measurements: Measurement[]
  workouts: Workout[]
}

export function TrainerClientProgressChart({
  measurements,
  workouts,
}: TrainerClientProgressChartProps) {
  const hasWeightData = measurements.length > 0
  const hasWorkoutData = workouts.length > 0
  const hasNoData = !hasWeightData && !hasWorkoutData

  if (hasNoData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid gap-6 md:grid-cols-2"
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Sin datos de peso registrados aún
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Sin registros de entrenamientos
            </p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const weightChartData = measurements.map((m) => ({
    ...m,
    date: new Date(m.date).toLocaleDateString("es", { day: "numeric", month: "short" }),
  }))

  const lastWeight = measurements[measurements.length - 1]?.weight ?? null
  const firstWeight = measurements[0]?.weight ?? null
  const weightChange =
    lastWeight !== null && firstWeight !== null ? lastWeight - firstWeight : null

  const totalWorkouts = workouts.reduce((sum, w) => sum + w.count, 0)

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid gap-4 grid-cols-2"
      >
        <div className="rounded-lg bg-accent-yellow/10 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Peso actual
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">
            {lastWeight !== null ? `${lastWeight.toFixed(1)} kg` : "-"}
          </p>
          {weightChange !== null && (
            <p
              className={`text-xs font-medium mt-1 ${
                weightChange < 0 ? "text-emerald-500" : "text-accent-yellow"
              }`}
            >
              {weightChange > 0 ? "+" : ""}
              {weightChange.toFixed(1)} kg desde inicio
            </p>
          )}
        </div>
        <div className="rounded-lg bg-accent-yellow/10 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Entrenamientos
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{totalWorkouts}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            en {workouts.length} semanas
          </p>
        </div>
      </motion.div>

      {hasWeightData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent-yellow" />
                Evolución del peso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tick={{ fontSize: 10 }}
                      width={45}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name="Peso (kg)"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {hasWorkoutData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent-yellow" />
                Frecuencia de entrenamiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workouts}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      width={30}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar
                      dataKey="count"
                      name="Entrenamientos"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
