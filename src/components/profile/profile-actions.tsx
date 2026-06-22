"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { signOut } from "next-auth/react"
import { useSound } from "@/hooks/use-sound"
import { Card, CardContent } from "@/components/ui/card"
import { Settings, LogOut, ChevronRight, CreditCard } from "lucide-react"

export function ProfileActions() {
  const { play } = useSound()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-2"
    >
      <Card>
        <CardContent className="p-0">
          {/* Settings Link */}
          <Link
            href="/profile/settings"
            onClick={() => play("click")}
            className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors min-h-[48px] rounded-t-xl"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Settings className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Configuración</p>
              <p className="text-xs text-muted-foreground">
                Tema, sonidos y preferencias
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Payments Link */}
          <Link
            href="/profile/payments"
            onClick={() => play("click")}
            className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors min-h-[48px]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Pagos</p>
              <p className="text-xs text-muted-foreground">
                Historial de tus pagos
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Sign Out Button */}
          <button
            onClick={() => {
              play("click")
              signOut({ callbackUrl: "/login" })
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-destructive/5 transition-colors min-h-[48px] rounded-b-xl"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <LogOut className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-destructive">Cerrar sesión</p>
              <p className="text-xs text-muted-foreground">
                Salir de tu cuenta
              </p>
            </div>
          </button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
