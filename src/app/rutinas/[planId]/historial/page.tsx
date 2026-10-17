import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/shell"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Construction } from "lucide-react"

interface PageProps {
  params: Promise<{ planId: string }>
}

export default async function HistorialPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const { planId } = await params

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-4">
        <Breadcrumb
          items={[{ label: "Rutina", href: `/rutinas/${planId}` }, { label: "Historial" }]}
          className="px-0 pb-1"
        />
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <Construction className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold">Historial de entrenamientos</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Esta sección está en construcción. Próximamente podrás ver el historial completo de tus
            sesiones de entrenamiento.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
