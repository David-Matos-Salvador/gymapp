"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useAuth } from "@/hooks/use-auth"
import { useSound } from "@/hooks/use-sound"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  UserCog,
  Users,
  UserRound,
  BarChart3,
  LogOut,
  Sparkles,
  TrendingUp,
  Cpu,
  Globe,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ComponentProps } from "react"
import { AnimatePresence, motion } from "framer-motion"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<ComponentProps<"svg">>
  roles?: string[]
}

type PlayFn = ReturnType<typeof useSound>["play"]

const navItems: NavItem[] = [
  { label: "Inicio", href: "/dashboard", icon: LayoutDashboard, roles: ["MEMBER"] },
  { label: "Mi Rutina", href: "/rutina", icon: Dumbbell, roles: ["MEMBER"] },
  { label: "Mis Rutinas", href: "/routines", icon: Dumbbell, roles: ["MEMBER"] },
  { label: "Progreso", href: "/progress", icon: TrendingUp, roles: ["MEMBER"] },
  { label: "Clases", href: "/classes", icon: CalendarDays, roles: ["MEMBER"] },
  { label: "Clientes", href: "/coach/clients", icon: UserRound, roles: ["TRAINER"] },
  { label: "Panel de Coach", href: "/coach", icon: Users, roles: ["TRAINER"] },
  { label: "Panel de Admin", href: "/admin", icon: BarChart3, roles: ["ADMIN"] },
  { label: "Equipo", href: "/gym-equipment", icon: Cpu, roles: ["ADMIN"] },
  { label: "Plataforma", href: "/super-admin", icon: Globe, roles: ["SUPER_ADMIN"] },
  { label: "Perfil", href: "/profile", icon: UserCog },
]

const userRoleChip: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "text-gym-orange bg-gym-orange/10" },
  TRAINER: { label: "Coach", className: "text-gym-violet bg-gym-violet/10" },
  MEMBER: { label: "Miembro", className: "text-gym-green bg-gym-green/10" },
  SUPER_ADMIN: { label: "Súper Admin", className: "text-destructive bg-destructive/10" },
}

function SidebarSection({ label, items, pathname, play }: {
  label?: string
  items: NavItem[]
  pathname: string
  play: PlayFn
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-0.5">
      {label && (
        <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
      )}
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => play("click")}
              className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-accent-yellow/15 text-accent-yellow font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-yellow" />}
          </Link>
        )
      })}
    </div>
  )
}

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user, isAdmin, isTrainer, isMember } = useAuth()
  const { play } = useSound()

  const visibleRoles = (() => {
    if (user?.role === "SUPER_ADMIN") return ["MEMBER", "SUPER_ADMIN"]
    if (isAdmin) return ["MEMBER", "TRAINER", "ADMIN"]
    if (isTrainer) return ["MEMBER", "TRAINER"]
    if (isMember) return ["MEMBER"]
    return []
  })()

  const filtered = navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.some((r) => visibleRoles.includes(r))
  })

  const userSection = filtered.filter((i) => i.roles?.includes("MEMBER"))
  const roleSection = filtered.filter((i) => i.roles?.some((r) => r === "TRAINER" || r === "ADMIN" || r === "SUPER_ADMIN"))
  const commonSection = filtered.filter((i) => !i.roles)

  const roleChip = user?.role ? userRoleChip[user.role] : null

  return (
    <aside className={cn("flex flex-col border-r bg-card h-full", className)}>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Sparkles className="h-5 w-5 text-accent-yellow shrink-0" />
        <span className="font-semibold text-lg">GymApp</span>
        {roleChip && (
          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium ${roleChip.className}`}>
            {roleChip.label}
          </span>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
        <SidebarSection label="Mi entrenamiento" items={userSection} pathname={pathname} play={play} />
        {roleSection.length > 0 && <SidebarSection label="Gesti\u00f3n" items={roleSection} pathname={pathname} play={play} />}
        <SidebarSection items={commonSection} pathname={pathname} play={play} />
      </nav>

      <div className="border-t p-2">
        <button
          onClick={() => {
            play("click")
            signOut({ callbackUrl: "/login" })
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesi\u00f3n
        </button>
      </div>
    </aside>
  )
}

export function AppBottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const { isAdmin, isTrainer } = useAuth()
  const { play } = useSound()

  // Primary tabs — compact, mobile-native
  const primaryTabs = [
    { label: "Mi Rutina", href: "/rutina", icon: Dumbbell },
    { label: "Clases", href: "/classes", icon: CalendarDays },
    { label: "Perfil", href: "/profile", icon: UserCog },
  ]

  // Secondary tabs for trainers/admins — appended at the end
  const roleTabs = [
    ...(isTrainer || isAdmin ? [{ label: "Coach", href: "/coach", icon: Users }] : []),
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: BarChart3 }] : []),
  ]

  // Max visible tabs: 5 (3 primary + 2 role). Overflow handled by `justify-around`.
  const bottomItems = [...primaryTabs, ...roleTabs]

  const visibleItems = roleTabs.length > 0 ? bottomItems : primaryTabs

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur md:hidden",
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
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPathnameRef = useRef<string | null>(null)

  const [dir, setDir] = useState<1 | -1>(1)

  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      const currDepth = pathname.split("/").filter(Boolean).length
      const prevDepth = (prevPathnameRef.current ?? "").split("/").filter(Boolean).length
      setDir(currDepth >= prevDepth ? 1 : -1)
    }
    prevPathnameRef.current = pathname
  }, [pathname])

  const variants = {
    initial: (d: number) => ({ x: d > 0 ? 30 : -30, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -30 : 30, opacity: 0 }),
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar className="hidden md:flex w-56 shrink-0" />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
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
