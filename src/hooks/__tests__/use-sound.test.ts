import { describe, it, expect, vi, beforeEach } from "vitest"
import { useSettingsStore } from "@/stores/settings-store"
import { sounds } from "@/lib/sounds"

vi.mock("react", () => ({
  useCallback: (fn: unknown) => fn,
}))

vi.mock("@/stores/settings-store")
vi.mock("@/lib/sounds")

import { useSound } from "../use-sound"

describe("useSound", () => {
  const mockSoundEnabled = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sounds).click = vi.fn()
    vi.mocked(sounds).success = vi.fn()
    vi.mocked(sounds).restStart = vi.fn()
    vi.mocked(useSettingsStore as unknown as (selector: (s: unknown) => unknown) => unknown).mockImplementation(
      (selector) => selector({ soundEnabled: mockSoundEnabled() })
    )
  })

  it("returns play as a function", () => {
    mockSoundEnabled.mockReturnValue(true)

    const { play } = useSound()

    expect(play).toBeDefined()
    expect(typeof play).toBe("function")
  })

  it("calls the sound function when soundEnabled is true", () => {
    mockSoundEnabled.mockReturnValue(true)
    const clickSound = vi.fn()
    vi.mocked(sounds).click = clickSound

    const { play } = useSound()
    play("click")

    expect(clickSound).toHaveBeenCalledTimes(1)
  })

  it("does not call the sound function when soundEnabled is false", () => {
    mockSoundEnabled.mockReturnValue(false)
    const clickSound = vi.fn()
    vi.mocked(sounds).click = clickSound

    const { play } = useSound()
    play("click")

    expect(clickSound).not.toHaveBeenCalled()
  })

  it("can play different sound types", () => {
    mockSoundEnabled.mockReturnValue(true)
    const successSound = vi.fn()
    const restStartSound = vi.fn()
    vi.mocked(sounds).success = successSound
    vi.mocked(sounds).restStart = restStartSound

    const { play } = useSound()
    play("success")
    play("restStart")

    expect(successSound).toHaveBeenCalledTimes(1)
    expect(restStartSound).toHaveBeenCalledTimes(1)
  })
})
