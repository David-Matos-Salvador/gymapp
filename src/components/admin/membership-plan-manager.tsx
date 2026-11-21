"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/ui/empty-state"
import { useSound } from "@/hooks/use-sound"
import { toast } from "sonner"
import { CreditCard, Loader2, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react"
import { formatCurrency, formatDays } from "@/lib/utils"

export interface MembershipPlan {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  durationDays: number
  active: boolean
}

interface MembershipPlanManagerProps {
  initialPlans: MembershipPlan[]
  gymId?: string
  canManage: boolean
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  currency: "PEN",
  durationDays: "30",
}

export function MembershipPlanManager({
  initialPlans,
  gymId,
  canManage,
}: MembershipPlanManagerProps) {
  const { play } = useSound()
  const [plans, setPlans] = useState(initialPlans)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MembershipPlan | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletePlan, setDeletePlan] = useState<MembershipPlan | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(plan: MembershipPlan) {
    setEditing(plan)
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      price: String(plan.price),
      currency: plan.currency,
      durationDays: String(plan.durationDays),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!canManage || !gymId || !form.name.trim()) return
    const price = Number(form.price)
    const durationDays = Number(form.durationDays)
    if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
      toast.error("El precio debe estar entre 0 y 1.000.000")
      return
    }
    if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-9) {
      toast.error("El precio admite máximo dos decimales")
      return
    }
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      toast.error("La duración debe ser un entero entre 1 y 3650 días")
      return
    }

    setSaving(true)
    play("select")

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      currency: "PEN",
      durationDays,
    }

    const res = editing
      ? await fetch(`/api/membership-plans/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/membership-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, gymId }),
        })

    if (res.ok) {
      const data = await res.json()
      if (editing) {
        setPlans((prev) => prev.map((p) => (p.id === editing.id ? data.plan : p)))
        toast.success("Plan actualizado")
      } else {
        setPlans((prev) => [...prev, data.plan])
        toast.success("Plan creado")
      }
      play("success")
      setDialogOpen(false)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? "Error al guardar el plan")
    }
    setSaving(false)
  }

  async function handleToggle(plan: MembershipPlan) {
    const res = await fetch(`/api/membership-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !plan.active }),
    })
    if (res.ok) {
      const data = await res.json()
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? data.plan : p)))
      toast.success(data.plan.active ? "Plan activado" : "Plan desactivado")
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? "Error al cambiar el estado")
    }
  }

  async function handleDelete(plan: MembershipPlan) {
    const res = await fetch(`/api/membership-plans/${plan.id}`, { method: "DELETE" })
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.id !== plan.id))
      toast.success("Plan eliminado")
      setDeletePlan(null)
      play("success")
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? "No se pudo eliminar el plan")
      setDeletePlan(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gold" />
            Planes de membresía
          </h2>
          <p className="text-sm text-muted-foreground">
            Precios y duraciones que verán los miembros de este gimnasio.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate} disabled={!gymId}>
            <Plus className="h-4 w-4" />
            Nuevo plan
          </Button>
        )}
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState message="No hay planes de membresía para este gimnasio" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className={plan.active ? "" : "opacity-70"}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={plan.active ? "default" : "secondary"} className="text-[10px]">
                      {plan.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold">
                      {formatCurrency(plan.price, plan.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {formatDays(plan.durationDays)}
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(plan)}
                        aria-label="Editar plan"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggle(plan)}
                        aria-label={plan.active ? "Desactivar plan" : "Activar plan"}
                      >
                        {plan.active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setDeletePlan(plan)}
                        aria-label="Eliminar plan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plan" : "Nuevo plan"}</DialogTitle>
            <DialogDescription>
              Define el precio y la duración. Los cambios aplican a nuevas membresías.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="planName">Nombre</Label>
              <Input
                id="planName"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Mensual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planDescription">Descripción</Label>
              <Input
                id="planDescription"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Acceso completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="planPrice">Precio</Label>
                <Input
                  id="planPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  PEN (soles)
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planDuration">Duración (días)</Label>
              <Input
                id="planDuration"
                type="number"
                min={1}
                max={3650}
                step={1}
                value={form.durationDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, durationDays: e.target.value.replace(/[^\d]/g, "") }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Guardar cambios" : "Crear plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePlan} onOpenChange={() => setDeletePlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar plan</DialogTitle>
            <DialogDescription>
              Si el plan tiene membresías, no se podrá eliminar. Puedes desactivarlo en su lugar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlan(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deletePlan && handleDelete(deletePlan)}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
