"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { useSound } from "@/hooks/use-sound"
import { toast } from "sonner"
import {
  Building2,
  Users,
  CreditCard,
  Activity,
  Dumbbell,
  TrendingUp,
  Store,
  Globe,
  ShieldCheck,
  Plus,
  Hash,
} from "lucide-react"
import { ROLE_LABELS } from "@/constants/user"

interface GymData {
  id: string
  name: string
  slug: string
  active: boolean
  showMachineNumbers: boolean
  userCount: number
}

interface RecentUser {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  gymId: string | null
}

interface PlatformStats {
  totalGyms: number
  totalUsers: number
  activeMemberships: number
  todayCheckins: number
  totalTrainers: number
  totalRevenue: number
}

interface SuperAdminDashboardProps {
  stats: PlatformStats
  gyms: GymData[]
  recentUsers: RecentUser[]
}

export function SuperAdminDashboard({
  stats: initialStats,
  gyms: initialGyms,
  recentUsers,
}: SuperAdminDashboardProps) {
  const { play } = useSound()
  const [stats, setStats] = useState(initialStats)
  const [gyms, setGyms] = useState(initialGyms)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [gymForm, setGymForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    showMachineNumbers: false,
  })
  const [gymSaving, setGymSaving] = useState(false)

  async function handleCreateGym() {
    if (!gymForm.name.trim()) return
    setGymSaving(true)
    const res = await fetch("/api/gyms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: gymForm.name,
        address: gymForm.address || undefined,
        phone: gymForm.phone || undefined,
        email: gymForm.email || undefined,
        showMachineNumbers: gymForm.showMachineNumbers,
      }),
    })
    if (res.ok) {
      play("success")
      toast.success("Gimnasio creado")
      setDialogOpen(false)
      setGymForm({ name: "", address: "", phone: "", email: "", showMachineNumbers: false })
      const data = await fetch("/api/admin/platform").then((r) => r.json())
      setStats(data.stats)
      setGyms(data.gyms)
    } else {
      toast.error("Error al crear gimnasio")
    }
    setGymSaving(false)
  }

  async function handleToggleMachineNumbers(gymId: string, current: boolean) {
    play("select")
    const res = await fetch(`/api/gyms/${gymId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showMachineNumbers: !current }),
    })
    if (res.ok) {
      const data = await res.json()
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gymId ? { ...g, showMachineNumbers: data.gym.showMachineNumbers } : g
        )
      )
      toast.success(
        data.gym.showMachineNumbers
          ? "Números de máquina activados"
          : "Números de máquina desactivados"
      )
    } else {
      toast.error("Error al actualizar")
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-7 w-7 text-accent-yellow" />
            Panel de Plataforma
          </h1>
          <p className="text-muted-foreground">Super Admin — Gestión global de GymApp</p>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent-yellow" />
          <span className="text-sm font-medium text-accent-yellow">Super Admin</span>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <StatCard label="Gimnasios" value={stats.totalGyms} icon={Store} delay={0} />
        <StatCard label="Usuarios totales" value={stats.totalUsers} icon={Users} delay={0.04} />
        <StatCard
          label="Membresías activas"
          value={stats.activeMemberships}
          icon={CreditCard}
          delay={0.08}
        />
        <StatCard label="Check-ins hoy" value={stats.todayCheckins} icon={Activity} delay={0.12} />
        <StatCard
          label="Entrenadores"
          value={stats.totalTrainers}
          icon={Dumbbell}
          iconColor="text-primary"
          borderColor="border-t-primary"
          delay={0.16}
        />
        <StatCard
          label="Ingresos totales"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          iconColor="text-primary"
          borderColor="border-t-primary"
          delay={0.2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent-yellow" /> Gimnasios
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Crear gym
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {gyms.length === 0 ? (
                <EmptyState message="No hay gimnasios registrados" className="py-4" />
              ) : (
                gyms.map((gym) => (
                  <div key={gym.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-yellow/10">
                      <Store className="h-5 w-5 text-accent-yellow" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{gym.name}</p>
                        {gym.active ? (
                          <Badge
                            variant="default"
                            className="text-[10px] bg-accent-yellow/10 text-accent-yellow hover:bg-accent-yellow/10"
                          >
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {gym.userCount} usuarios registrados
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={gym.showMachineNumbers ? "text-primary" : "text-muted-foreground"}
                      onClick={() => handleToggleMachineNumbers(gym.id, gym.showMachineNumbers)}
                      title={
                        gym.showMachineNumbers
                          ? "Desactivar números de máquina"
                          : "Activar números de máquina"
                      }
                    >
                      <Hash className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-accent-yellow" /> Usuarios recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentUsers.length === 0 ? (
                <EmptyState message="Sin usuarios" className="py-4" />
              ) : (
                recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{u.name || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear gimnasio</DialogTitle>
            <DialogDescription>Agrega un nuevo gimnasio a la plataforma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gymName">Nombre</Label>
              <Input
                id="gymName"
                value={gymForm.name}
                onChange={(e) => setGymForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Fitness Total"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gymAddress">Dirección</Label>
              <Input
                id="gymAddress"
                value={gymForm.address}
                onChange={(e) => setGymForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Av. Revolución 123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gymPhone">Teléfono</Label>
              <Input
                id="gymPhone"
                value={gymForm.phone}
                onChange={(e) => setGymForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+525512345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gymEmail">Email</Label>
              <Input
                id="gymEmail"
                value={gymForm.email}
                onChange={(e) => setGymForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@gym.com"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant={gymForm.showMachineNumbers ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setGymForm((f) => ({ ...f, showMachineNumbers: !f.showMachineNumbers }))
                }
                className="gap-2"
              >
                <Hash className="h-3.5 w-3.5" />
                {gymForm.showMachineNumbers
                  ? "Mostrar números de máquina"
                  : "Ocultar números de máquina"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGym} disabled={gymSaving || !gymForm.name.trim()}>
              {gymSaving ? "Creando..." : "Crear gimnasio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
