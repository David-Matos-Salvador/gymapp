import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"
import { AppShell } from "@/components/layout/shell"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Mail, Phone, Target, Award, BadgeCheck, ArrowRight, Clock } from "lucide-react"
import { OBJECTIVE_LABELS, EXPERIENCE_LABELS } from "@/constants/user"
import { BackButton } from "@/components/back-button"

export default async function CoachClientsListPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) redirect("/coach")

  const clientIds = await getTrainerClientIds(user.id)

  const clients =
    clientIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: clientIds } },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            objective: true,
            experienceLevel: true,
            onboardingCompleted: true,
            createdAt: true,
            bodyMeasurements: { orderBy: { date: "desc" }, take: 1 },
            memberShips: { include: { plan: true }, where: { status: "ACTIVE" }, take: 1 },
          },
          orderBy: { name: "asc" },
        })
      : []

  const now = new Date()

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl space-y-6">
        <div className="flex items-start gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mis clientes</h1>
            <p className="text-muted-foreground">
              {clients.length} cliente{clients.length !== 1 ? "s" : ""} asignado
              {clients.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No tienes clientes asignados</p>
              <p className="text-sm text-muted-foreground">
                Ve al Coach Panel para buscar y asignar miembros.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {clients.map((client) => {
              const isMembershipActive = client.memberShips.some(
                (m) => m.status === "ACTIVE" && new Date(m.endDate) > now && m.paymentConfirmed
              )
              const lastMeasurement = client.bodyMeasurements[0]
              return (
                <Link key={client.id} href={`/coach/clients/${client.id}`} className="block">
                  <Card className="hover:shadow-md hover:border-primary/40 transition-all group cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-yellow/10 text-accent-yellow font-bold text-lg">
                          {(client.name ?? client.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{client.name || "Sin nombre"}</p>
                            {isMembershipActive && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-accent-yellow bg-accent-yellow/10 rounded-full px-1.5 py-0.5">
                                <BadgeCheck className="h-3 w-3" /> Activo
                              </span>
                            )}
                            {!client.onboardingCompleted && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                                <Clock className="h-3 w-3" /> Pendiente de onboarding
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </span>
                            {client.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {client.objective && (
                              <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                                <Target className="h-3 w-3" />
                                {OBJECTIVE_LABELS[client.objective] || client.objective}
                              </span>
                            )}
                            {client.experienceLevel && (
                              <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                                <Award className="h-3 w-3" />
                                {EXPERIENCE_LABELS[client.experienceLevel] ||
                                  client.experienceLevel}
                              </span>
                            )}
                            {lastMeasurement?.weight && (
                              <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                                {lastMeasurement.weight}kg
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 self-center" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
