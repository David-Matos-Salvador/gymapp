"use client"

import { sounds } from "@/lib/sounds"
import { useSettingsStore } from "@/stores/settings-store"
import { useCallback } from "react"

export function useSound() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)

  const play = useCallback((sound: keyof typeof sounds) => {
    if (!soundEnabled) return
    sounds[sound]()
  }, [soundEnabled])

  return { play }
}
