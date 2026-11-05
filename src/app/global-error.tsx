"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    logger.error("Unhandled global UI error", {
      context: {
        boundary: "app/global-error",
        digest: error.digest,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      },
      error,
    })
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--background, #ffffff)",
          color: "var(--foreground, #111111)",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Algo salió mal
          </h1>
          <p style={{ marginBottom: "1.5rem", opacity: 0.75 }}>
            Ocurrió un error inesperado. Intenta de nuevo.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              borderRadius: "0.5rem",
              border: "1px solid var(--border, #d4d4d8)",
              background: "var(--primary, #111111)",
              color: "var(--primary-foreground, #ffffff)",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  )
}
