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
  BarChart3,
  LogOut,
  Sparkles,
  TrendingUp,
  Cpu,
} from "lucide-react"
import type { ComponentProps } from "react"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<ComponentProps<"svg">>
  roles?: string[]
}

type PlayFn = ReturnType<typeof useSound>["play"]

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["MEMBER"] },
  { label: "Mis Rutinas", href: "/routines", icon: Dumbbell, roles: ["MEMBER"] },
  { label: "Progreso", href: "/progress", icon: TrendingUp, roles: ["MEMBER"] },
  { label: "Clases", href: "/classes", icon: CalendarDays, roles: ["MEMBER"] },
  { label: "Coach Panel", href: "/coach", icon: Users, roles: ["TRAINER"] },
  { label: "Admin Panel", href: "/admin", icon: BarChart3, roles: ["ADMIN"] },
  { label: "Equipo", href: "/gym-equipment", icon: Cpu, roles: ["ADMIN"] },
  { label: "Perfil", href: "/profile", icon: UserCog },
]

const userRoleChip: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "text-gym-orange bg-gym-orange/10" },
  TRAINER: { label: "Coach", className: "text-gym-violet bg-gym-violet/10" },
  MEMBER: { label: "Miembro", className: "text-gym-green bg-gym-green/10" },
  SUPER_ADMIN: { label: "Super Admin", className: "text-destructive bg-destructive/10" },
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
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
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
  const roleSection = filtered.filter((i) => i.roles?.some((r) => r === "TRAINER" || r === "ADMIN"))
  const commonSection = filtered.filter((i) => !i.roles)

  const roleChip = user?.role ? userRoleChip[user.role] : null

  return (
    <aside className={cn("flex flex-col border-r bg-card h-full", className)}>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Sparkles className="h-5 w-5 text-gym-green shrink-0" />
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

  const alwaysShow = [
    { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
    { label: "Rutinas", href: "/routines", icon: Dumbbell },
    { label: "Progreso", href: "/progress", icon: TrendingUp },
    { label: "Clases", href: "/classes", icon: CalendarDays },
    { label: "Perfil", href: "/profile", icon: UserCog },
  ]

  const roleSpecific = [
    ...(isTrainer || isAdmin ? [{ label: "Coach", href: "/coach", icon: Users }] : []),
    ...(isAdmin ? [{ label: "Admin", href: "/admin", icon: BarChart3 }] : []),
  ]

  const bottomItems = [...roleSpecific, ...alwaysShow]

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur md:hidden", className)}>
      <div className="flex items-center justify-around h-16">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => play("click")}
              className={cn(
                "flex flex-col items-center gap-1 px-1 py-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar className="hidden md:flex w-56 shrink-0" />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <AppBottomNav />
    </div>
  )
}
