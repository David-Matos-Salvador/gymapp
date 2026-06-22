"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useSound } from "@/hooks/use-sound"
import { AppShell } from "@/components/layout/shell"
import { ProfilePayments } from "@/components/profile/profile-payments"

export default function ProfilePaymentsPage() {
  const router = useRouter()
  const { play } = useSound()

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl space-y-6">
        <button
          onClick={() => { play("click"); router.back() }}
          className="inline-flex items-center gap-2 px-2 py-1.5 -ml-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Perfil
        </button>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">Historial de tus pagos</p>
        </div>

        <ProfilePayments />
      </div>
    </AppShell>
  )
}
