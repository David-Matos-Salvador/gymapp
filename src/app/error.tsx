"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { logger } from "@/lib/logger"

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    logger.error("Unhandled UI error", {
      context: {
        boundary: "app/error",
        digest: error.digest,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      },
      error,
    })
  }, [error])

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-6">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Algo salió mal</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Ocurrió un error inesperado. Intenta de nuevo.
      </p>
      <Button onClick={() => unstable_retry()}>Reintentar</Button>
    </div>
  )
}
