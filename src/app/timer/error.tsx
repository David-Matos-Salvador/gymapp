"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Algo salió mal</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Ocurrió un error inesperado. Intenta de nuevo.
        </p>
        <Button onClick={() => reset()}>Reintentar</Button>
      </div>
    </div>
  )
}
