"use client"

import Link from "next/link"
import { Sparkles, ChevronRight, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { useAuth } from "@/hooks/use-auth"
import { useSound } from "@/hooks/use-sound"

export function HeaderSection() {
  const { isAuthenticated } = useAuth()
  const { play } = useSound()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Sparkles className="h-5 w-5 text-gold" />
          GymApp
        </Link>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Button asChild size="sm">
                <Link href="/dashboard" onClick={() => play("click")}>
                  Inicio
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  play("click")
                  void signOut({ callbackUrl: "/" })
                }}
              >
                Cerrar sesión
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" onClick={() => play("click")}>
                  Iniciar sesión
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register" onClick={() => play("click")}>
                  Crear cuenta
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
