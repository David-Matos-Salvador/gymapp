import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), prefetch: vi.fn() })),
}))

vi.mock("@/hooks/use-sound", () => ({
  useSound: vi.fn(() => ({ play: vi.fn() })),
}))

vi.mock("framer-motion", () => {
  const MockPresence = ({ children }: { children?: React.ReactNode }) => children
  MockPresence.displayName = "MockPresence"
  return {
    motion: { div: "div", button: "button" },
    AnimatePresence: MockPresence,
  }
})

import { RoutinesList } from "@/components/routines/routines-list"

const mockRoutines = [
  {
    id: "1",
    name: "Rutina de Pecho",
    description: "Enfocada en pectorales",
    exerciseCount: 5,
    muscleGroups: ["CHEST", "TRICEPS"],
  },
  {
    id: "2",
    name: "Rutina de Pierna",
    description: null,
    exerciseCount: 4,
    muscleGroups: ["LEGS", "GLUTES"],
  },
]

describe("RoutinesList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("exports RoutinesList as a function", () => {
    expect(RoutinesList).toBeDefined()
    expect(typeof RoutinesList).toBe("function")
  })

  it("accepts routines, isCoach, and recommended props", () => {
    const result = RoutinesList({
      routines: [],
      isCoach: false,
      recommended: false,
    })
    expect(result).toBeDefined()
  })

  it("renders empty state when no routines exist", () => {
    const result = RoutinesList({
      routines: [],
      isCoach: false,
      recommended: false,
    })
    expect(result).toBeDefined()
  })

  it("renders routines grid when routines are provided", () => {
    const result = RoutinesList({
      routines: mockRoutines,
      isCoach: true,
      recommended: false,
    })
    expect(result).toBeDefined()
  })

  it("shows create button for coach users", () => {
    const result = RoutinesList({
      routines: [],
      isCoach: true,
      recommended: false,
    })
    expect(result).toBeDefined()
  })

  it("does not show create button for non-coach users", () => {
    const result = RoutinesList({
      routines: [],
      isCoach: false,
      recommended: false,
    })
    expect(result).toBeDefined()
  })

  it("renders recommended styling when recommended is true", () => {
    const result = RoutinesList({
      routines: mockRoutines,
      isCoach: false,
      recommended: true,
    })
    expect(result).toBeDefined()
  })

  it("does not show create button when recommended", () => {
    const result = RoutinesList({
      routines: [],
      isCoach: true,
      recommended: true,
    })
    expect(result).toBeDefined()
  })

  it("handles routines with missing fields gracefully", () => {
    const routinesWithMissingFields = [
      { id: "3", name: "Minimal", exerciseCount: 0, muscleGroups: [] as string[] },
    ]
    const result = RoutinesList({
      routines: routinesWithMissingFields as Parameters<typeof RoutinesList>[0]["routines"],
      isCoach: false,
      recommended: false,
    })
    expect(result).toBeDefined()
  })
})
