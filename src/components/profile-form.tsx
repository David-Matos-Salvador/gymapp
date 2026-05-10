"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSound } from "@/hooks/use-sound"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { User as UserIcon, Mail, Phone, Calendar, Shield, Heart, Target, Activity, AlertTriangle } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  sex: string | null
  birthDate: string | null
  objective: string | null
  experienceLevel: string | null
  medicalNotes: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  image: string | null
  createdAt: string
  updatedAt?: string
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

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador", TRAINER: "Coach", MEMBER: "Miembro", SUPER_ADMIN: "Súper Admin",
  }

  const objectiveLabels: Record<string, string> = {
    WEIGHT_LOSS: "Pérdida de peso",
    MUSCLE_GAIN: "Ganancia muscular",
    TONING: "Tonificación",
    STRENGTH: "Fuerza",
    ENDURANCE: "Resistencia",
    GENERAL_FITNESS: "Fitness general",
    REHABILITATION: "Rehabilitación",
    COMPETITION: "Competición",
  }

  const experienceLabels: Record<string, string> = {
    BEGINNER: "Principiante",
    INTERMEDIATE: "Intermedio",
    ADVANCED: "Avanzado",
    ELITE: "Élite",
  }

  const sexLabels: Record<string, string> = {
    MALE: "Masculino",
    FEMALE: "Femenino",
    OTHER: "Otro",
  }

  function calculateAge(birthDate: string | null): string {
    if (!birthDate) return "-"
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return `${age} años`
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Rol:</span>
            <span className="font-medium">{roleLabels[user.role] ?? user.role}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Miembro desde:</span>
            <span className="font-medium">{memberSince}</span>
          </div>
          {user.sex && (
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sexo:</span>
              <span className="font-medium">{sexLabels[user.sex] ?? user.sex}</span>
            </div>
          )}
          {user.birthDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Edad:</span>
              <span className="font-medium">{calculateAge(user.birthDate)}</span>
            </div>
          )}
          {user.objective && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Objetivo:</span>
              <span className="font-medium">{objectiveLabels[user.objective] ?? user.objective}</span>
            </div>
          )}
          {user.experienceLevel && (
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Experiencia:</span>
              <span className="font-medium">{experienceLabels[user.experienceLevel] ?? user.experienceLevel}</span>
            </div>
          )}
          {user.medicalNotes && (
            <div className="flex items-center gap-2 text-sm col-span-full">
              <AlertTriangle className="h-4 w-4 text-gym-orange/70" />
              <span className="text-muted-foreground">Notas médicas:</span>
              <span className="font-medium text-xs">{user.medicalNotes}</span>
            </div>
          )}
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
              placeholder="+529991234567"
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
