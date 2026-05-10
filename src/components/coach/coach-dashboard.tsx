"use client"

import { useState } from "react"
import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card , CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users , UserCheck, CalendarDays , Dumbbell, Plus, ArrowRight , Search, UserPlus , Mail, Phone, Target , Award, BadgeCheck, Loader2, Pencil, Briefcase, Info } from "lucide-react"
import { toast } from "sonner"
import { UploadButton } from "@/components/upload-button"

interface ClientData { id: string; name: string | null; email: string; phone: string | null; objective: string | null; experienceLevel: string | null; hasActiveMembership: boolean; membershipPlan: string | null }
interface RoutineData { id: string; name: string; exerciseCount: number }
interface ClassData { id: string; name: string; dayOfWeek: string; duration: number; capacity: number; bookingsCount: number; schedule: string }
interface Stats { totalClients: number; activeMemberships: number; upcomingClasses: number; totalRoutines: number }
interface CoachProfile { image: string | null; name: string; bio: string | null; specialties: string[] | null; yearsExperience: number | null }

const objectiveLabels: Record<string, string> = {
  WEIGHT_LOSS: "Perdida de peso", MUSCLE_GAIN: "Ganancia muscular", TONING: "Tonificacion",
  STRENGTH: "Fuerza", ENDURANCE: "Resistencia", GENERAL_FITNESS: "Fitness general",
  REHABILITATION: "Rehabilitacion", COMPETITION: "Competicion",
}
const experienceLabels: Record<string, string> = { BEGINNER: "Principiante", INTERMEDIATE: "Intermedio", ADVANCED: "Avanzado", ELITE: "Elite" }
const dayLabels: Record<string, string> = { MONDAY: "lunes", TUESDAY: "martes", WEDNESDAY: "miercoles", THURSDAY: "jueves", FRIDAY: "viernes", SATURDAY: "sabado", SUNDAY: "domingo" }

export function CoachDashboard({ clients: initialClients, routines, classes, stats, coach: initialCoach }: {
  clients: ClientData[]; routines: RoutineData[]; classes: ClassData[]; stats: Stats; coach: CoachProfile
}) {
  const { play } = useSound()
  const [clients, setClients] = useState(initialClients)
  const [coach, setCoach] = useState(initialCoach)
  const [searchEmail, setSearchEmail] = useState("")
  const [searchResult, setSearchResult] = useState<{ id: string; name: string | null; email: string } | null>(null)
  const [searchError, setSearchError] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState("")

  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    bio: initialCoach.bio ?? "",
    specialties: initialCoach.specialties?.join(", ") ?? "",
    yearsExperience: initialCoach.yearsExperience?.toString() ?? "",
  })

  async function handleSaveProfile() {
    setProfileSaving(true)
    const specialties = profileForm.specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const body = {
      bio: profileForm.bio.trim() || undefined,
      specialties: specialties.length > 0 ? specialties : undefined,
      yearsExperience: profileForm.yearsExperience ? parseInt(profileForm.yearsExperience, 10) : undefined,
    }
    try {
      const res = await fetch("/api/coach-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        play("success")
        toast.success("Perfil actualizado")
        setCoach((prev) => ({
          ...prev,
          bio: body.bio ?? null,
          specialties: body.specialties ?? null,
          yearsExperience: body.yearsExperience ?? null,
        }))
        setProfileOpen(false)
      } else {
        toast.error("Error al guardar perfil")
      }
    } catch {
      toast.error("Error de conexion")
    }
    setProfileSaving(false)
  }

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
    { label: "Clientes", value: stats.totalClients, icon: Users, color: "border-t-gym-green", iconColor: "text-gym-green", bg: "bg-gym-green/10" },
    { label: "Membresias activas", value: stats.activeMemberships, icon: BadgeCheck, color: "border-t-gym-violet", iconColor: "text-gym-violet", bg: "bg-gym-violet/10" },
    { label: "Clases proximas", value: stats.upcomingClasses, icon: CalendarDays, color: "border-t-gym-orange", iconColor: "text-gym-orange", bg: "bg-gym-orange/10" },
    { label: "Rutinas", value: stats.totalRoutines, icon: Dumbbell, color: "border-t-primary", iconColor: "text-primary", bg: "bg-primary/10" },
  ]

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Coach</h1>
        <p className="text-muted-foreground">Gestiona tus clientes, rutinas y clases</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Mi perfil</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                play("click")
                setProfileForm({
                  bio: coach.bio ?? "",
                  specialties: coach.specialties?.join(", ") ?? "",
                  yearsExperience: coach.yearsExperience?.toString() ?? "",
                })
                setProfileOpen(true)
              }}
            >
              <Pencil className="mr-1 h-4 w-4" /> Editar perfil
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={coach.image ?? undefined} alt={coach.name} />
                <AvatarFallback className="bg-gym-green/10 text-gym-green font-medium">
                  {coach.name[0]?.toUpperCase() ?? "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="text-lg font-semibold">{coach.name}</h3>
                  {coach.yearsExperience != null && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" /> {coach.yearsExperience} {coach.yearsExperience === 1 ? "ano" : "anos"} de experiencia
                    </p>
                  )}
                </div>
                {coach.bio && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {coach.bio}
                  </p>
                )}
                {coach.specialties && coach.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {coach.specialties.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar perfil de coach</DialogTitle>
            <DialogDescription>
              Completa tu perfil para que los clientes te conozcan mejor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coachBio">Biografia</Label>
              <Textarea
                id="coachBio"
                rows={3}
                placeholder="Describe tu experiencia como entrenador..."
                value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coachSpecialties">Especialidades</Label>
              <Input
                id="coachSpecialties"
                placeholder="Hipertrofia, Crossfit, Yoga, etc. (separa con comas)"
                value={profileForm.specialties}
                onChange={(e) => setProfileForm((p) => ({ ...p, specialties: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coachYears">Anos de experiencia</Label>
              <Input
                id="coachYears"
                type="number"
                min={0}
                max={50}
                placeholder="5"
                value={profileForm.yearsExperience}
                onChange={(e) => setProfileForm((p) => ({ ...p, yearsExperience: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <UserPlus className="h-5 w-5 text-gym-green" /><CardTitle>Asignar cliente</CardTitle>
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
            {assignSuccess && <p className="text-sm text-gym-green font-medium">{assignSuccess}</p>}
            {searchResult && (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gym-green/10"><Users className="h-4 w-4 text-gym-green" /></div>
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
            <CardHeader><CardTitle className="text-base">Mis clientes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tienes clientes asignados aun</p>
              ) : clients.map((client, i) => (
                <motion.div key={client.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
                  <Link href={`/coach/clients/${client.id}`} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group" onClick={() => play("select")}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gym-green/10"><Users className="h-5 w-5 text-gym-green" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{client.name || "Sin nombre"}</p>
                        {client.hasActiveMembership && <span className="inline-flex items-center rounded-full bg-gym-green/10 px-1.5 py-0.5 text-xs font-medium text-gym-green">Activo</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{client.email}</span>
                        {client.phone && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{client.phone}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {client.objective && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Target className="h-3 w-3" />{objectiveLabels[client.objective] || client.objective}</span>}
                        {client.experienceLevel && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Award className="h-3 w-3" />{experienceLabels[client.experienceLevel] || client.experienceLevel}</span>}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                  </Link>
                </motion.div>
              ))}
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gym-green/10"><Dumbbell className="h-4 w-4 text-gym-green" /></div>
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gym-violet/10"><CalendarDays className="h-4 w-4 text-gym-violet" /></div>
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
