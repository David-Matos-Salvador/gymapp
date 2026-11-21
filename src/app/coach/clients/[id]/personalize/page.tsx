"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/shell"
import { RoutineEditorContent, type Plan } from "@/components/coach/routine-editor-dialog"
import { personalizeConfirmQuestion } from "@/lib/routine-personalization"
import { Dumbbell, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function PersonalizePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const clientId = params.id as string
  const planId = searchParams.get("planId")

  const [plan, setPlan] = useState<Plan | null>(null)
  const [needsCopy, setNeedsCopy] = useState(false)
  const [clientName, setClientName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!planId) {
      router.push(`/coach/clients/${clientId}`)
      return
    }

    // Abrir la pantalla solo consulta: la copia se crea al guardar el primer cambio (#126).
    async function init() {
      try {
        const query = new URLSearchParams({ planId: planId!, assignedUserId: clientId })
        const res = await fetch(`/api/routines/duplicate?${query}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setPlan(data.plan)
        setNeedsCopy(Boolean(data.needsCopy))
        setClientName(data.clientName ?? null)
      } catch {
        toast.error("No se pudo cargar la rutina")
        router.push(`/coach/clients/${clientId}`)
      } finally {
        setLoading(false)
      }
    }
    init()
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createCopy(): Promise<Plan | null> {
    if (!window.confirm(personalizeConfirmQuestion(clientName))) return null
    try {
      const res = await fetch("/api/routines/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, assignedUserId: clientId }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNeedsCopy(false)
      router.replace(`/coach/clients/${clientId}/personalize?planId=${data.plan.id}`, {
        scroll: false,
      })
      return data.plan
    } catch {
      toast.error("No se pudo crear la copia de la rutina")
      return null
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Cargando rutina...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!plan) return null

  const firstName = clientName?.trim().split(/\s+/)[0] || "este cliente"

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <Link
          href={`/coach/clients/${clientId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Volver al cliente
        </Link>

        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-gold" />
          <h1 className="text-2xl font-bold tracking-tight">Personalizar rutina</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {needsCopy
            ? `Mientras no guardes un cambio, la rutina de ${firstName} sigue igual. Al guardar el primero se crea una copia solo para ${firstName}.`
            : "Los cambios que hagas aquí solo afectarán a este cliente."}
        </p>

        <RoutineEditorContent
          plan={plan}
          onPlanUpdated={() => {}}
          onClose={() => router.push(`/coach/clients/${clientId}`)}
          prepareForEdit={needsCopy ? createCopy : undefined}
        />
      </div>
    </AppShell>
  )
}
