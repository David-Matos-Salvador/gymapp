"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  UserCog,
  Users,
  BarChart3,
  Sparkles,
  TrendingUp,
  CreditCard,
  UserCheck,
} from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { NotificationBell, NotificationList } from "@/components/notifications"
import type { MockNotification } from "@/components/notifications"
import { toast } from "sonner"

const userRoleChip: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "text-accent-yellow bg-accent-yellow/10" },
  TRAINER: { label: "Coach", className: "text-accent-yellow bg-accent-yellow/10" },
  MEMBER: { label: "Miembro", className: "text-accent-yellow bg-accent-yellow/10" },
  SUPER_ADMIN: { label: "Súper Admin", className: "text-destructive bg-destructive/10" },
}

export function AppBottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const { isAdmin, isTrainer, isSuperAdmin, isMember, isGymOwner } = useAuth()
  const { play } = useSound()
  const [pendingCount, setPendingCount] = useState(0)

  const tabs: { label: string; href: string; icon: typeof LayoutDashboard; badge?: number }[] = []

  useEffect(() => {
    if (isTrainer || isAdmin || isSuperAdmin) {
      fetch("/api/payments/pending-count")
        .then((r) => r.json())
        .then((d) => setPendingCount(d.count ?? 0))
        .catch(() => {})
    }
  }, [isTrainer, isAdmin, isSuperAdmin])

  // Inicio — all roles
  tabs.push({ label: "Inicio", href: "/dashboard", icon: LayoutDashboard })

  // Mi Rutina — MEMBER only
  if (isMember) {
    tabs.push({ label: "Mi Rutina", href: "/rutinas", icon: Dumbbell })
  }

  // Progreso — MEMBER only
  if (isMember) {
    tabs.push({ label: "Progreso", href: "/progress", icon: TrendingUp })
  }

  // Clases — all roles
  tabs.push({ label: "Clases", href: "/classes", icon: CalendarDays })

  // Clientes — TRAINER only
  if (isTrainer && !isAdmin) {
    tabs.push({ label: "Clientes", href: "/coach/clients", icon: Users })
  }

  // Solicitudes — MEMBER only
  if (isMember) {
    tabs.push({ label: "Solicitudes", href: "/requests", icon: UserCheck })
  }

  // Admin — ADMIN, SUPER_ADMIN, gym owners (links to gym management)
  if (isAdmin || isSuperAdmin || isGymOwner) {
    tabs.push({ label: "Admin", href: "/admin/gym-management", icon: BarChart3 })
  }

  // Pagos — TRAINER, ADMIN, SUPER_ADMIN
  if (isTrainer || isAdmin || isSuperAdmin) {
    tabs.push({ label: "Pagos", href: "/coach/payments", icon: CreditCard, badge: pendingCount })
  }

  // Perfil — all roles
  tabs.push({ label: "Perfil", href: "/profile", icon: UserCog })

  const visibleItems = tabs

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom,0px)]",
        className
      )}
    >
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => play("click")}
              className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "text-accent-yellow"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )}
              />
              <span className="text-[11px] leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-accent-yellow" />
              )}
              {item.badge != null && item.badge > 0 && (
                <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const prevPathnameRef = useRef<string | null>(null)
  const { user } = useAuth()

  const [dir, setDir] = useState<1 | -1>(1)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<MockNotification[]>([])

  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      const currDepth = pathname.split("/").filter(Boolean).length
      const prevDepth = (prevPathnameRef.current ?? "").split("/").filter(Boolean).length
      setDir(currDepth >= prevDepth ? 1 : -1)
    }
    prevPathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/notifications")
        if (!res.ok) return
        const data = await res.json()
        const list = (data.notifications ?? []) as MockNotification[]
        setNotifications(list)
        setUnreadCount(list.filter((n) => !n.read).length)
      } catch {
        // silent
      }
    }
    fetchUnreadCount()
  }, [pathname])

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    } catch {
      toast.error("Error al marcar como leída")
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await Promise.all(unreadIds.map((id) => fetch(`/api/notifications/${id}`, { method: "PATCH" })))
    } catch {
      toast.error("Error al marcar todas como leídas")
    }
  }, [notifications])

  const handleNavigate = useCallback((notification: MockNotification) => {
    if (notification.type === "TRAINER_REQUEST") {
      router.push("/requests")
    } else if (notification.type === "PAYMENT") {
      router.push("/coach/payments")
    }
  }, [router])

  const variants = {
    initial: (d: number) => ({ x: d > 0 ? 30 : -30, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -30 : 30, opacity: 0 }),
  }

  const roleChip = user?.role ? userRoleChip[user.role] : null

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex h-12 items-center gap-2 border-b bg-card px-4 shrink-0">
        <Sparkles className="h-4 w-4 text-accent-yellow shrink-0" />
        <span className="font-semibold">GymApp</span>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell
            unreadCount={unreadCount}
          >
            <NotificationList
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              onNavigate={handleNavigate}
            />
          </NotificationBell>
          {roleChip && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${roleChip.className}`}>
              {roleChip.label}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={pathname}
            custom={dir}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <AppBottomNav />
    </div>
  )
}
