"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSound } from "@/hooks/use-sound"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { User as UserIcon, Mail, Phone, Calendar, Shield } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  membershipStatus: string
  image: string | null
  createdAt: string
}

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter()
  const { play } = useSound()
  const [name, setName] = useState(user.name ?? "")
  const [phone, setPhone] = useState(user.phone ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    play("select")
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    })

    if (res.ok) {
      play("success")
      toast.success("Perfil actualizado")
      router.refresh()
    } else {
      toast.error("Error al actualizar")
    }
    setSaving(false)
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString("es", {
    year: "numeric",
    month: "long",
  })

  const statusLabels: Record<string, string> = {
    ACTIVE: "Activo", INACTIVE: "Inactivo", SUSPENDED: "Suspendido", CANCELLED: "Cancelado",
  }

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador", TRAINER: "Coach", MEMBER: "Miembro",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información personal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gym-green/10 text-gym-green text-xl font-bold">
            {(user.name ?? user.email)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{user.name ?? "Sin nombre"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Rol:</span>
            <span className="font-medium">{roleLabels[user.role] ?? user.role}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${user.membershipStatus === "ACTIVE" ? "bg-gym-green" : "bg-destructive"}`} />
            <span className="text-muted-foreground">Membresía:</span>
            <span className="font-medium">{statusLabels[user.membershipStatus] ?? user.membershipStatus}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Miembro desde:</span>
            <span className="font-medium">{memberSince}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profileName">Nombre</Label>
            <Input
              id="profileName"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePhone">Teléfono</Label>
            <Input
              id="profilePhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
