"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/shell"
import { NotificationList } from "@/components/notifications"
import type { MockNotification } from "@/components/notifications"
import { toast } from "sonner"
import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { TrainerRequestDialog } from "@/components/notifications/trainer-request-dialog"

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<MockNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications")
        if (!res.ok) throw new Error("Error al cargar notificaciones")
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      } catch {
        toast.error("Error al cargar notificaciones")
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    } catch {
      toast.error("Error al marcar como leída")
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)))
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await Promise.all(
        unreadIds.map((id) => fetch(`/api/notifications/${id}`, { method: "PATCH" }))
      )
    } catch {
      toast.error("Error al marcar todas como leídas")
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: false } : n))
      )
    }
  }, [notifications])

  const handleNavigate = useCallback(
    (notification: MockNotification) => {
      if (notification.type === "TRAINER_REQUEST") {
        const requestId = notification.metadata?.requestId
        if (requestId) setSelectedRequestId(requestId)
        return
      }
      if (notification.type === "PAYMENT") {
        router.push("/membresia")
      }
    },
    [router]
  )

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent-yellow/10">
            <Bell className="size-5 text-accent-yellow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notificaciones</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} sin leer</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 animate-pulse">
                <div className="size-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <NotificationList
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onNavigate={handleNavigate}
          />
        )}
      </div>
      <TrainerRequestDialog
        key={selectedRequestId ?? "closed"}
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        onResolved={() => {
          setSelectedRequestId(null)
          router.refresh()
        }}
      />
    </AppShell>
  )
}
