"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/shell"
import { RoutineEditorContent, type Plan } from "@/components/coach/routine-editor-dialog"
import { Dumbbell, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function PersonalizePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const clientId = params.id as string
  const planId = searchParams.get("planId")
  const isPersonalized = searchParams.get("personalized") === "1"

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!planId) {
      router.push(`/coach/clients/${clientId}`)
      return
    }

    async function init() {
      try {
        if (isPersonalized) {
          // Already personalized — fetch the plan
          const res = await fetch(`/api/routines/${planId}`)
          if (!res.ok) throw new Error()
          const data = await res.json()
          setPlan(data.plan)
        } else {
          // Duplicate the template plan for this client
          const dupRes = await fetch("/api/routines/duplicate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId, assignedUserId: clientId }),
          })
          if (!dupRes.ok) throw new Error()
          const dupData = await dupRes.json()
          setPlan(dupData.plan)
          // Update URL to reflect personalized state
          router.replace(
            `/coach/clients/${clientId}/personalize?planId=${dupData.plan.id}&personalized=1`,
            { scroll: false }
          )
        }
      } catch {
        toast.error("Error al personalizar la rutina")
        router.push(`/coach/clients/${clientId}`)
      } finally {
        setLoading(false)
      }
    }
    init()
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Personalizando rutina...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!plan) return null

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
          <Dumbbell className="h-6 w-6 text-accent-yellow" />
          <h1 className="text-2xl font-bold tracking-tight">Personalizar rutina</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Los cambios que hagas aquí solo afectarán a este cliente.
        </p>

        <RoutineEditorContent
          plan={plan}
          onPlanUpdated={() => {}}
          onClose={() => router.push(`/coach/clients/${clientId}`)}
        />
      </div>
    </AppShell>
  )
}
