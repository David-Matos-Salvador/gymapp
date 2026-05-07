"use client"

import { sounds } from "@/lib/sounds"
import { useCallback } from "react"

export function useSound() {
  const play = useCallback((sound: keyof typeof sounds) => {
    sounds[sound]()
  }, [])

  return { play }
}
