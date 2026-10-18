"use client"

import { useState } from "react"
import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  CheckCircle2,
  RefreshCw,
  Clock,
  CalendarDays,
  Banknote,
  Loader2,
  Building2,
  UserRound,
  Eye,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  canRenewMembership,
  getMembershipStatusLabel,
  getMembershipTab,
} from "@/lib/membership-status"

interface MembershipUser {
  id: string
  name: string | null
  email: string
  assignedTrainer: { name: string | null } | null
}

interface MembershipPlan {
  id: string
  name: string
  price: number
  currency: string
  durationDays: number
  gym: { name: string } | null
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

interface PendingPayment {
  id: string
  userId: string
  amount: number
  currency: string
  method: string
  receiptUrl: string | null
  createdAt: string
}

interface MembershipPanelProps {
  memberships: Membership[]
  pendingPayments: PendingPayment[]
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  STRIPE: "Stripe",
  OTHER: "Otro",
}

export function MembershipPanel({ memberships, pendingPayments }: MembershipPanelProps) {
  const { play } = useSound()
  const [data, setData] = useState<Membership[]>(memberships)
  const [pendingReceipts, setPendingReceipts] = useState<PendingPayment[]>(pendingPayments)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  const pendingByUser = new Map<string, PendingPayment>()
  for (const payment of pendingReceipts) {
    if (!pendingByUser.has(payment.userId)) pendingByUser.set(payment.userId, payment)
  }

  // D-02: every membership belongs to exactly one tab. A pending receipt always
  // goes to Pendientes so the admin can review the capture before confirming.
  const now = new Date()
  const pending = data.filter(
    (m) => pendingByUser.has(m.userId) || getMembershipTab(m, now) === "pending"
  )
  const active = data.filter(
    (m) => !pendingByUser.has(m.userId) && getMembershipTab(m, now) === "active"
  )
  const expired = data.filter(
    (m) => !pendingByUser.has(m.userId) && getMembershipTab(m, now) === "expired"
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

  async function handleMarkPaid(id: string) {
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
        prev.map((m) =>
          m.id === id ? { ...m, paymentConfirmed: true, updatedAt: json.membership.updatedAt } : m
        )
      )
      play("success")
      toast.success("Membresía marcada como pagada")
    } else {
      const json = await res.json()
      toast.error(json.error ?? "Error al confirmar pago")
    }
    setLoading(null)
  }

  async function handleConfirmReceipt(paymentId: string, membershipId: string) {
    setLoading(membershipId)
    play("select")
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM" }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? "Error al confirmar el comprobante")
        return
      }
      setData((prev) =>
        prev.map((m) => (m.id === membershipId ? { ...m, paymentConfirmed: true } : m))
      )
      setPendingReceipts((prev) => prev.filter((p) => p.id !== paymentId))
      play("success")
      toast.success("Comprobante confirmado")
    } finally {
      setLoading(null)
    }
  }

  async function handleRejectReceipt(paymentId: string, membershipId: string) {
    setLoading(membershipId)
    play("select")
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          notes: "Comprobante rechazado por el administrador",
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? "Error al rechazar el comprobante")
        return
      }
      setData((prev) =>
        prev.map((m) => (m.id === membershipId ? { ...m, paymentConfirmed: false } : m))
      )
      setPendingReceipts((prev) => prev.filter((p) => p.id !== paymentId))
      play("success")
      toast.success("Comprobante rechazado")
    } finally {
      setLoading(null)
    }
  }

  async function handleRenew(id: string) {
    setLoading(id)
    play("select")

    // D-01: the server calculates the renewal dates. The client never sends dates.
    const res = await fetch(`/api/memberships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renew: true }),
    })
    if (res.ok) {
      const json = await res.json()
      setData((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status: json.membership.status,
                paymentConfirmed: json.membership.paymentConfirmed,
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
        {filtered.map((m, i) => {
          const pendingPayment = pendingByUser.get(m.userId)
          return (
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
                        <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          m.status === "ACTIVE"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                        }`}
                      >
                        {getMembershipStatusLabel(m.status)}
                      </span>
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {m.plan.name}
                      </span>
                    </div>
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
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {m.plan.gym?.name ?? "Sin gimnasio"}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserRound className="h-3 w-3" />
                      {m.user.assignedTrainer?.name ?? "Sin coach"}
                    </span>
                  </div>

                  {pendingPayment && (
                    <div className="flex items-center gap-3 rounded-lg border p-2">
                      {pendingPayment.receiptUrl ? (
                        <a
                          href={pendingPayment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={pendingPayment.receiptUrl}
                            alt="Comprobante de pago"
                            className="h-14 w-14 rounded border object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground">
                          Sin imagen
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">Comprobante pendiente</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatCurrency(pendingPayment.amount, pendingPayment.currency)} ·{" "}
                          {formatDate(pendingPayment.createdAt)}
                        </p>
                        {pendingPayment.receiptUrl && (
                          <a
                            href={pendingPayment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-accent-yellow hover:underline"
                          >
                            <Eye className="h-3 w-3" />
                            Ver captura
                          </a>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        <Button
                          size="xs"
                          onClick={() => handleConfirmReceipt(pendingPayment.id, m.id)}
                          disabled={loading === m.id}
                          className="h-6 text-[10px]"
                        >
                          {loading === m.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Confirmar
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleRejectReceipt(pendingPayment.id, m.id)}
                          disabled={loading === m.id}
                          className="h-6 text-[10px]"
                        >
                          <XCircle className="h-3 w-3" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {paymentMethodLabels[m.paymentMethod] ?? m.paymentMethod}
                    </span>

                    {!m.paymentConfirmed && m.status === "ACTIVE" && !pendingPayment ? (
                      <Button
                        size="xs"
                        onClick={() => handleMarkPaid(m.id)}
                        disabled={loading === m.id}
                        className="h-6 text-[10px]"
                      >
                        {loading === m.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Marcar pagado
                      </Button>
                    ) : m.paymentConfirmed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Pagado
                      </span>
                    ) : null}

                    {canRenewMembership(m, now) && (
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
                    <p className="text-[10px] text-muted-foreground">Ref: {m.paymentRef}</p>
                  )}
                  {m.notes && <p className="text-[10px] text-muted-foreground italic">{m.notes}</p>}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
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
          <TabsTrigger value="pending">Pendientes ({pending.length})</TabsTrigger>
          <TabsTrigger value="active">Activas ({active.length})</TabsTrigger>
          <TabsTrigger value="expired">Vencidas ({expired.length})</TabsTrigger>
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
