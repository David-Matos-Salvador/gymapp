"use client"

import { useState } from "react"
import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  canRenewMembership,
  getMembershipStatusLabel,
  getMembershipTab,
} from "@/lib/membership-status"
import {
  MANUAL_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS as paymentMethodLabels,
} from "@/constants/payment"

interface MembershipUser {
  id: string
  name: string | null
  email: string
  gymId: string | null
  assignedTrainer: { name: string | null } | null
}

interface MembershipPlan {
  id: string
  name: string
  price: number
  currency: string
  durationDays: number
  gymId: string
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
  planPrice: number
  planCurrency: string
  planDurationDays: number
  notes: string | null
  createdAt: string
  updatedAt: string
  user: MembershipUser
  plan: MembershipPlan
}

interface PendingPayment {
  id: string
  userId: string
  membershipId: string | null
  amount: number
  currency: string
  method: string
  receiptUrl: string | null
  createdAt: string
}

interface MemberOption {
  id: string
  name: string | null
  email: string
  gymId: string | null
}

interface PlanOption {
  id: string
  name: string
  price: number
  currency: string
  durationDays: number
  gymId: string
  gym: { name: string } | null
}

interface MembershipPanelProps {
  memberships: Membership[]
  pendingPayments: PendingPayment[]
  members: MemberOption[]
  plans: PlanOption[]
}

