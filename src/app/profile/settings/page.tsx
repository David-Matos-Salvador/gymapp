"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Sun, Moon, Monitor, Volume2, VolumeX } from "lucide-react"
import { useSound } from "@/hooks/use-sound"
import { useSettingsStore, type Theme } from "@/stores/settings-store"
import { AppShell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
]

export default function SettingsPage() {
  const router = useRouter()
  const { play } = useSound()
  const { theme, soundEnabled, setTheme, setSoundEnabled } = useSettingsStore()

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl space-y-6">
        {/* Back Button */}
        <button
          onClick={() => {
            play("click")
            router.back()
          }}
          className="inline-flex items-center gap-2 px-2 py-1.5 -ml-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Perfil
        </button>

        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">Personalizá tu experiencia</p>
        </div>

        {/* Appearance Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sun className="h-5 w-5 text-accent-yellow" />
                Apariencia
              </CardTitle>
              <CardDescription>Elige el tema que prefieras</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      play("select")
                      setTheme(opt.value)
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-medium transition-all border",
                      theme === opt.value
                        ? "bg-accent-yellow text-black border-accent-yellow shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sound Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Volume2 className="h-5 w-5 text-accent-yellow" />
                Sonido
              </CardTitle>
              <CardDescription>Activá o desactivá los efectos de sonido</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <button
                onClick={() => {
                  play("toggle")
                  setSoundEnabled(!soundEnabled)
                }}
                className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/30 rounded-b-xl min-h-[56px]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                      soundEnabled
                        ? "bg-accent-yellow/10 text-accent-yellow"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-5 w-5" />
                    ) : (
                      <VolumeX className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Efectos de sonido</p>
                    <p className="text-xs text-muted-foreground">
                      {soundEnabled ? "Activados" : "Desactivados"}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "h-7 w-12 rounded-full transition-colors relative shrink-0",
                    soundEnabled ? "bg-accent-yellow" : "bg-muted-foreground/20"
                  )}
                >
                  <motion.div
                    animate={{ x: soundEnabled ? 22 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
                  />
                </div>
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm text-muted-foreground">Versión</span>
                <span className="text-sm font-medium tabular-nums">1.0.0</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  )
}
