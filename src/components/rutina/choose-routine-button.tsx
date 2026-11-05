"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

// Respaldo para quien no tiene rutina: reabre las recomendaciones del onboarding
export function ChooseRoutineButton() {
  const router = useRouter()
  const { update } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function choose() {
    setLoading(true)
    setError("")
    const res = await fetch("/api/onboarding/reopen", { method: "POST" })
    if (!res.ok) {
      setError("No se pudieron abrir las recomendaciones. Inténtalo de nuevo.")
      setLoading(false)
      return
    }
    await update({ onboardingCompleted: false })
    router.push("/onboarding")
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Button onClick={choose} disabled={loading} className="min-h-11">
        {loading ? "Abriendo..." : "Elegir una rutina"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
