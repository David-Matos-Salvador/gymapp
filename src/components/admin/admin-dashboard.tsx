"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BadgeCheck,
  Banknote,
  UserPlus,
  CalendarCheck,
  Clock,
  Users,
} from "lucide-react"

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

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(amount)
}

const statCards = [
  {
    label: "Membresías activas",
    value: (s: AdminStats) => s.totalActiveMemberships,
    icon: BadgeCheck,
    color: "border-t-accent-yellow",
    iconColor: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
    suffix: "",
  },
  {
    label: "Ingresos del mes",
    value: (s: AdminStats) => formatCurrency(s.monthlyIncome),
    icon: Banknote,
    color: "border-t-accent-yellow",
    iconColor: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
    suffix: "",
  },
  {
    label: "Nuevos miembros",
    value: (s: AdminStats) => s.newMembersThisMonth,
    icon: UserPlus,
    color: "border-t-accent-yellow",
    iconColor: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
    suffix: "este mes",
  },
  {
    label: "Asistencia diaria",
    value: (s: AdminStats) => s.avgDailyAttendance,
    icon: CalendarCheck,
    color: "border-t-primary",
    iconColor: "text-primary",
    bg: "bg-primary/10",
    suffix: "promedio semanal",
  },
]

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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => {
          const value = card.value(stats)
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`hover:shadow-md transition-all border-t-2 ${card.color}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                    <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{value}</p>
                  {card.suffix && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.suffix}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
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
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay membresías por vencer en los próximos 7 días
              </p>
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
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay registros de asistencia
              </p>
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
