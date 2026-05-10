"use client"

import { useEffect } from "react"
import { useSettingsStore } from "@/stores/settings-store"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    const apply = (mode: "light" | "dark") => {
      if (mode === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      apply(mq.matches ? "dark" : "light")

      const handler = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light")
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }

    apply(theme)
  }, [theme])

  return <>{children}</>
}
