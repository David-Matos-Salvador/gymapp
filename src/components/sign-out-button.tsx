"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:text-red-600 transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </button>
  )
}
