"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Shield, Trophy } from "lucide-react"
import { ROLE_LABELS, ROLE_VARIANTS, EXPERIENCE_LABELS } from "@/constants/user"
import { calculateProfileCompletion } from "@/lib/profile-completion"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  sex: string | null
  birthDate: string | null
  objective: string | null
  experienceLevel: string | null
  medicalNotes: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  phone: string | null
  image: string | null
  createdAt: string
}

export function ProfileHeader({ user }: { user: User }) {
  const completion = useMemo(() => calculateProfileCompletion(user), [user])
  const firstName = user.name?.split(" ")[0] ?? "Atleta"
  const initials = (user.name ?? user.email).charAt(0).toUpperCase()

  const memberSince = new Date(user.createdAt).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
  })

  const roleConfig = {
    label: ROLE_LABELS[user.role] ?? user.role,
    variant: ROLE_VARIANTS[user.role] ?? ("default" as const),
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center space-y-4 pt-2 pb-4"
    >
      {/* Avatar */}
      <Avatar
        size="lg"
        className="size-20 ring-2 ring-accent-yellow/30 ring-offset-2 ring-offset-background"
      >
        {user.image && <AvatarImage src={user.image} alt={initials} />}
        <AvatarFallback className="bg-accent-yellow text-black text-2xl font-bold">
          {initials}
        </AvatarFallback>
        <AvatarBadge>
          <Trophy className="size-2" />
        </AvatarBadge>
      </Avatar>

      {/* Name & Role */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{firstName}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <Badge variant={roleConfig.variant} className="mt-1">
          {roleConfig.label}
        </Badge>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" />
          Miembro desde {memberSince}
        </span>
        {user.experienceLevel && (
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            {EXPERIENCE_LABELS[user.experienceLevel] ?? user.experienceLevel}
          </span>
        )}
      </div>

      {/* Profile Completion Bar */}
      <div className="w-full max-w-xs pt-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Perfil completado</span>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {completion}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="h-full rounded-full bg-accent-yellow"
          />
        </div>
        {completion < 100 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Completa tus datos en «Editar información», más abajo
          </p>
        )}
      </div>
    </motion.div>
  )
}
