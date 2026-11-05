"use client"

import { useState } from "react"
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
import { Loader2, Plus, Search, UserRound, Users } from "lucide-react"

export interface MemberItem {
  id: string
  name: string | null
  email: string
  phone?: string | null
  assignedTrainer?: { name: string | null } | null
}

interface MemberManagementProps {
  initialMembers: MemberItem[]
  canManage: boolean
}

const emptyForm = { name: "", email: "", phone: "", password: "" }

export function MemberManagement({ initialMembers, canManage }: MemberManagementProps) {
  const { play } = useSound()
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const filtered = members.filter((member) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      (member.name ?? "").toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    )
  })

  function openCreate() {
    setForm(emptyForm)
    setError("")
    setOpen(true)
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Completa nombre, email y contraseña inicial")
      return
    }
    setSaving(true)
    setError("")
    play("select")

    const res = await fetch("/api/trainer/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setMembers((prev) => [
        {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          phone: form.phone.trim() || null,
          assignedTrainer: null,
        },
        ...prev,
      ])
      play("success")
      toast.success("Miembro creado")
      setOpen(false)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Error al crear el miembro")
      play("delete")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-yellow" />
            Miembros
          </h2>
          <p className="text-sm text-muted-foreground">Directorio de socios del gimnasio.</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo miembro
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState message="No hay miembros que coincidan" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-yellow/10">
                <UserRound className="h-4 w-4 text-accent-yellow" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{member.name ?? "Sin nombre"}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {member.assignedTrainer?.name ?? "Sin coach"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo miembro</DialogTitle>
            <DialogDescription>
              Se crea en este gimnasio sin coach asignado. Comparte la contraseña inicial por un
              canal seguro; el miembro puede cambiarla luego.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="memberName">Nombre</Label>
              <Input
                id="memberName"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email</Label>
              <Input
                id="memberEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberPhone">Teléfono (opcional)</Label>
              <Input
                id="memberPhone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberPassword">Contraseña inicial</Label>
              <Input
                id="memberPassword"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mín. 8, 1 mayúscula, 1 número"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear miembro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
