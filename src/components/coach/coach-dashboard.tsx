"use client"

import { useState } from "react"
import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card , CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users , CalendarDays , Dumbbell, Plus, ArrowRight , Search, UserPlus , Mail, Phone, Target , Award, BadgeCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { OBJECTIVE_LABELS, EXPERIENCE_LABELS } from "@/constants/user"

interface ClientData { id: string; name: string | null; email: string; phone: string | null; objective: string | null; experienceLevel: string | null; hasActiveMembership: boolean; membershipPlan: string | null }
interface RoutineData { id: string; name: string; exerciseCount: number }
interface ClassData { id: string; name: string; dayOfWeek: string; duration: number; capacity: number; bookingsCount: number; schedule: string }
interface Stats { totalClients: number; activeMemberships: number; upcomingClasses: number; totalRoutines: number }
const dayLabels: Record<string, string> = { MONDAY: "lunes", TUESDAY: "martes", WEDNESDAY: "miercoles", THURSDAY: "jueves", FRIDAY: "viernes", SATURDAY: "sabado", SUNDAY: "domingo" }

export function CoachDashboard({ clients: initialClients, routines, classes, stats }: {
  clients: ClientData[]; routines: RoutineData[]; classes: ClassData[]; stats: Stats
}) {
  const { play } = useSound()
  const [clients, setClients] = useState(initialClients)
  const [searchEmail, setSearchEmail] = useState("")
  const [searchResult, setSearchResult] = useState<{ id: string; name: string | null; email: string } | null>(null)
  const [searchError, setSearchError] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState("")

  async function handleSearch() {
    if (!searchEmail.trim()) return
    setSearchLoading(true); setSearchError(""); setSearchResult(null); setAssignSuccess("")
    try {
      const res = await fetch(`/api/members/search?email=${encodeURIComponent(searchEmail.trim())}`)
      const data = await res.json()
      if (!res.ok) { setSearchError(data.error || "Error al buscar"); return }
      if (!data.member) { setSearchError("No se encontro ningun miembro con ese email"); return }
      setSearchResult(data.member)
    } catch { setSearchError("Error de conexion") }
    finally { setSearchLoading(false) }
  }

  async function handleAssign(clientId: string) {
    setAssignLoading(true); setAssignSuccess(""); setSearchError("")
    try {
      const res = await fetch("/api/trainer/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) })
      const data = await res.json()
      if (!res.ok) { setSearchError(data.error || "Error al asignar"); return }
      play("success"); setAssignSuccess("Cliente asignado correctamente")
      setSearchResult(null); setSearchEmail("")
      setClients((prev) => [...prev, { id: data.client.id, name: data.client.name, email: data.client.email, phone: data.client.phone, objective: data.client.objective, experienceLevel: data.client.experienceLevel, hasActiveMembership: false, membershipPlan: null }])
    } catch { setSearchError("Error de conexion") }
    finally { setAssignLoading(false) }
  }

  const statCards = [
    { label: "Clientes", value: stats.totalClients, icon: Users, color: "border-t-accent-yellow", iconColor: "text-accent-yellow", bg: "bg-accent-yellow/10" },
    { label: "Membresias activas", value: stats.activeMemberships, icon: BadgeCheck, color: "border-t-accent-yellow", iconColor: "text-accent-yellow", bg: "bg-accent-yellow/10" },
    { label: "Clases proximas", value: stats.upcomingClasses, icon: CalendarDays, color: "border-t-accent-yellow", iconColor: "text-accent-yellow", bg: "bg-accent-yellow/10" },
    { label: "Rutinas", value: stats.totalRoutines, icon: Dumbbell, color: "border-t-primary", iconColor: "text-primary", bg: "bg-primary/10" },
  ]

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Coach</h1>
        <p className="text-muted-foreground">Gestiona tus clientes, rutinas y clases</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`hover:shadow-md transition-all border-t-2 ${card.color}`} onClick={() => play("hover")}>
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

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent-yellow" /><CardTitle>Asignar cliente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input type="email" placeholder="Buscar miembro por email..." value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1" />
              <Button onClick={handleSearch} disabled={searchLoading || !searchEmail.trim()}>
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" /> Buscar</>}
              </Button>
            </div>
            {searchError && <p className="text-sm text-destructive">{searchError}</p>}
            {assignSuccess && <p className="text-sm text-accent-yellow font-medium">{assignSuccess}</p>}
            {searchResult && (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-yellow/10"><Users className="h-4 w-4 text-accent-yellow" /></div>
                  <div>
                    <p className="text-sm font-medium">{searchResult.name || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground">{searchResult.email}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAssign(searchResult.id)} disabled={assignLoading}>
                  {assignLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />} Asignar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Mis clientes</CardTitle>
              <Button variant="ghost" size="sm" asChild onClick={() => play("click")}>
                <Link href="/coach/clients">
                  Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tienes clientes asignados aun</p>
              ) : clients.slice(0, 5).map((client, i) => (
                <motion.div key={client.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
                  <Link href={`/coach/clients/${client.id}`} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group" onClick={() => play("select")}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-yellow/10"><Users className="h-5 w-5 text-accent-yellow" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{client.name || "Sin nombre"}</p>
                        {client.hasActiveMembership && <span className="inline-flex items-center rounded-full bg-accent-yellow/10 px-1.5 py-0.5 text-xs font-medium text-accent-yellow">Activo</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{client.email}</span>
                        {client.phone && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{client.phone}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {client.objective && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Target className="h-3 w-3" />{OBJECTIVE_LABELS[client.objective] || client.objective}</span>}
                        {client.experienceLevel && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Award className="h-3 w-3" />{EXPERIENCE_LABELS[client.experienceLevel] || client.experienceLevel}</span>}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                  </Link>
                </motion.div>
              ))}
              {clients.length > 5 && (
                <div className="text-center pt-1">
                  <Button variant="link" size="sm" asChild onClick={() => play("click")}>
                    <Link href="/coach/clients" className="text-muted-foreground">
                      + {clients.length - 5} clientes más — Ver todos
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Rutinas creadas</CardTitle>
                <Button size="sm" asChild onClick={() => play("click")}><Link href="/routines/new"><Plus className="mr-1 h-4 w-4" /> Nueva rutina</Link></Button>
              </CardHeader>
              <CardContent>
                {routines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No has creado rutinas aun</p>
                ) : (
                  <div className="space-y-2">
                    {routines.map((r) => (
                      <Link key={r.id} href={`/routines/${r.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group" onClick={() => play("select")}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-yellow/10"><Dumbbell className="h-4 w-4 text-accent-yellow" /></div>
                        <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.exerciseCount} ejercicios</p></div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card>
              <CardHeader><CardTitle className="text-base">Mis clases</CardTitle></CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No tienes clases programadas</p>
                ) : (
                  <div className="space-y-2">
                    {classes.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-yellow/10"><CalendarDays className="h-4 w-4 text-accent-yellow" /></div>
                        <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{dayLabels[c.dayOfWeek] || c.dayOfWeek} . {c.duration}min . {c.bookingsCount}/{c.capacity}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
