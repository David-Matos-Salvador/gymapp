"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useSound } from "@/hooks/use-sound"
import { Building2, Users, CreditCard, Activity, Dumbbell, Plus, Store, Globe, ShieldCheck, TrendingUp, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface GymData {
  id: string
  name: string
  slug: string
  active: boolean
  userCount: number
  activeMemberships: number
  createdAt: string
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
  totalMembers: number
  totalTrainers: number
  activeMemberships: number
  totalRevenue: number
  todayCheckins: number
}

const roleLabels: Record<string, string> = {
  ADMIN: "Admin Gym",
  TRAINER: "Entrenador",
  MEMBER: "Miembro",
  SUPER_ADMIN: "Super Admin",
}

export default function SuperAdminPage() {
  const { play } = useSound()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [gyms, setGyms] = useState<GymData[]>([])
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [gymForm, setGymForm] = useState({ name: "", address: "", phone: "", email: "" })
  const [gymSaving, setGymSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/platform")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats)
        setGyms(d.gyms)
        setRecentUsers(d.recentUsers)
        setLoading(false)
      })
      .catch(() => {
        toast.error("Error al cargar datos de la plataforma")
        setLoading(false)
      })
  }, [])

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
      }),
    })
    if (res.ok) {
      play("success")
      toast.success("Gimnasio creado")
      setDialogOpen(false)
      setGymForm({ name: "", address: "", phone: "", email: "" })
      const data = await fetch("/api/admin/platform").then((r) => r.json())
      setStats(data.stats)
      setGyms(data.gyms)
    } else {
      toast.error("Error al crear gimnasio")
    }
    setGymSaving(false)
  }

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!stats) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8">
          <p className="text-muted-foreground text-center py-12">Error al cargar</p>
        </div>
      </AppShell>
    )
  }

  const statCards = [
    { label: "Gimnasios", value: stats.totalGyms, icon: Store, color: "blue", iconColor: "text-blue-500" },
    { label: "Usuarios totales", value: stats.totalUsers, icon: Users, color: "green", iconColor: "text-accent-yellow" },
    { label: "Membresias activas", value: stats.activeMemberships, icon: CreditCard, color: "violet", iconColor: "text-accent-yellow" },
    { label: "Check-ins hoy", value: stats.todayCheckins, icon: Activity, color: "orange", iconColor: "text-accent-yellow" },
    { label: "Entrenadores", value: stats.totalTrainers, icon: Dumbbell, color: "primary", iconColor: "text-primary" },
    { label: "Ingresos totales", value: `$${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "emerald", iconColor: "text-emerald-500" },
  ]

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="h-7 w-7 text-blue-500" />
              Panel de Plataforma
            </h1>
            <p className="text-muted-foreground">Super Admin - Gestion global de GymApp</p>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent-yellow" />
            <span className="text-sm font-medium text-accent-yellow">Super Admin</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className={`hover:shadow-md transition-all border-t-2`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                    <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{card.value}</p></CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" /> Gimnasios
                </CardTitle>
                <Button size="sm" onClick={() => { play("click"); setDialogOpen(true) }}>
                  <Plus className="mr-1 h-4 w-4" /> Crear gym
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {gyms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No hay gimnasios registrados</p>
                ) : gyms.map((gym, i) => (
                  <div key={gym.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <Store className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{gym.name}</p>
                        {gym.active ? (
                          <Badge variant="default" className="text-[10px] bg-accent-yellow/10 text-accent-yellow hover:bg-accent-yellow/10">Activo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{gym.userCount} usuarios registrados</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent-yellow" /> Usuarios recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin usuarios</p>
                ) : recentUsers.map((u, i) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{u.name || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{roleLabels[u.role] || u.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear gimnasio</DialogTitle>
              <DialogDescription>Registra un nuevo gimnasio en la plataforma.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gymName">Nombre</Label>
                <Input id="gymName" value={gymForm.name} onChange={(e) => setGymForm((p) => ({ ...p, name: e.target.value }))} placeholder="Fitness Total" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymAddress">Direccion</Label>
                <Input id="gymAddress" value={gymForm.address} onChange={(e) => setGymForm((p) => ({ ...p, address: e.target.value }))} placeholder="Av. Revolucion 123, CDMX" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gymPhone">Telefono</Label>
                  <Input id="gymPhone" value={gymForm.phone} onChange={(e) => setGymForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+525512345678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gymEmail">Email</Label>
                  <Input id="gymEmail" type="email" value={gymForm.email} onChange={(e) => setGymForm((p) => ({ ...p, email: e.target.value }))} placeholder="info@gym.com" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateGym} disabled={gymSaving || !gymForm.name.trim()}>
                {gymSaving ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
