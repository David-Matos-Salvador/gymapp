// @vitest-environment jsdom
import { createElement } from "react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

// Issue #200: con racha 0, la celebración y el inicio decían «0 semanas seguidas».
vi.mock("framer-motion", () => {
  const sinAnimacion = (tag: string) =>
    function Motion(props: Record<string, unknown>) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, ...resto } = props
      return createElement(tag, resto)
    }
  const motion = new Proxy({}, { get: (_, tag: string) => sinAnimacion(tag) })
  const AnimatePresence = ({ children }: { children?: React.ReactNode }) => children
  return { motion, AnimatePresence }
})

import { CelebrationOverlay } from "@/components/workout/celebration-overlay"
import { MemberDashboard } from "@/components/dashboard/member-dashboard"

afterEach(cleanup)

const base = { open: true, weeklyTarget: 4, bestStreak: 0, onClose: () => {} }

describe("celebración al terminar el entrenamiento", () => {
  it("con racha 0 dice cuántos días faltan y no «0 semanas seguidas»", () => {
    render(<CelebrationOverlay {...base} weeklyCompleted={1} weeklyStreak={0} />)

    expect(screen.queryByText(/semanas? seguidas?/)).toBeNull()
    expect(screen.getByText("3")).toBeTruthy()
    expect(screen.getByText("días para completar tu semana")).toBeTruthy()
  })

  it("usa singular cuando falta un día", () => {
    render(<CelebrationOverlay {...base} weeklyCompleted={3} weeklyStreak={0} />)

    expect(screen.getByText("día para completar tu semana")).toBeTruthy()
  })

  it("con racha muestra las semanas seguidas", () => {
    render(<CelebrationOverlay {...base} weeklyCompleted={4} weeklyStreak={2} bestStreak={2} />)

    expect(screen.getByText("semanas seguidas")).toBeTruthy()
    expect(screen.queryByText(/para completar tu semana/)).toBeNull()
  })
})

describe("tarjeta «Racha semanal» del inicio del miembro", () => {
  const inicio = {
    userName: "Ana",
    membership: null,
    weeklyProgress: { completed: 1, target: 4, percent: 25 },
    workoutDates: [],
    nextWorkout: null,
    bookings: [],
    coach: { hasCoach: false, coachName: null, hasPendingRequest: false, requestStatus: null },
  }

  it("sin racha dice «Por empezar» y no «0 semanas»", () => {
    render(<MemberDashboard {...inicio} weeklyStreak={{ streak: 0, bestStreak: 0 }} />)

    expect(screen.getByText("Por empezar")).toBeTruthy()
    expect(screen.getByText("Cumple tus días de la semana para sumar la primera")).toBeTruthy()
    expect(screen.queryByText(/Mejor: 0/)).toBeNull()
  })

  it("si perdió la racha recuerda su mejor marca", () => {
    render(<MemberDashboard {...inicio} weeklyStreak={{ streak: 0, bestStreak: 3 }} />)

    expect(screen.getByText("Por empezar")).toBeTruthy()
    expect(screen.getByText("Mejor: 3 semanas")).toBeTruthy()
  })

  it("con racha muestra el número de semanas", () => {
    render(<MemberDashboard {...inicio} weeklyStreak={{ streak: 2, bestStreak: 2 }} />)

    expect(screen.queryByText("Por empezar")).toBeNull()
    expect(screen.getByText("semanas")).toBeTruthy()
  })
})
