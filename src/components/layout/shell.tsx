"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useAuth } from "@/hooks/use-auth"
import { useSound } from "@/hooks/use-sound"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  UserCog,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Sparkles,
  Flame,
} from "lucide-react"
import type { ComponentProps } from "react"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<ComponentProps<"svg">>
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["MEMBER"] },
  { label: "Mis Rutinas", href: "/routines", icon: Dumbbell, roles: ["MEMBER", "ADMIN", "TRAINER"] },
  { label: "Clases", href: "/classes", icon: CalendarDays, roles: ["MEMBER", "ADMIN", "TRAINER"] },
  { label: "Coach Panel", href: "/coach", icon: Users, roles: ["TRAINER", "ADMIN"] },
  { label: "Admin Panel", href: "/admin", icon: BarChart3, roles: ["ADMIN"] },
  { label: "Perfil", href: "/profile", icon: UserCog },
]

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user, isAdmin, isTrainer, isMember } = useAuth()
  const { play } = useSound()

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (isAdmin) return item.roles.includes("ADMIN") || item.roles.includes(isAdmin ? "ADMIN" : "")
    if (isTrainer) return item.roles.includes("TRAINER") || item.roles.includes("MEMBER")
    if (isMember) return item.roles.includes("MEMBER")
    return false
  })

  return (
    <aside className={cn("flex flex-col border-r bg-card h-full", className)}>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Sparkles className="h-5 w-5 text-gym-green" />
        <span className="font-semibold text-lg">GymApp</span>
      </div>

      <nav className="flex flex-col gap-1 p-2 flex-1">
        {filteredItems.map((item) => {
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
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
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
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export function AppBottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const { play } = useSound()

  const bottomItems = [
    { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
    { label: "Rutinas", href: "/routines", icon: Dumbbell },
    { label: "Clases", href: "/classes", icon: CalendarDays },
    { label: "Perfil", href: "/profile", icon: UserCog },
  ]

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
                "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
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
