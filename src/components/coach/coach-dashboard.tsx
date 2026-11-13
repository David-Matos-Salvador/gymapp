"use client"

import { pluralize } from "@/lib/utils"
import { buildInviteUrl } from "@/lib/public-url"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  CalendarDays,
  Dumbbell,
  Plus,
  ArrowRight,
  Search,
  UserPlus,
  Mail,
  Phone,
  Target,
  Award,
  BadgeCheck,
  Loader2,
  Send,
  Clock,
  Link2,
  Copy,
  CheckCircle,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { OBJECTIVE_LABELS, EXPERIENCE_LABELS } from "@/constants/user"
import { DAY_OF_WEEK_LABELS } from "@/constants/ui"

interface ClientData {
  id: string
  name: string | null
  email: string
  phone: string | null
  objective: string | null
  experienceLevel: string | null
  hasActiveMembership: boolean
  membershipPlan: string | null
  onboardingCompleted: boolean
}
interface RoutineData {
  id: string
  name: string
  exerciseCount: number
}
interface ClassData {
  id: string
  name: string
  dayOfWeek: string
  startTime: string
  duration: number
  capacity: number
  bookingsCount: number
}
interface Stats {
  totalClients: number
  activeMemberships: number
  upcomingClasses: number
  totalRoutines: number
}
interface SearchMember {
  id: string
  name: string | null
  email: string
  assignedTrainerId: string | null
  hasTrainer: boolean
}
interface TrainerRequest {
  id: string
  clientId: string
  status: string
  createdAt: string
  client: { id: string; name: string | null; email: string }
}
interface InviteData {
  id: string
  token: string
  name: string | null
  email: string | null
  phone: string | null
  status: string
  expiresAt: string
  createdAt: string
  usedBy: { name: string | null; email: string } | null
}

