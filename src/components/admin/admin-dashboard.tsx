"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"

interface AdminStats {
  totalActiveMemberships: number
  monthlyIncome: number
  newMembersThisMonth: number
  avgDailyAttendance: number
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

export function AdminDashboard({
  stats,
  expiringMemberships,
  recentCheckIns,
}: {
  stats: AdminStats
  expiringMemberships: ExpiringMembership[]
  recentCheckIns: RecentCheckIn[]
}) {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Panel de Administración
        </h1>
        <p className="text-muted-foreground">Gestión general del gimnasio</p>
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard
          label="Asistencia diaria"
          value={stats.avgDailyAttendance}
          icon={CalendarCheck}
          iconColor="text-primary"
          borderColor="border-t-primary"
          suffix="promedio semanal"
          delay={0.15}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent-yellow" />
              <CardTitle>Membresías próximas a vencer</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {expiringMemberships.length === 0 ? (
              <EmptyState message="No hay membresías por vencer en los próximos 7 días" />
            ) : (
              <div className="space-y-2">
                {expiringMemberships.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-yellow/10">
                      <Users className="h-4 w-4 text-accent-yellow" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.planName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Vence</p>
                      <p className="text-sm font-medium text-accent-yellow">
                        {formatDate(m.endDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-accent-yellow" />
              <CardTitle>Últimos check-ins</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentCheckIns.length === 0 ? (
              <EmptyState message="No hay registros de asistencia" />
            ) : (
              <div className="space-y-2">
                {recentCheckIns.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-yellow/10">
                      <CalendarCheck className="h-4 w-4 text-accent-yellow" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.userName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(c.date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
