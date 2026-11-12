import { describe, it, expect } from "vitest"
import { SET_LIMITS, clampSetValue, setLimitError } from "@/constants/workout"

describe("límites de una serie", () => {
  it("acepta una serie normal", () => {
    expect(setLimitError({ reps: 10, weight: 60 })).toBeNull()
    expect(setLimitError({ reps: 12, weight: 0 })).toBeNull()
  })

  it("rechaza una serie sin repeticiones", () => {
    expect(setLimitError({ reps: 0, weight: 60 })).toBe("Ingresa entre 1 y 300 repeticiones")
  })

  it("rechaza un peso imposible", () => {
    expect(setLimitError({ reps: 8, weight: 99999 })).toBe("Ingresa un peso entre 0 y 500 kg")
  })

  it("rechaza repeticiones con decimales o fuera del máximo", () => {
    expect(setLimitError({ reps: 8.5, weight: 60 })).not.toBeNull()
    expect(setLimitError({ reps: SET_LIMITS.reps.max + 1, weight: 60 })).not.toBeNull()
  })

  it("recorta lo que se escribe al máximo y nunca deja negativos", () => {
    expect(clampSetValue("weight", 99999)).toBe(SET_LIMITS.weight.max)
    expect(clampSetValue("reps", 5000)).toBe(SET_LIMITS.reps.max)
    expect(clampSetValue("reps", -5)).toBe(0)
    expect(clampSetValue("weight", Number.NaN)).toBe(0)
    expect(clampSetValue("weight", 62.5)).toBe(62.5)
  })
})
