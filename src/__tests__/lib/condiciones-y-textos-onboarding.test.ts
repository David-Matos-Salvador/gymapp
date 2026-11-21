import { describe, it, expect } from "vitest"
import {
  healthConditionsOf,
  needsProfessionalAdvice,
  sanitizeConditionDetail,
} from "@/lib/health-conditions"
import { focusForObjective } from "@/lib/generated-routine"
import {
  experienceOptions,
  scheduleOptions,
  trainingFrequencyOptions,
  trainingHistoryOptions,
} from "@/app/onboarding/constants"

describe("condiciones físicas (#202)", () => {
  it("lee las condiciones sin «Ninguna» y el detalle solo si hay alguna", () => {
    expect(
      healthConditionsOf({ physicalConditions: ["Lesión"], conditionDetail: " Rodilla " })
    ).toEqual({ physicalConditions: ["Lesión"], conditionDetail: "Rodilla" })
    expect(
      healthConditionsOf({ physicalConditions: ["No poseo"], conditionDetail: "Rodilla" })
    ).toEqual({ physicalConditions: [], conditionDetail: null })
    expect(healthConditionsOf(null)).toEqual({ physicalConditions: [], conditionDetail: null })
  })

  it("el detalle se recorta a 300 caracteres y vacío es null", () => {
    expect(sanitizeConditionDetail("x".repeat(400))).toHaveLength(300)
    expect(sanitizeConditionDetail("   ")).toBeNull()
    expect(sanitizeConditionDetail(42)).toBeNull()
  })

  it("con embarazo o lesión se sugiere consultar a un profesional", () => {
    expect(needsProfessionalAdvice(["Embarazo"])).toBe(true)
    expect(needsProfessionalAdvice(["Lesión", "Otras"])).toBe(true)
    expect(needsProfessionalAdvice(["Discapacidad"])).toBe(false)
  })
})

describe("enfoque de la rutina generada (#202)", () => {
  it("no muestra un enfoque de ganar músculo si el objetivo es perder peso", () => {
    expect(focusForObjective("Hipertrofia", "WEIGHT_LOSS")).toBeNull()
    expect(focusForObjective("Crecimiento muscular", "WEIGHT_LOSS")).toBeNull()
    expect(focusForObjective("Definición", "WEIGHT_LOSS")).toBe("Definición")
    expect(focusForObjective("Hipertrofia", "MUSCLE_GAIN")).toBe("Hipertrofia")
    expect(focusForObjective(undefined, "MUSCLE_GAIN")).toBeNull()
  })
})

describe("textos del onboarding sin repetir (#228)", () => {
  it("«Principiante» no repite la respuesta del paso de historial", () => {
    const beginner = experienceOptions.find((o) => o.value === "BEGINNER")!
    const history = trainingHistoryOptions.map((o) => o.label.toLowerCase())
    expect(history).not.toContain(beginner.description.toLowerCase())
  })

  it("la descripción de la frecuencia no repite el número de días", () => {
    for (const option of trainingFrequencyOptions) {
      expect(option.description).not.toContain(String(option.value))
    }
  })

  it("cada franja del horario tiene un emoji distinto", () => {
    const icons = scheduleOptions.map((o) => o.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})
