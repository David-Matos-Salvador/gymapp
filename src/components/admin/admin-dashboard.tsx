"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  BadgeCheck,
  Banknote,
  UserPlus,
  CalendarCheck,
  Clock,
  Users,
  Dumbbell,
  ArrowRight,
  Wrench,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"

interface AdminStats {
  totalActiveMemberships: number
  monthlyIncome: number
  newMembersThisMonth: number
  avgDailyAttendance: number
  totalMembers: number
  activeEquipment: number
  activeExercises: number
  pendingPayments: number
}

interface ExpiringMembership {
  id: string
  userName: string
  planName: string
  endDate: string
}

interface RecentCheckIn {
  id: string
  userName: string
  date: string
}

interface RecentWorkout {
  id: string
  planName: string
  userName: string
  date: string
}

export function AdminDashboard({
  gymName,
  stats,
  expiringMemberships,
  recentCheckIns,
  recentWorkouts,
}: {
  gymName: string | null
  stats: AdminStats
  expiringMemberships: ExpiringMembership[]
  recentCheckIns: RecentCheckIn[]
  recentWorkouts: RecentWorkout[]
}) {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {gymName ?? "Panel de Administración"}
        </h1>
        <p className="text-muted-foreground">Resumen de tu gimnasio</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Link href="/admin/gym-management">
            <Button variant="outline" size="sm" className="gap-2">
              <Dumbbell className="size-4" />
              Gestión de Ejercicios y Rutinas
              <ArrowRight className="size-3" />
            </Button>
          </Link>
          <Link href="/admin/memberships">
            <Button variant="outline" size="sm" className="gap-2">
              <BadgeCheck className="size-4" />
              Membresías
              <ArrowRight className="size-3" />
            </Button>
          </Link>
          {stats.pendingPayments > 0 && (
            <Link href="/coach/payments">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Clock className="size-4" />
                {stats.pendingPayments}{" "}
                {stats.pendingPayments === 1 ? "pago pendiente" : "pagos pendientes"}
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Membresías activas"
          value={stats.totalActiveMemberships}
          icon={BadgeCheck}
          delay={0}
        />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(stats.monthlyIncome)}
          icon={Banknote}
          delay={0.05}
        />
        <StatCard
          label="Nuevos miembros"
          value={stats.newMembersThisMonth}
          icon={UserPlus}
          suffix="este mes"
          delay={0.1}
        />
        <StatCard label="Total miembros" value={stats.totalMembers} icon={Users} delay={0.15} />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Equipamiento activo"
          value={stats.activeEquipment}
          icon={Wrench}
          iconColor="text-gold"
          borderColor="border-t-primary"
          suffix="equipos"
          delay={0.18}
        />
        <StatCard
          label="Ejercicios activos"
          value={stats.activeExercises}
          icon={Dumbbell}
          suffix="disponibles"
          delay={0.21}
        />
        <StatCard
          label="Asistencia diaria"
          value={stats.avgDailyAttendance}
          icon={CalendarCheck}
          iconColor="text-gold"
          borderColor="border-t-primary"
          suffix="promedio de 7 días"
          delay={0.24}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold" />
                <CardTitle className="text-base">Membresías por vencer</CardTitle>
              </div>
              {expiringMemberships.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {expiringMemberships.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {expiringMemberships.length === 0 ? (
                <EmptyState message="Todo al día por ahora" className="py-4" />
              ) : (
                expiringMemberships.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-yellow/10">
                      <Users className="h-4 w-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.userName}</p>
                      <p className="text-xs text-muted-foreground">{m.planName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Vence</p>
                      <p className="text-sm font-medium text-gold">{formatDate(m.endDate)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-gold" />
                <CardTitle className="text-base">Actividad reciente</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentWorkouts.length === 0 && recentCheckIns.length === 0 ? (
                <EmptyState message="Sin actividad reciente" className="py-4" />
              ) : (
                <>
                  {recentWorkouts.slice(0, 4).map((w, i) => (
                    <div
                      key={`w-${w.id}-${i}`}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-yellow/10">
                        <Dumbbell className="h-4 w-4 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{w.userName} entrenó</p>
                        <p className="text-xs text-muted-foreground truncate">{w.planName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{formatDate(w.date)}</p>
                    </div>
                  ))}
                  {recentCheckIns.slice(0, Math.max(0, 4 - recentWorkouts.length)).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-yellow/10">
                        <CalendarCheck className="h-4 w-4 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.userName}</p>
                        <p className="text-xs text-muted-foreground">Check-in</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{formatDate(c.date)}</p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
