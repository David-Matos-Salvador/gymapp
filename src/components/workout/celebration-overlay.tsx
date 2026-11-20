"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, Star, Trophy, Zap } from "lucide-react"

const MOTIVATIONAL_MESSAGES = [
  "¡Sigue así, campeón!",
  "¡Cada día más fuerte!",
  "¡Disciplina = resultados!",
  "¡Otro día dominado!",
  "¡Imparable!",
  "¡El esfuerzo vale la pena!",
  "¡Compromiso cumplido!",
  "¡Un paso más hacia tu meta!",
]

const CELEBRATION_ICONS = [Trophy, Flame, Zap, Star]

interface CelebrationOverlayProps {
  open: boolean
  weeklyCompleted: number
  weeklyTarget: number
  weeklyStreak: number
  bestStreak: number
  onClose: () => void
}

function generateConfetti() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 2,
    color: ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#ec4899"][
      Math.floor(Math.random() * 6)
    ],
    size: 4 + Math.random() * 8,
  }))
}

export function CelebrationOverlay({
  open,
  weeklyCompleted,
  weeklyTarget,
  weeklyStreak,
  bestStreak,
  onClose,
}: CelebrationOverlayProps) {
  const [confetti] = useState(generateConfetti)
  const [message] = useState(
    () => MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  )

  useEffect(() => {
    if (open && navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200])
    }
  }, [open])

  if (!open) return null

  // Con racha 0, un «0 semanas seguidas» se lee como «no lograste nada» (#200):
  // mejor decir cuánto falta para cerrar la primera semana.
  const daysLeft = Math.max(weeklyTarget - weeklyCompleted, 0)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-sm mx-4 rounded-2xl border bg-card p-8 shadow-2xl text-center overflow-hidden"
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {confetti.map((c) => (
            <motion.div
              key={c.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${c.x}%`,
                top: -10,
                width: c.size,
                height: c.size,
                backgroundColor: c.color,
              }}
              initial={{ y: -20, opacity: 1 }}
              animate={{ y: "110vh", opacity: 0 }}
              transition={{ delay: c.delay, duration: c.duration, ease: "easeIn" }}
            />
          ))}

          <div className="flex justify-center gap-1 mb-4">
            {CELEBRATION_ICONS.map((Icon, i) => (
              <motion.span
                key={i}
                className="text-accent-yellow"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.25 }}
              >
                <Icon className="h-8 w-8" strokeWidth={1.75} />
              </motion.span>
            ))}
          </div>

          <motion.h2
            className="text-2xl font-bold mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            ¡Entrenamiento completado!
          </motion.h2>

          <motion.p
            className="text-muted-foreground mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {message}
          </motion.p>

          <motion.div
            className="grid grid-cols-2 gap-3 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-2xl font-bold tabular-nums text-accent-yellow">
                {weeklyCompleted}/{weeklyTarget}
              </p>
              <p className="text-[10px] text-muted-foreground">días esta semana</p>
            </div>
            {weeklyStreak > 0 ? (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-2xl font-bold tabular-nums text-accent-yellow">{weeklyStreak}</p>
                <p className="text-[10px] text-muted-foreground">
                  {weeklyStreak === 1 ? "semana seguida" : "semanas seguidas"}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-2xl font-bold tabular-nums text-accent-yellow">{daysLeft}</p>
                <p className="text-[10px] text-muted-foreground">
                  {daysLeft === 1 ? "día" : "días"} para completar tu semana
                </p>
              </div>
            )}
          </motion.div>

          {bestStreak > 0 && (
            <motion.p
              className="text-xs text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Récord histórico: {bestStreak} semana{bestStreak !== 1 ? "s" : ""}
            </motion.p>
          )}

          <motion.button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-accent-yellow px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-yellow/90 transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            Volver a mi rutina
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