export function CoachDashboard({
  clients,
  routines,
  classes,
  stats,
}: {
  clients: ClientData[]
  routines: RoutineData[]
  classes: ClassData[]
  stats: Stats
}) {
  const { play } = useSound()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchMember[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [assignLoading, setAssignLoading] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [sentRequests, setSentRequests] = useState<TrainerRequest[]>([])
  const [classList, setClassList] = useState<ClassData[]>(classes)
  const [classDialogOpen, setClassDialogOpen] = useState(false)
  const [classSaving, setClassSaving] = useState(false)
  const [classForm, setClassForm] = useState({
    name: "",
    description: "",
    dayOfWeek: "",
    startTime: "",
    duration: "60",
    capacity: "15",
  })
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", phone: "" })
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [invites, setInvites] = useState<InviteData[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch("/api/trainer/requests?status=PENDING")
      .then((r) => r.json())
      .then((d) => setSentRequests(d.requests || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/trainer/invites")
      .then((r) => r.json())
      .then((d) => setInvites(d.invites || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    setSearchLoading(true)
    setSearchError("")
    setAssignSuccess("")
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        if (!res.ok) {
          setSearchError(data.error || "Error al buscar")
          setSearchResults([])
          return
        }
        if (!data.members?.length) {
          setSearchError("No se encontraron miembros")
          setSearchResults([])
          setShowResults(true)
          return
        }
        setSearchResults(data.members)
        setShowResults(true)
      } catch {
        setSearchError("Error de conexion")
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [])

  const handleSendRequest = useCallback(
    async (clientId: string) => {
      setAssignLoading(clientId)
      setAssignSuccess("")
      setSearchError("")
      try {
        const res = await fetch("/api/trainer/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || "Error al enviar solicitud")
          return
        }
        play("success")
        setAssignSuccess(`Solicitud enviada correctamente`)
        setSearchResults((prev) => prev.filter((m) => m.id !== clientId))
        const newRequest: TrainerRequest = {
          id: data.request.id,
          clientId,
          status: "PENDING",
          createdAt: data.request.createdAt,
          client: searchResults.find((m) => m.id === clientId) || {
            id: clientId,
            name: null,
            email: "",
          },
        }
        setSentRequests((prev) => [newRequest, ...prev])
        toast.success("Solicitud enviada al miembro")
      } catch {
        toast.error("Error de conexion")
      } finally {
        setAssignLoading(null)
      }
    },
    [searchResults, play]
  )

  function openInviteDialog() {
    play("click")
    setInviteForm({ name: "", email: "", phone: "" })
    setInviteUrl(null)
    setCopied(false)
    setInviteDialogOpen(true)
  }

  async function handleCreateInvite() {
    setInviteSaving(true)
    try {
      const res = await fetch("/api/trainer/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteForm.name.trim() || undefined,
          email: inviteForm.email.trim() || undefined,
          phone: inviteForm.phone.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al crear la invitación")
        return
      }
      play("success")
      // El dominio se toma del navegador: es el que el coach puede compartir.
      setInviteUrl(buildInviteUrl(window.location.origin, data.invite.token))
      setInvites((prev) => [data.invite, ...prev])
      toast.success("Link de invitación creado")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setInviteSaving(false)
    }
  }

  async function copyInviteLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      play("success")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  async function handleCreateClass() {
    if (!classForm.name.trim() || !classForm.dayOfWeek || !classForm.startTime) {
      toast.error("Completa nombre, día y hora")
      return
    }
    setClassSaving(true)
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: classForm.name.trim(),
        description: classForm.description.trim() || undefined,
        dayOfWeek: classForm.dayOfWeek,
        startTime: classForm.startTime,
        duration: parseInt(classForm.duration) || 60,
        capacity: parseInt(classForm.capacity) || 15,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      play("success")
      toast.success("Clase creada")
      setClassList((prev) => [
        ...prev,
        {
          id: data.class.id,
          name: data.class.name,
          dayOfWeek: data.class.dayOfWeek,
          startTime: data.class.startTime,
          duration: data.class.duration,
          capacity: data.class.capacity,
          bookingsCount: 0,
        },
      ])
      setClassDialogOpen(false)
      setClassForm({
        name: "",
        description: "",
        dayOfWeek: "",
        startTime: "",
        duration: "60",
        capacity: "15",
      })
    } else {
      toast.error(data.error ?? "Error al crear clase")
    }
    setClassSaving(false)
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Coach</h1>
        <p className="text-muted-foreground">Gestiona tus clientes, rutinas y clases</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes" value={stats.totalClients} icon={Users} delay={0} />
        <StatCard
          label="Membresías activas"
          value={stats.activeMemberships}
          icon={BadgeCheck}
          delay={0.05}
        />
        <StatCard
          label="Clases próximas"
          value={stats.upcomingClasses}
          icon={CalendarDays}
          delay={0.1}
        />
        <StatCard
          label="Rutinas"
          value={stats.totalRoutines}
          icon={Dumbbell}
          iconColor="text-primary"
          borderColor="border-t-primary"
          delay={0.15}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent-yellow" />
              <CardTitle>Buscar y enviar solicitud</CardTitle>
            </div>
            <Button size="sm" onClick={openInviteDialog}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo cliente
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative" ref={searchRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar miembro por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      handleSearch(e.target.value)
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              {searchLoading && (
                <div className="absolute z-10 w-full mt-1 rounded-lg border bg-card shadow-lg p-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                </div>
              )}
              {showResults && !searchLoading && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-lg border bg-card shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map((member) => {
                    const hasPending = sentRequests.some(
                      (r) => r.clientId === member.id && r.status === "PENDING"
                    )
                    const hasTrainer = member.hasTrainer
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-yellow/10">
                            <Users className="h-4 w-4 text-accent-yellow" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name || "Sin nombre"}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        {hasTrainer ? (
                          <Badge variant="secondary" className="text-xs">
                            Ya tiene coach
                          </Badge>
                        ) : hasPending ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" /> Pendiente
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSendRequest(member.id)}
                            disabled={assignLoading === member.id}
                          >
                            {assignLoading === member.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}{" "}
                            Enviar solicitud
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {showResults &&
                !searchLoading &&
                searchResults.length === 0 &&
                searchQuery.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 rounded-lg border bg-card shadow-lg p-4 text-sm text-muted-foreground">
                    No se encontraron miembros con &quot;{searchQuery}&quot;
                  </div>
                )}
            </div>
            {searchError && <p className="text-sm text-destructive">{searchError}</p>}
            {assignSuccess && (
              <p className="text-sm text-accent-yellow font-medium">{assignSuccess}</p>
            )}

            {sentRequests.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Solicitudes pendientes
                </p>
                <div className="space-y-2">
                  {sentRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between rounded-lg border p-3 bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-yellow/10">
                          <Clock className="h-4 w-4 text-accent-yellow" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{req.client.name || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">{req.client.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Pendiente
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invites.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Invitaciones</p>
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border p-3 bg-muted/30 gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-yellow/10">
                          <Link2 className="h-4 w-4 text-accent-yellow" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {inv.usedBy
                              ? inv.usedBy.name || inv.usedBy.email
                              : inv.name || inv.email || "Invitación sin datos"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {inv.email || "Sin email"} · expira{" "}
                            {new Date(inv.expiresAt).toLocaleDateString("es")}
                          </p>
                        </div>
                      </div>
                      {inv.status === "COMPLETED" ? (
                        <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                          <CheckCircle className="h-3 w-3" /> Aceptada
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() =>
                            copyInviteLink(buildInviteUrl(window.location.origin, inv.token))
                          }
                        >
                          {copied ? (
                            <Check className="mr-1 h-3 w-3" />
                          ) : (
                            <Copy className="mr-1 h-3 w-3" />
                          )}
                          {copied ? "Copiado" : "Copiar enlace"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          className="min-w-0"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
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
                <EmptyState message="No tienes clientes asignados aún" className="py-4" />
              ) : (
                clients.slice(0, 5).map((client, i) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                  >
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group sm:flex-nowrap">
                      <Link
                        href={`/coach/clients/${client.id}`}
                        className="flex flex-1 min-w-0 items-start gap-3"
                        onClick={() => play("select")}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-yellow/10">
                          <Users className="h-5 w-5 text-accent-yellow" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {client.name || "Sin nombre"}
                            </p>
                            {client.hasActiveMembership && (
                              <span className="inline-flex items-center rounded-full bg-accent-yellow/10 px-1.5 py-0.5 text-xs font-medium text-accent-yellow">
                                Activo
                              </span>
                            )}
                            {!client.onboardingCompleted && (
                              <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                                Pendiente de onboarding
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </span>
                            {client.phone && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {client.objective && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Target className="h-3 w-3" />
                                {OBJECTIVE_LABELS[client.objective] || client.objective}
                              </span>
                            )}
                            {client.experienceLevel && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Award className="h-3 w-3" />
                                {EXPERIENCE_LABELS[client.experienceLevel] ||
                                  client.experienceLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                      {!client.onboardingCompleted ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full shrink-0 sm:w-auto"
                          onClick={() => {
                            play("click")
                            router.push(`/onboarding?memberId=${client.id}`)
                          }}
                        >
                          Completar onboarding
                        </Button>
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              {clients.length > 5 && (
                <div className="text-center pt-1">
                  <Button variant="link" size="sm" asChild onClick={() => play("click")}>
                    <Link href="/coach/clients" className="text-muted-foreground">
                      + {clients.length - 5} {clients.length - 5 === 1 ? "cliente" : "clientes"} más
                      — Ver todos
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Rutinas del gimnasio</CardTitle>
                <Button size="sm" asChild onClick={() => play("click")}>
                  <Link href="/routines/new">
                    <Plus className="mr-1 h-4 w-4" /> Nueva rutina
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {routines.length === 0 ? (
                  <EmptyState message="No has creado rutinas aún" className="py-4" />
                ) : (
                  <div className="space-y-2">
                    {routines.map((r) => (
                      <Link
                        key={r.id}
                        href={`/routines/${r.id}`}
                        className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                        onClick={() => play("select")}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-yellow/10">
                          <Dumbbell className="h-4 w-4 text-accent-yellow" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pluralize(r.exerciseCount, "ejercicio", "ejercicios")}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Mis clases</CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    play("click")
                    setClassDialogOpen(true)
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Nueva clase
                </Button>
              </CardHeader>
              <CardContent>
                {classList.length === 0 ? (
                  <EmptyState message="No tienes clases programadas" className="py-4" />
                ) : (
                  <div className="space-y-2">
                    {classList.map((c) => (
                      <Link
                        key={c.id}
                        href={`/coach/classes/${c.id}`}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-yellow/10">
                          <CalendarDays className="h-4 w-4 text-accent-yellow" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {DAY_OF_WEEK_LABELS[c.dayOfWeek] || c.dayOfWeek} · {c.startTime} ·{" "}
                            {c.duration} min · {c.bookingsCount}/{c.capacity}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva clase</DialogTitle>
            <DialogDescription>Programa una clase grupal recurrente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="className">Nombre</Label>
              <Input
                id="className"
                value={classForm.name}
                onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Spinning"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classDescription">Descripción</Label>
              <Input
                id="classDescription"
                value={classForm.description}
                onChange={(e) => setClassForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Clase de cardio en bici"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Día</Label>
                <Select
                  value={classForm.dayOfWeek}
                  onValueChange={(v) => setClassForm((f) => ({ ...f, dayOfWeek: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elige día" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classStartTime">Hora de inicio</Label>
                <Input
                  id="classStartTime"
                  type="time"
                  value={classForm.startTime}
                  onChange={(e) => setClassForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classDuration">Duración (min)</Label>
                <Input
                  id="classDuration"
                  type="number"
                  min={15}
                  step={5}
                  value={classForm.duration}
                  onChange={(e) => setClassForm((f) => ({ ...f, duration: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classCapacity">Capacidad</Label>
                <Input
                  id="classCapacity"
                  type="number"
                  min={1}
                  value={classForm.capacity}
                  onChange={(e) => setClassForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateClass} disabled={classSaving}>
              {classSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {classSaving ? "Creando..." : "Crear clase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar cliente</DialogTitle>
            <DialogDescription>
              El miembro completa su registro y define su propia contraseña con este link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invName">Nombre (opcional)</Label>
              <Input
                id="invName"
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="invEmail">Email (opcional)</Label>
                <Input
                  id="invEmail"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invPhone">Teléfono (opcional)</Label>
                <Input
                  id="invPhone"
                  type="tel"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+51 999 000 000"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">
              El link expira en 7 días. Si llenas nombre y email, el formulario del cliente ya
              vendrá pre-cargado. Puede completarlo en el gimnasio o en su casa.
            </p>

            {inviteUrl && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium">Link de invitación:</p>
                <p className="text-xs break-all">{inviteUrl}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyInviteLink(inviteUrl)}>
                    {copied ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <Copy className="mr-1 h-3 w-3" />
                    )}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const msg = `Únete a la app de tu coach: ${inviteUrl}`
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
                    }}
                  >
                    <Send className="mr-1 h-3 w-3" /> WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleCreateInvite} disabled={inviteSaving}>
              {inviteSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {inviteSaving ? "Creando..." : "Crear link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
