"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck, CalendarX, RefreshCw, TriangleAlert, Unplug } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { pluralize } from "@/lib/utils"

interface CalendarConnectionCardProps {
  connection: {
    status: "ACTIVE" | "NEEDS_RECONNECT"
    /** Fecha y hora ya formateadas en la zona horaria del gimnasio. */
    lastSync: string | null
    busyCount: number
  } | null
  notice: { tone: "ok" | "error"; text: string } | null
}

const CONNECT_URL = "/api/coach/calendar/connect"

export function CalendarConnectionCard({ connection, notice }: CalendarConnectionCardProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null)

  async function call(action: "sync" | "disconnect") {
    if (
      action === "disconnect" &&
      !window.confirm(
        "¿Desconectar tu calendario de Google? Las horas en las que estás ocupado ahí volverán a ofrecerse a tus clientes."
      )
    ) {
      return
    }
    setBusy(action)
    const fallback =
      action === "sync" ? "No se pudo sincronizar" : "No se pudo desconectar tu calendario"
    try {
      const res =
        action === "sync"
          ? await fetch("/api/coach/calendar/sync", { method: "POST" })
          : await fetch("/api/coach/calendar", { method: "DELETE" })
      if (res.ok) {
        toast.success(action === "sync" ? "Calendario sincronizado" : "Calendario desconectado")
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? fallback)
      }
      // Sin el aviso de la conexión anterior en la dirección.
      router.replace("/coach/schedule")
      router.refresh()
    } catch {
      toast.error(fallback)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card data-testid="calendar-connection">
      <CardContent className="space-y-4 py-4">
        {notice && (
          <p
            role="status"
            className={
              notice.tone === "ok"
                ? "text-sm font-medium text-emerald-600"
                : "text-sm font-medium text-destructive"
            }
          >
            {notice.text}
          </p>
        )}

        {!connection ? (
          <>
            <div className="flex items-start gap-3">
              <CalendarX className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium">Sin conectar</p>
                <p className="text-sm text-muted-foreground">
                  Conecta tu calendario y las horas en las que ya tienes algo dejarán de ofrecerse a
                  tus clientes. Solo vemos si estás ocupado o libre: nunca los títulos ni los
                  detalles de tus eventos, y no podemos crear ni cambiar nada.
                </p>
              </div>
            </div>
            <Button asChild className="w-full sm:w-auto">
              {/* Enlace normal, no <Link>: la ruta responde con una redirección a Google. */}
              <a href={CONNECT_URL}>Conectar Google Calendar</a>
            </Button>
          </>
        ) : connection.status === "NEEDS_RECONNECT" ? (
          <>
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="font-medium">Hay que volver a conectar</p>
                <p className="text-sm text-muted-foreground">
                  Google ya no nos da acceso a tu calendario. Mientras tanto seguimos bloqueando las
                  horas ocupadas que conocíamos, pero no vemos tus cambios nuevos.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={CONNECT_URL}>Volver a conectar</a>
              </Button>
              <Button variant="outline" disabled={busy !== null} onClick={() => call("disconnect")}>
                <Unplug className="mr-1 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="space-y-1">
                <p className="font-medium">Conectado</p>
                <p className="text-sm text-muted-foreground">
                  {connection.lastSync
                    ? `Última sincronización: ${connection.lastSync}.`
                    : "Todavía no pudimos leer tu calendario. Prueba a sincronizar."}{" "}
                  {connection.lastSync &&
                    (connection.busyCount === 0
                      ? "No tienes horas ocupadas en los próximos días."
                      : `${pluralize(connection.busyCount, "bloqueo", "bloqueos")} en los próximos días.`)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Se actualiza solo cada pocos minutos. Solo leemos si estás ocupado o libre.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy !== null} onClick={() => call("sync")}>
                <RefreshCw className="mr-1 h-4 w-4" />
                {busy === "sync" ? "Sincronizando…" : "Sincronizar ahora"}
              </Button>
              <Button variant="outline" disabled={busy !== null} onClick={() => call("disconnect")}>
                <Unplug className="mr-1 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
