import { describe, it, expect } from "vitest"
import { relativeTime } from "@/components/notifications/notification-list"

// Las notificaciones de hace una semana o más decían «hace 1sem», «hace 1mes» y «hace 2mes»:
// pegado y sin plural.
const now = new Date("2026-11-21T12:00:00Z").getTime()
const DAY = 24 * 60 * 60 * 1000
const hace = (ms: number) => relativeTime(new Date(now - ms).toISOString(), now)

describe("relativeTime", () => {
  it("mantiene los formatos cortos de minutos, horas y días", () => {
    expect(hace(10 * 1000)).toBe("ahora")
    expect(hace(5 * 60 * 1000)).toBe("hace 5m")
    expect(hace(3 * 60 * 60 * 1000)).toBe("hace 3h")
    expect(hace(6 * DAY)).toBe("hace 6d")
  })

  it("separa las semanas del número", () => {
    expect(hace(7 * DAY)).toBe("hace 1 sem")
    expect(hace(29 * DAY)).toBe("hace 4 sem")
  })

  it("separa los meses y usa el plural", () => {
    expect(hace(30 * DAY)).toBe("hace 1 mes")
    expect(hace(65 * DAY)).toBe("hace 2 meses")
  })
})
