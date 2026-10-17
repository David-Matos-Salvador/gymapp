import { describe, it, expect, vi, beforeEach } from "vitest"
import { useSettingsStore } from "@/stores/settings-store"
import { sounds } from "@/lib/sounds"

vi.mock("react", () => ({
  useCallback: (fn: unknown) => fn,
}))

vi.mock("@/stores/settings-store")
vi.mock("@/lib/sounds", () => ({
  sounds: {
    click: vi.fn(),
    success: vi.fn(),
    restStart: vi.fn(),
  },
}))

import { useSound } from "../use-sound"

describe("useSound", () => {
  const mockSoundEnabled = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(
      useSettingsStore as unknown as (selector: (s: unknown) => unknown) => unknown
    ).mockImplementation((selector) => selector({ soundEnabled: mockSoundEnabled() }))
  })

  it("returns play as a function", () => {
    mockSoundEnabled.mockReturnValue(true)

    const { play } = useSound()

    expect(play).toBeDefined()
    expect(typeof play).toBe("function")
  })

  it("calls the sound function when soundEnabled is true", () => {
    mockSoundEnabled.mockReturnValue(true)
    const clickSound = vi.mocked(sounds.click)

    const { play } = useSound()
    play("click")

    expect(clickSound).toHaveBeenCalledTimes(1)
  })

  it("does not call the sound function when soundEnabled is false", () => {
    mockSoundEnabled.mockReturnValue(false)
    const clickSound = vi.mocked(sounds.click)

    const { play } = useSound()
    play("click")

    expect(clickSound).not.toHaveBeenCalled()
  })

  it("can play different sound types", () => {
    mockSoundEnabled.mockReturnValue(true)
    const successSound = vi.mocked(sounds.success)
    const restStartSound = vi.mocked(sounds.restStart)

    const { play } = useSound()
    play("success")
    play("restStart")

    expect(successSound).toHaveBeenCalledTimes(1)
    expect(restStartSound).toHaveBeenCalledTimes(1)
  })
})
