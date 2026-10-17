"use client"

import { useId } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export interface ChartSeries {
  key: string
  label: string
  color: string
  unit?: string
  showArea?: boolean
  yAxisId?: "left" | "right"
}

interface ChartTooltipProps<T extends object> {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number | string; color?: string }>
  label?: string | number
  data: T[]
  xKey: string
  series: ChartSeries[]
}

function formatChartValue(value: number | string | undefined, unit?: string) {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : parseFloat(value)
  if (Number.isNaN(n)) return null
  const formatted = n.toFixed(1).replace(/\.0$/, "")
  return unit ? `${formatted} ${unit}` : formatted
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (value == null) return null
  const n = parseFloat(String(value))
  return Number.isNaN(n) ? null : n
}

function ChartTooltip<T extends object>({
  active,
  payload,
  label,
  data,
  xKey,
  series,
}: ChartTooltipProps<T>) {
  if (!active || !payload?.length || label == null) return null
  const idx = data.findIndex((d) => String((d as Record<string, unknown>)[xKey]) === String(label))
  const prev = idx > 0 ? data[idx - 1] : undefined

  return (
    <div className="rounded-lg border bg-popover/95 px-3 py-2.5 text-popover-foreground shadow-md backdrop-blur-sm min-w-[180px]">
      <p className="mb-1.5 text-xs font-semibold text-foreground/70">{label}</p>
      <div className="space-y-1">
        {series.map((s) => {
          const entry = payload.find((p) => String(p.dataKey) === s.key)
          const current = toNumber(entry?.value)
          const previous = prev ? toNumber((prev as Record<string, unknown>)[s.key]) : null
          const delta = current != null && previous != null ? current - previous : null
          return (
            <div key={s.key} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-foreground/70">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="flex items-baseline gap-1.5 tabular-nums">
                <span className="font-semibold">{formatChartValue(entry?.value, s.unit)}</span>
                {delta != null && delta !== 0 && (
                  <span className="text-[10px] text-foreground/60 tabular-nums">
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1).replace(/\.0$/, "")}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ProgressChartProps<T extends object> {
  data: T[]
  xKey: string
  series: ChartSeries[]
  height?: number
  referenceLine?: { value: number; label: string }
}

export function ProgressChart<T extends object>({
  data,
  xKey,
  series,
  height = 288,
  referenceLine,
}: ProgressChartProps<T>) {
  const gradientId = useId().replace(/:/g, "")
  const leftSeries = series.filter((s) => s.yAxisId !== "right")
  const rightSeries = series.filter((s) => s.yAxisId === "right")

  return (
    <div style={{ height, minHeight: height }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={height} minHeight={height}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: rightSeries.length > 0 ? 8 : 16, bottom: 4, left: 0 }}
        >
          <defs>
            {series
              .filter((s) => s.showArea)
              .map((s) => (
                <linearGradient
                  key={s.key}
                  id={`${gradientId}-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={leftSeries.length > 0 ? ["dataMin - 1", "dataMax + 1"] : undefined}
          />
          {rightSeries.length > 0 && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={["dataMin - 1", "dataMax + 1"]}
            />
          )}
          <Tooltip
            cursor={{ stroke: "var(--chart-grid)", strokeDasharray: "4 4" }}
            content={<ChartTooltip data={data} xKey={xKey} series={series} />}
          />
          {referenceLine && (
            <ReferenceLine
              yAxisId="left"
              y={referenceLine.value}
              stroke="var(--chart-grid)"
              strokeOpacity={0.8}
              strokeDasharray="5 5"
              label={{
                value: referenceLine.label,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--chart-axis)",
              }}
            />
          )}
          <Legend
            iconType="plainline"
            iconSize={12}
            wrapperStyle={{ fontSize: 12, color: "var(--chart-axis)", paddingTop: 4 }}
          />
          {series.map((s) =>
            s.showArea ? (
              <Area
                key={s.key}
                yAxisId={s.yAxisId ?? "left"}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#${gradientId}-${s.key})`}
                connectNulls
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
              />
            ) : (
              <Line
                key={s.key}
                yAxisId={s.yAxisId ?? "left"}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.yAxisId === "right" ? "6 3" : undefined}
                connectNulls
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
              />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
