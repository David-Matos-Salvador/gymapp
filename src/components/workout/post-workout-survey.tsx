"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const EMOJIS = [
  { emoji: "😫", label: "Muy mal", value: 1 },
  { emoji: "😐", label: "Regular", value: 2 },
  { emoji: "🙂", label: "Bien", value: 3 },
  { emoji: "😄", label: "Muy bien", value: 4 },
  { emoji: "🔥", label: "Excelente", value: 5 },
]

interface PostWorkoutSurveyProps {
  open: boolean
  onClose: () => void
  onSubmit: (rating: number) => void
}

export function PostWorkoutSurvey({ open, onClose, onSubmit }: PostWorkoutSurveyProps) {
  const [selected, setSelected] = useState<number | null>(null)

  const handleSelect = (value: number) => {
    setSelected(value)
    setTimeout(() => {
      onSubmit(value)
      setSelected(null)
    }, 400)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-sm mx-4 rounded-2xl border bg-card p-8 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <h2 className="text-xl font-bold text-center mb-2">¿Cómo te sentiste?</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Valorá tu entrenamiento de hoy
            </p>

            <div className="flex items-center justify-center gap-3">
              {EMOJIS.map((item, i) => (
                <motion.button
                  key={item.value}
                  type="button"
                  onClick={() => handleSelect(item.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl transition-colors",
                    selected === item.value
                      ? "bg-accent-yellow/15 ring-2 ring-accent-yellow"
                      : "hover:bg-muted/50"
                  )}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span
                    className={cn(
                      "text-3xl transition-transform",
                      selected === item.value && "scale-110"
                    )}
                  >
                    {item.emoji}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </motion.button>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <motion.button
                type="button"
                onClick={onClose}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Omitir
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
