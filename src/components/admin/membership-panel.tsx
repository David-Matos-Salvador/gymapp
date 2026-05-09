"use client"

import { useState } from "react"
import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, CheckCircle2, RefreshCw, Clock, AlertCircle, User, CalendarDays, Banknote, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface MembershipUser {
  id: string
  name: string | null
  email: string
}

interface MembershipPlan {
  id: string
  name: string
  price: number
  currency: string
  durationDays: number
}

interface Membership {
  id: string
  userId: string
  planId: string
  status: string
  startDate: string
  endDate: string
  autoRenew: boolean
  paymentConfirmed: boolean
  paymentMethod: string
  paymentRef: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  user: MembershipUser
  plan: MembershipPlan
}

interface MembershipPanelProps {
  memberships: Membership[]
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  STRIPE: "Stripe",
  OTHER: "Otro",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return { label: "Pendiente", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" }
    case "COMPLETED":
      return { label: "Completado", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" }
    case "FAILED":
      return { label: "Fallido", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" }
    default:
      return { label: status, className: "bg-muted text-muted-foreground" }
  }
}

export function MembershipPanel({ memberships }: MembershipPanelProps) {
  const { play } = useSound()
  const [data, setData] = useState<Membership[]>(memberships)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  const pending = data.filter(
    (m) => m.status === "ACTIVE" && !m.paymentConfirmed
  )
  const active = data.filter(
    (m) => m.status === "ACTIVE" && m.paymentConfirmed
  )
  const expired = data.filter(
    (m) => m.status === "EXPIRED" || (m.status === "ACTIVE" && new Date(m.endDate) < new Date())
  )

  function filterBySearch(list: Membership[]) {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (m) =>
        m.user.name?.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        m.plan.name.toLowerCase().includes(q)
    )
  }

  async function handleConfirmPayment(id: string) {
    setLoading(id)
    play("select")
    const res = await fetch(`/api/memberships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentConfirmed: true }),
    })
    if (res.ok) {
      const json = await res.json()
      setData((prev) =>
        prev.map((m) => (m.id === id ? { ...m, paymentConfirmed: true, updatedAt: json.membership.updatedAt } : m))
      )
      play("success")
      toast.success("Pago confirmado correctamente")
    } else {
      const json = await res.json()
      toast.error(json.error ?? "Error al confirmar pago")
    }
    setLoading(null)
  }

  async function handleRenew(id: string) {
    setLoading(id)
    play("select")
    const planDays = data.find((m) => m.id === id)?.plan.durationDays ?? 30
    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + planDays)

    const res = await fetch(`/api/memberships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "ACTIVE",
        paymentConfirmed: false,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    })
    if (res.ok) {
      const json = await res.json()
      setData((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status: "ACTIVE",
                paymentConfirmed: false,
                startDate: json.membership.startDate,
                endDate: json.membership.endDate,
                updatedAt: json.membership.updatedAt,
              }
            : m
        )
      )
      play("success")
      toast.success("Membresía renovada correctamente")
    } else {
      const json = await res.json()
      toast.error(json.error ?? "Error al renovar membresía")
    }
    setLoading(null)
  }

  function renderMembershipList(list: Membership[], emptyMessage: string) {
    const filtered = filterBySearch(list)

    if (filtered.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-3">
        {filtered.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
          >
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {m.user.name?.[0] ?? m.user.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.user.name ?? "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.user.email}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {m.plan.name}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(m.startDate)} — {formatDate(m.endDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Banknote className="h-3 w-3" />
                    {m.plan.currency.toUpperCase()} ${m.plan.price}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {paymentMethodLabels[m.paymentMethod] ?? m.paymentMethod}
                  </span>

                  {!m.paymentConfirmed && m.status === "ACTIVE" ? (
                    <Button
                      size="xs"
                      onClick={() => handleConfirmPayment(m.id)}
                      disabled={loading === m.id}
                      className="h-6 text-[10px]"
                    >
                      {loading === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      Confirmar pago
                    </Button>
                  ) : m.paymentConfirmed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Pagado
                    </span>
                  ) : null}

                  {(m.status === "EXPIRED" || (m.status === "ACTIVE" && new Date(m.endDate) < new Date())) && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleRenew(m.id)}
                      disabled={loading === m.id}
                      className="h-6 text-[10px]"
                    >
                      {loading === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Renovar
                    </Button>
                  )}
                </div>

                {m.paymentRef && (
                  <p className="text-[10px] text-muted-foreground">
                    Ref: {m.paymentRef}
                  </p>
                )}
                {m.notes && (
                  <p className="text-[10px] text-muted-foreground italic">
                    {m.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o plan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Activas ({active.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Vencidas ({expired.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {renderMembershipList(pending, "No hay membresías con pago pendiente")}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {renderMembershipList(active, "No hay membresías activas")}
        </TabsContent>

        <TabsContent value="expired" className="mt-4">
          {renderMembershipList(expired, "No hay membresías vencidas")}
        </TabsContent>
      </Tabs>
    </div>
  )
}