export function MembershipPanel({
  memberships,
  pendingPayments,
  members,
  plans,
}: MembershipPanelProps) {
  const { play } = useSound()
  const [data, setData] = useState<Membership[]>(memberships)
  const [pendingReceipts, setPendingReceipts] = useState<PendingPayment[]>(pendingPayments)
  const [reviewPayment, setReviewPayment] = useState<{
    payment: PendingPayment
    membership: Membership
  } | null>(null)
  const [manualMembership, setManualMembership] = useState<Membership | null>(null)
  const [manualMethod, setManualMethod] = useState("CASH")
  const [manualRef, setManualRef] = useState("")
  const [newOpen, setNewOpen] = useState(false)
  const [newMemberId, setNewMemberId] = useState("")
  const [newPlanId, setNewPlanId] = useState("")
  const [newMethod, setNewMethod] = useState("CASH")
  const [newRef, setNewRef] = useState("")
  const [newSaving, setNewSaving] = useState(false)
  const [newError, setNewError] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  const pendingByMembership = new Map<string, PendingPayment>()
  const pendingByUser = new Map<string, PendingPayment>()
  for (const payment of pendingReceipts) {
    if (payment.membershipId) {
      if (!pendingByMembership.has(payment.membershipId)) {
        pendingByMembership.set(payment.membershipId, payment)
      }
    } else if (!pendingByUser.has(payment.userId)) {
      pendingByUser.set(payment.userId, payment)
    }
  }

  // D-02: cada membresía pertenece a un solo tab. El comprobante pendiente se
  // muestra en la tarjeta de su membresía, sin moverla de su tab real.
  const now = new Date()
  const pending = data.filter((m) => getMembershipTab(m, now) === "pending")
  const active = data.filter((m) => getMembershipTab(m, now) === "active")
  const expired = data.filter((m) => getMembershipTab(m, now) === "expired")

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

  function openManualPayment(membership: Membership) {
    setManualMethod("CASH")
    setManualRef("")
    setManualMembership(membership)
  }

  async function handleMarkPaid(id: string) {
    setLoading(id)
    play("select")
    try {
      const res = await fetch("/api/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: id,
          method: manualMethod,
          reference: manualRef.trim() || undefined,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setData((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  paymentConfirmed: true,
                  paymentMethod: manualMethod,
                  paymentRef: manualRef.trim() || null,
                  updatedAt: json.membership.updatedAt,
                }
              : m
          )
        )
        play("success")
        toast.success("Pago manual registrado")
        setManualMembership(null)
      } else {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? "Error al registrar el pago")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(null)
    }
  }

  async function handleConfirmReceipt(
    paymentId: string,
    membershipId: string,
    hasReceipt: boolean
  ) {
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
        toast.error(json.error ?? "Error al confirmar el pago")
        return
      }
      setData((prev) =>
        prev.map((m) => (m.id === membershipId ? { ...m, paymentConfirmed: true } : m))
      )
      setPendingReceipts((prev) => prev.filter((p) => p.id !== paymentId))
      setReviewPayment(null)
      play("success")
      toast.success(hasReceipt ? "Comprobante confirmado" : "Pago confirmado")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(null)
    }
  }

  async function handleRejectReceipt(paymentId: string, membershipId: string, hasReceipt: boolean) {
    setLoading(membershipId)
    play("select")
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          notes: hasReceipt
            ? "Comprobante rechazado por el administrador"
            : "No se recibió el pago en recepción",
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? "Error al rechazar el pago")
        return
      }
      setPendingReceipts((prev) => prev.filter((p) => p.id !== paymentId))
      setReviewPayment(null)
      play("success")
      toast.success(hasReceipt ? "Comprobante rechazado" : "Pago rechazado")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(null)
    }
  }

  const selectedMember = members.find((member) => member.id === newMemberId) ?? null
  const availablePlans = plans.filter(
    (plan) => !selectedMember || plan.gymId === selectedMember.gymId
  )

  function openNewMembership() {
    setNewMemberId("")
    setNewPlanId("")
    setNewMethod("CASH")
    setNewRef("")
    setNewError("")
    setNewOpen(true)
  }

  async function handleCreateMembership() {
    if (!newMemberId || !newPlanId) {
      setNewError("Elige un miembro y un plan")
      return
    }

    setNewSaving(true)
    setNewError("")
    play("select")

    let res: Response
    try {
      res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newMemberId,
          planId: newPlanId,
          paymentMethod: newMethod,
          paymentRef: newRef.trim() || undefined,
        }),
      })
    } catch {
      setNewError("Error de conexión")
      play("delete")
      setNewSaving(false)
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setNewError(data.error ?? "Error al crear la membresía")
      play("delete")
      setNewSaving(false)
      return
    }

    const data = await res.json()
    const member = members.find((item) => item.id === newMemberId)
    const plan = plans.find((item) => item.id === newPlanId)
    if (member && plan) {
      setData((prev) => [
        {
          ...data.membership,
          user: {
            id: member.id,
            name: member.name,
            email: member.email,
            gymId: member.gymId,
            assignedTrainer: null,
          },
          plan: {
            id: plan.id,
            name: plan.name,
            price: plan.price,
            currency: plan.currency,
            durationDays: plan.durationDays,
            gymId: plan.gymId,
            gym: plan.gym,
          },
        },
        ...prev,
      ])
    }
    play("success")
    toast.success("Membresía creada; queda con pago pendiente")
    setNewOpen(false)
    setNewSaving(false)
  }

  async function handleRenew(id: string) {
    setLoading(id)
    play("select")

    try {
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
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? "Error al renovar membresía")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(null)
    }
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
          const pendingPayment = pendingByMembership.get(m.id) ?? pendingByUser.get(m.userId)
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
                      {m.planPrice > 0
                        ? formatCurrency(m.planPrice, m.planCurrency)
                        : formatCurrency(Number(m.plan.price), m.plan.currency)}
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
                        <button
                          type="button"
                          onClick={() =>
                            setReviewPayment({ payment: pendingPayment, membership: m })
                          }
                          className="shrink-0"
                        >
                          <img
                            src={pendingPayment.receiptUrl}
                            alt="Comprobante de pago"
                            className="h-14 w-14 rounded border object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground">
                          Sin imagen
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">
                          {pendingPayment.receiptUrl
                            ? "Comprobante pendiente"
                            : `Pago en recepción por confirmar (${(paymentMethodLabels[pendingPayment.method] ?? pendingPayment.method).toLowerCase()})`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatCurrency(pendingPayment.amount, pendingPayment.currency)} ·{" "}
                          {formatDate(pendingPayment.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setReviewPayment({ payment: pendingPayment, membership: m })}
                        className="h-6 shrink-0 text-[10px]"
                      >
                        <Eye className="h-3 w-3" />
                        {pendingPayment.receiptUrl ? "Revisar comprobante" : "Revisar pago"}
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {paymentMethodLabels[m.paymentMethod] ?? m.paymentMethod}
                    </span>

                    {!m.paymentConfirmed && !pendingPayment && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        Pago sin confirmar
                      </span>
                    )}

                    {!m.paymentConfirmed &&
                    m.status === "ACTIVE" &&
                    new Date(m.endDate) > now &&
                    !pendingPayment ? (
                      <Button
                        size="xs"
                        onClick={() => openManualPayment(m)}
                        className="h-6 text-[10px]"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Registrar pago manual
                      </Button>
                    ) : m.paymentConfirmed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Pagado
                      </span>
                    ) : null}

                    {canRenewMembership(m, now) && (
                      <>
                        <span className="inline-flex items-center rounded-full border border-accent-yellow/30 px-2 py-0.5 text-[10px] font-medium text-gold">
                          Renovable
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleRenew(m.id)}
                          disabled={loading === m.id}
                          title="Reactiva desde hoy y deja el pago pendiente"
                          className="h-6 text-[10px]"
                        >
                          {loading === m.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Renovar
                        </Button>
                      </>
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo o plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button size="sm" onClick={openNewMembership}>
          <Plus className="h-4 w-4" />
          Nueva membresía
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pago sin confirmar ({pending.length})</TabsTrigger>
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

      <Dialog open={!!reviewPayment} onOpenChange={(open) => !open && setReviewPayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewPayment && !reviewPayment.payment.receiptUrl
                ? "Confirmar pago en recepción"
                : "Revisar comprobante"}
            </DialogTitle>
            <DialogDescription>
              {reviewPayment?.membership.user.name ?? reviewPayment?.membership.user.email}
              {reviewPayment
                ? ` · ${formatCurrency(reviewPayment.payment.amount, reviewPayment.payment.currency)} · ${formatDate(reviewPayment.payment.createdAt)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {reviewPayment && reviewPayment.payment.receiptUrl ? (
            <img
              src={reviewPayment.payment.receiptUrl}
              alt="Comprobante de pago"
              className="max-h-[60vh] w-full rounded-lg border object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Este pago no tiene captura adjunta: se paga en recepción
              {reviewPayment
                ? ` (${(paymentMethodLabels[reviewPayment.payment.method] ?? reviewPayment.payment.method).toLowerCase()})`
                : ""}
              . Confírmalo solo cuando hayas recibido el dinero.
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                reviewPayment &&
                handleRejectReceipt(
                  reviewPayment.payment.id,
                  reviewPayment.membership.id,
                  !!reviewPayment.payment.receiptUrl
                )
              }
              disabled={!!loading}
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </Button>
            <Button
              onClick={() =>
                reviewPayment &&
                handleConfirmReceipt(
                  reviewPayment.payment.id,
                  reviewPayment.membership.id,
                  !!reviewPayment.payment.receiptUrl
                )
              }
              disabled={!!loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manualMembership} onOpenChange={(open) => !open && setManualMembership(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago manual</DialogTitle>
            <DialogDescription>
              Esto marca la membresía de{" "}
              {manualMembership?.user.name ?? manualMembership?.user.email ?? "este socio"} como
              pagada sin comprobante. Úsalo solo para efectivo o cobros manuales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {manualMembership && (
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {manualMembership.user.name ?? manualMembership.user.email}
                </p>
                <p className="text-muted-foreground">
                  {manualMembership.plan.name} ·{" "}
                  {manualMembership.planPrice > 0
                    ? formatCurrency(manualMembership.planPrice, manualMembership.planCurrency)
                    : formatCurrency(manualMembership.plan.price, manualMembership.plan.currency)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="manualMethod">Método</Label>
              <Select value={manualMethod} onValueChange={setManualMethod}>
                <SelectTrigger id="manualMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_PAYMENT_METHODS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {paymentMethodLabels[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualRef">Referencia (opcional)</Label>
              <Input
                id="manualRef"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="Nro. de operación"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualMembership(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => manualMembership && handleMarkPaid(manualMembership.id)}
              disabled={!!loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Sí, registrar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva membresía</DialogTitle>
            <DialogDescription>
              Elige un miembro del gimnasio y un plan activo. La membresía queda con el pago
              pendiente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Miembro</Label>
              <Select
                value={newMemberId}
                onValueChange={(value) => {
                  setNewMemberId(value)
                  setNewPlanId("")
                  setNewError("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegir miembro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name ?? member.email} — {member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId} disabled={!selectedMember}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegir plan" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} · {formatCurrency(plan.price, plan.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={newMethod} onValueChange={setNewMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_PAYMENT_METHODS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {paymentMethodLabels[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newMembershipRef">Referencia (opcional)</Label>
              <Input
                id="newMembershipRef"
                value={newRef}
                onChange={(e) => setNewRef(e.target.value)}
                placeholder="Nro. de operación"
              />
            </div>
            {newError && <p className="text-sm text-destructive">{newError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateMembership}
              disabled={newSaving || !newMemberId || !newPlanId}
            >
              {newSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear membresía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
