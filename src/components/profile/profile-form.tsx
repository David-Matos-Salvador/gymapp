"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useSound } from "@/hooks/use-sound"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Shield,
  Target,
  Activity,
  AlertTriangle,
  Heart,
  CheckCircle2,
  XCircle,
} from "lucide-react"

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
  updatedAt?: string | null
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  TRAINER: "Coach",
  MEMBER: "Miembro",
  SUPER_ADMIN: "Super Admin",
}

const sexLabels: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
  OTHER: "Otro",
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

function calculateAge(birthDate: string | null): string | null {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age} años`
}

function formatBirthDate(date: string | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function InfoItem({
  icon: Icon,
  label,
  value,
  missing,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null
  missing?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {value ? (
          <p className="text-sm font-medium truncate">{value}</p>
        ) : (
          <p className="text-sm text-muted-foreground/50 inline-flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            No especificado
          </p>
        )}
      </div>
      {value && (
        <CheckCircle2 className="h-4 w-4 text-accent-yellow/60 shrink-0 mt-1" />
      )}
    </div>
  )
}

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter()
  const { play } = useSound()
  const [name, setName] = useState(user.name ?? "")
  const [phone, setPhone] = useState(user.phone ?? "")
  const [saving, setSaving] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)

  const age = useMemo(() => calculateAge(user.birthDate), [user.birthDate])
  const birthDateFormatted = useMemo(() => formatBirthDate(user.birthDate), [user.birthDate])

  const hasNameChanged = name !== (user.name ?? "")
  const hasPhoneChanged = phone !== (user.phone ?? "")
  const hasChanges = hasNameChanged || hasPhoneChanged
  const nameValid = name.length > 0 || !nameTouched

  async function handleSave() {
    if (!nameValid) return
    setSaving(true)
    play("select")
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || null, phone: phone || null }),
    })

    if (res.ok) {
      play("success")
      toast.success("Perfil actualizado", {
        description: "Los cambios se guardaron correctamente.",
      })
      router.refresh()
    } else {
      toast.error("Error al actualizar", {
        description: "Hubo un problema al guardar los cambios.",
      })
    }
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-4"
    >
      {/* Personal Info Card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserIcon className="h-5 w-5 text-accent-yellow" />
            Información personal
          </CardTitle>
          <CardDescription>
            Datos básicos de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <InfoItem icon={Mail} label="Correo electrónico" value={user.email} />
            <InfoItem icon={Shield} label="Rol" value={roleLabels[user.role] ?? user.role} />
            <InfoItem
              icon={UserIcon}
              label="Sexo"
              value={user.sex ? (sexLabels[user.sex] ?? user.sex) : null}
            />
            <InfoItem
              icon={Calendar}
              label="Fecha de nacimiento"
              value={birthDateFormatted}
            />
            <InfoItem
              icon={Calendar}
              label="Edad"
              value={age}
            />
          </div>
        </CardContent>
      </Card>

      {/* Gym Profile Card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-accent-yellow" />
            Perfil de gimnasio
          </CardTitle>
          <CardDescription>
            Tu configuración de entrenamiento
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <InfoItem
              icon={Target}
              label="Objetivo"
              value={user.objective ? (objectiveLabels[user.objective] ?? user.objective) : null}
            />
            <InfoItem
              icon={Activity}
              label="Nivel de experiencia"
              value={user.experienceLevel ? (experienceLabels[user.experienceLevel] ?? user.experienceLevel) : null}
            />
            <InfoItem
              icon={Heart}
              label="Contacto de emergencia"
              value={user.emergencyContact}
            />
            <InfoItem
              icon={Phone}
              label="Teléfono de emergencia"
              value={user.emergencyPhone}
            />
          </div>
        </CardContent>
      </Card>

      {/* Medical Notes */}
      {user.medicalNotes && (
        <Card className="border-accent-yellow/20 bg-accent-yellow/[0.03]">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-yellow/10 text-accent-yellow">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium mb-0.5">Notas médicas</p>
                <p className="text-sm text-muted-foreground">{user.medicalNotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form Card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Editar información</CardTitle>
          <CardDescription>
            Actualizá tu nombre y teléfono
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="profileName" className="text-sm">
              Nombre completo
            </Label>
            <Input
              id="profileName"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!nameTouched) setNameTouched(true)
              }}
              onBlur={() => setNameTouched(true)}
              placeholder="Tu nombre"
              aria-invalid={!nameValid}
              aria-describedby={!nameValid ? "nameError" : undefined}
            />
            {!nameValid && (
              <p id="nameError" className="text-xs text-destructive mt-1" role="alert">
                El nombre no puede estar vacío
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePhone" className="text-sm">
              Teléfono
            </Label>
            <Input
              id="profilePhone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (!phoneTouched) setPhoneTouched(true)
              }}
              placeholder="+52 999 123 4567"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {hasChanges
                ? "Tenés cambios sin guardar"
                : "No hay cambios pendientes"}
            </p>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges || !nameValid}
              className="min-w-[140px]"
              size="default"
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
