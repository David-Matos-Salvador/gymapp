import { describe, it, expect, vi, beforeEach } from "vitest"

const mockStoreState = {
  splitId: "split-1",
  phase: "prepare",
  totalExercises: 5,
  elapsedSeconds: 0,
  savedAt: null,
  currentExerciseIdx: 0,
  completedExerciseIds: [] as string[],
  isResting: false,
  restRemaining: 0,
  restTotalDuration: 60,
  restPausedRemaining: 0,
  isRestPaused: false,
  restUpdatedAt: null,
  setSplitId: vi.fn(),
  setTotalExercises: vi.fn(),
  setPhase: vi.fn(),
  setElapsedSeconds: vi.fn(),
  incrementElapsed: vi.fn(),
  setCurrentExerciseIdx: vi.fn(),
  addCompletedExercise: vi.fn(),
  advanceExercise: vi.fn(),
  startWorkout: vi.fn(),
  finishWorkout: vi.fn(),
  resetWorkout: vi.fn(),
  setResting: vi.fn(),
  setRestRemaining: vi.fn(),
  decrementRest: vi.fn(),
  setRestTotalDuration: vi.fn(),
  setRestPaused: vi.fn(),
  setRestPausedRemaining: vi.fn(),
  setRestUpdatedAt: vi.fn(),
}

vi.mock("react", () => ({
  useCallback: (fn: unknown) => fn,
  useEffect: () => {},
  useRef: (val: unknown) => ({ current: val }),
}))

vi.mock("@/stores/workout-store", () => ({
  useWorkoutStore: Object.assign(
    (selector?: (s: typeof mockStoreState) => unknown) => {
      if (selector) return selector(mockStoreState)
      return mockStoreState
    },
    { getState: () => mockStoreState }
  ),
}))

vi.mock("@/stores/settings-store", () => ({
  useSettingsStore: (selector: (s: { soundEnabled: boolean }) => unknown) =>
    selector({ soundEnabled: false }),
}))

vi.mock("@/lib/sounds", () => ({
  sounds: {
    click: vi.fn(),
    success: vi.fn(),
    restStart: vi.fn(),
    restEnd: vi.fn(),
    restWarning: vi.fn(),
    exerciseComplete: vi.fn(),
    workoutStart: vi.fn(),
    workoutComplete: vi.fn(),
    phaseTransition: vi.fn(),
  },
  startAmbient: vi.fn(() => vi.fn()),
  stopAmbient: vi.fn(),
}))

vi.mock("@/hooks/use-sound", () => ({
  useSound: () => ({ play: vi.fn() }),
}))

vi.stubGlobal("navigator", { vibrate: undefined })

import { useWorkoutSession } from "../use-workout-session"

