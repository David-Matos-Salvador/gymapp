"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Plus } from "lucide-react"
import Link from "next/link"

const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false })
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false })
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false })

const TOOLTIP_STYLE = {
  fontSize: "12px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
}

const LOADING_SKELETON = (
  <Card className="rounded-xl">
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-24" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-[180px] w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </CardContent>
  </Card>
)

interface MeasurementPoint {
  date: string
  weight: number | null
}

export function MiniProgressSection() {
  const [measurements, setMeasurements] = useState<MeasurementPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchData() {
      try {
        const res = await fetch("/api/body-measurements?limit=30", {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error("Error al cargar")
        const json = await res.json()
        const points: MeasurementPoint[] = (json.data ?? [])
          .map((m: { date: string; weight: number | null }) => ({
            date: new Date(m.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
            weight: m.weight,
          }))
          .reverse()
        setMeasurements(points.filter((p) => p.weight !== null))
      } catch {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }
    fetchData()
    return () => controller.abort()
  }, [])

  if (loading) return LOADING_SKELETON

  const lastWeight = measurements.length > 0 ? measurements[measurements.length - 1]?.weight ?? null : null
  const firstWeight = measurements.length > 0 ? measurements[0]?.weight ?? null : null
  const weightChange = lastWeight !== null && firstWeight !== null ? lastWeight - firstWeight : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="rounded-xl">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent-yellow" />
            Progreso
          </CardTitle>
          <Link
            href="/progress"
            className="text-xs font-medium text-accent-yellow hover:underline"
          >
            Ver todo →
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {measurements.length > 0 ? (
            <>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurements}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tick={{ fontSize: 10 }}
                      width={40}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="oklch(0.62 0.19 145)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "oklch(0.62 0.19 145)" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Peso actual
                  </p>
                  <p className="text-lg font-bold tabular-nums">
                    {lastWeight?.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground"> kg</span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Cambio
                  </p>
                  <p
                    className={`text-lg font-bold tabular-nums ${
                      weightChange !== null && weightChange < 0
                        ? "text-accent-yellow"
                        : weightChange !== null && weightChange > 0
                          ? "text-accent-yellow"
                          : "text-muted-foreground"
                    }`}
                  >
                    {weightChange !== null
                      ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)}`
                      : "-"}
                    <span className="text-xs font-normal text-muted-foreground"> kg</span>
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground text-center">
                No hay mediciones en los últimos 30 días
              </p>
              <Link href="/progress?open=add">
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Plus className="mr-1 h-4 w-4" />
                  Registrar ahora
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
