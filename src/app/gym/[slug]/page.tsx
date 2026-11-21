import type { Metadata } from "next"
import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Dumbbell, MapPin, Phone, Mail, ChevronRight, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDays } from "@/lib/utils"

interface GymPageParams {
  params: Promise<{ slug: string }>
}

// `cache` evita consultar dos veces el mismo gimnasio (título y página).
const getActiveGym = cache((slug: string) =>
  prisma.gym.findUnique({
    where: { slug, active: true },
  })
)

export async function generateMetadata({ params }: GymPageParams): Promise<Metadata> {
  const { slug } = await params
  const gym = await getActiveGym(slug)
  return { title: gym?.name ?? "Gimnasio" }
}

export default async function GymPage({ params }: GymPageParams) {
  const { slug } = await params

  const gym = await getActiveGym(slug)

  if (!gym) notFound()

  const plans = await prisma.membershipPlan.findMany({
    where: { gymId: gym.id, active: true },
    orderBy: { price: "asc" },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 h-12">
          <Sparkles className="h-4 w-4 text-gold shrink-0" />
          <span className="font-semibold">GymApp</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Ingresar
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          {gym.logoUrl ? (
            <Image
              src={gym.logoUrl}
              alt={gym.name}
              width={64}
              height={64}
              unoptimized
              className="size-16 rounded-2xl object-cover border"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              <Dumbbell className="size-7 text-gold" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{gym.name}</h1>
            {gym.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="size-3" />
                {gym.address}
              </p>
            )}
          </div>
        </div>

        {(gym.phone || gym.email) && (
          <Card>
            <CardContent className="space-y-2 pt-4">
              {gym.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{gym.phone}</span>
                </div>
              )}
              {gym.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{gym.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Planes disponibles</h2>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay planes disponibles en este momento.
            </p>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {formatCurrency(Number(plan.price), plan.currency)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          / {formatDays(plan.durationDays)}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link href={`/register?gym=${gym.slug}`} className="flex-1">
            <Button className="w-full h-12 rounded-xl">
              Registrarse
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        GymApp &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
