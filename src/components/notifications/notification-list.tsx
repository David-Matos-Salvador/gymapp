"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  BellOff,
  AlertTriangle,
  CreditCard,
  IdCard,
  Dumbbell,
  Info,
  CheckCheck,
  UserPlus,
  CalendarCheck,
  Target,
  Settings,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface MockNotification {
  id: string
  title: string
  message: string
  type: "INFO" | "WARNING" | "REMINDER" | "PAYMENT" | "MEMBERSHIP" | "CLASS" | "CHECK_IN" | "GOAL" | "SYSTEM" | "TRAINER_REQUEST"
  read: boolean
  createdAt: string
  metadata?: { requestId?: string; trainerId?: string; paymentId?: string }
}

const typeIcon: Record<MockNotification["type"], typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  REMINDER: Bell,
  PAYMENT: CreditCard,
  MEMBERSHIP: IdCard,
  CLASS: Dumbbell,
  CHECK_IN: CalendarCheck,
  GOAL: Target,
  SYSTEM: Settings,
  TRAINER_REQUEST: UserPlus,
}

const typeColor: Record<MockNotification["type"], string> = {
  INFO: "text-blue-500 bg-blue-500/10",
  WARNING: "text-amber-500 bg-amber-500/10",
  REMINDER: "text-violet-500 bg-violet-500/10",
  PAYMENT: "text-emerald-500 bg-emerald-500/10",
  MEMBERSHIP: "text-accent-yellow bg-accent-yellow/10",
  CLASS: "text-rose-500 bg-rose-500/10",
  CHECK_IN: "text-cyan-500 bg-cyan-500/10",
  GOAL: "text-orange-500 bg-orange-500/10",
  SYSTEM: "text-gray-500 bg-gray-500/10",
  TRAINER_REQUEST: "text-indigo-500 bg-indigo-500/10",
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "ahora"
  if (minutes < 60) return `hace ${minutes}m`
  if (hours < 24) return `hace ${hours}h`
  if (days < 7) return `hace ${days}d`
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`
  return `hace ${Math.floor(days / 30)}mes`
}

interface NotificationListProps {
  notifications: MockNotification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onNavigate?: (notification: MockNotification) => void
}

export function NotificationList({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: NotificationListProps) {
  const sorted = [...notifications].sort(
    (a, b) => Number(b.read) - Number(a.read),
  )

  function handleClick(notification: MockNotification) {
    onMarkRead(notification.id)
    if (notification.type === "TRAINER_REQUEST" || notification.type === "PAYMENT") {
      onNavigate?.(notification)
    }
  }
  const unreadCount = notifications.filter((n) => !n.read).length

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
          <BellOff className="size-7 text-muted-foreground" />
        </div>
        <p className="text-base font-medium text-foreground">
          No tenés notificaciones
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando tengas notificaciones, aparecerán acá.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Notificaciones
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent-yellow hover:underline"
          >
            <CheckCheck className="size-3.5" />
            Marcar todas leídas
          </button>
        )}
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {sorted.map((notification, index) => {
            const Icon = typeIcon[notification.type]
            const color = typeColor[notification.type]

            return (
              <motion.button
                key={notification.id}
                type="button"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                onClick={() => handleClick(notification)}
                className={cn(
                  "flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/60",
                  !notification.read && "bg-accent-yellow/5",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    color,
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm leading-snug truncate",
                        !notification.read
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground/80",
                      )}
                    >
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="size-2 shrink-0 rounded-full bg-accent-yellow" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    {relativeTime(notification.createdAt)}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
