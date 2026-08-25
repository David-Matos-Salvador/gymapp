"use client"

import { useEffect, useRef } from "react"

const EVENT_TYPES = ["pending-count", "notifications"] as const

export function useRealtime(onEvent: (type: string) => void) {
  const cbRef = useRef(onEvent)

  useEffect(() => {
    cbRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    const es = new EventSource("/api/events")

    EVENT_TYPES.forEach((type) => {
      es.addEventListener(type, () => cbRef.current(type))
    })

    return () => es.close()
  }, [])
}