describe("useWorkoutSession", () => {
  const defaultOptions = { totalExercises: 5 }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState.phase = "prepare"
    mockStoreState.isResting = false
    mockStoreState.isRestPaused = false
    mockStoreState.restRemaining = 0
    mockStoreState.restPausedRemaining = 0
    mockStoreState.elapsedSeconds = 0
    mockStoreState.currentExerciseIdx = 0
    mockStoreState.completedExerciseIds = []
    mockStoreState.savedAt = null
  })

  it("returns the expected interface shape", () => {
    const session = useWorkoutSession(defaultOptions)

    expect(session).toHaveProperty("phase")
    expect(session).toHaveProperty("currentExerciseIdx")
    expect(session).toHaveProperty("completedExercises")
    expect(session).toHaveProperty("elapsedSeconds")
    expect(session).toHaveProperty("elapsedFormatted")
    expect(session).toHaveProperty("restRemaining")
    expect(session).toHaveProperty("isResting")
    expect(session).toHaveProperty("isRestPaused")
    expect(session).toHaveProperty("startWorkout")
    expect(session).toHaveProperty("markExerciseComplete")
    expect(session).toHaveProperty("finishWorkout")
    expect(session).toHaveProperty("skipRest")
    expect(session).toHaveProperty("pauseRest")
    expect(session).toHaveProperty("resumeRest")
  })

  it("exposes startWorkout, markExerciseComplete, finishWorkout as functions", () => {
    const session = useWorkoutSession(defaultOptions)

    expect(typeof session.startWorkout).toBe("function")
    expect(typeof session.markExerciseComplete).toBe("function")
    expect(typeof session.finishWorkout).toBe("function")
    expect(typeof session.skipRest).toBe("function")
    expect(typeof session.pauseRest).toBe("function")
    expect(typeof session.resumeRest).toBe("function")
  })

  it("formats elapsedSeconds into MM:SS", () => {
    mockStoreState.elapsedSeconds = 125

    const session = useWorkoutSession(defaultOptions)

    expect(session.elapsedFormatted).toBe("02:05")
  })

  it("formats elapsedSeconds as 00:00 when zero", () => {
    mockStoreState.elapsedSeconds = 0

    const session = useWorkoutSession(defaultOptions)

    expect(session.elapsedFormatted).toBe("00:00")
  })

  it("reflects store phase in returned phase", () => {
    mockStoreState.phase = "active"

    const session = useWorkoutSession(defaultOptions)

    expect(session.phase).toBe("active")
  })

  it("reflects isResting from store", () => {
    mockStoreState.isResting = true
    mockStoreState.restRemaining = 30

    const session = useWorkoutSession(defaultOptions)

    expect(session.isResting).toBe(true)
  })

  it("reflects restRemaining from store", () => {
    mockStoreState.restRemaining = 45

    const session = useWorkoutSession(defaultOptions)

    expect(session.restRemaining).toBe(45)
  })

  it("reflects isRestPaused from store", () => {
    mockStoreState.isRestPaused = true

    const session = useWorkoutSession(defaultOptions)

    expect(session.isRestPaused).toBe(true)
  })

  it("reflects completedExercises count from store", () => {
    mockStoreState.completedExerciseIds = ["ex-1", "ex-2", "ex-3"]

    const session = useWorkoutSession(defaultOptions)

    expect(session.completedExercises).toBe(3)
  })

  it("calls store.startWorkout when startWorkout is invoked in prepare phase", () => {
    mockStoreState.phase = "prepare"
    mockStoreState.splitId = "split-abc"

    const session = useWorkoutSession(defaultOptions)
    session.startWorkout()

    expect(mockStoreState.startWorkout).toHaveBeenCalledWith("split-abc", 5)
  })

  it("does not call store.startWorkout when phase is not prepare", () => {
    mockStoreState.phase = "active"

    const session = useWorkoutSession(defaultOptions)
    session.startWorkout()

    expect(mockStoreState.startWorkout).not.toHaveBeenCalled()
  })

  it("calls store.finishWorkout when finishWorkout is invoked", () => {
    const onComplete = vi.fn()

    const session = useWorkoutSession({ ...defaultOptions, onComplete })
    session.finishWorkout()

    expect(mockStoreState.finishWorkout).toHaveBeenCalled()
  })

  it("calls markExerciseComplete with matching exercise index", () => {
    mockStoreState.currentExerciseIdx = 2
    mockStoreState.completedExerciseIds = []

    const session = useWorkoutSession(defaultOptions)
    session.markExerciseComplete(2)

    expect(mockStoreState.advanceExercise).toHaveBeenCalled()
  })

  it("does not advance when markExerciseComplete called with wrong index", () => {
    mockStoreState.currentExerciseIdx = 2

    const session = useWorkoutSession(defaultOptions)
    session.markExerciseComplete(0)

    expect(mockStoreState.advanceExercise).not.toHaveBeenCalled()
  })

  it("calls stopRestTimer and store.setResting(false) on skipRest", () => {
    mockStoreState.isResting = true

    const session = useWorkoutSession(defaultOptions)
    session.skipRest()

    expect(mockStoreState.setResting).toHaveBeenCalledWith(false)
    expect(mockStoreState.setRestRemaining).toHaveBeenCalledWith(0)
  })

  it("calls stopRestTimer and store.setRestPaused(true) on pauseRest", () => {
    const session = useWorkoutSession(defaultOptions)
    session.pauseRest()

    expect(mockStoreState.setRestPaused).toHaveBeenCalledWith(true)
  })

  it("calls resumeRest which sets rest from paused remaining", () => {
    mockStoreState.restPausedRemaining = 25

    const session = useWorkoutSession(defaultOptions)
    session.resumeRest()

    expect(mockStoreState.setRestPaused).toHaveBeenCalledWith(false)
    expect(mockStoreState.setRestRemaining).toHaveBeenCalledWith(25)
  })

  it("formats 1-digit minute correctly with leading zero", () => {
    mockStoreState.elapsedSeconds = 67

    const session = useWorkoutSession(defaultOptions)

    expect(session.elapsedFormatted).toBe("01:07")
  })

  it("formats 2-digit second correctly", () => {
    mockStoreState.elapsedSeconds = 3723

    const session = useWorkoutSession(defaultOptions)

    expect(session.elapsedFormatted).toBe("62:03")
  })
})
