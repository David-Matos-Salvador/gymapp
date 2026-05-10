"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Theme = "system" | "light" | "dark"

interface SettingsStore {
  theme: Theme
  soundEnabled: boolean
  setTheme: (theme: Theme) => void
  setSoundEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "system",
      soundEnabled: true,
      setTheme: (theme) => set({ theme }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    }),
    {
      name: "gym-settings",
    }
  )
)
