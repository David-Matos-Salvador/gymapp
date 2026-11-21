import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockWarn = vi.fn()
vi.mock("@/lib/logger", () => ({
  logger: { warn: (...args: unknown[]) => mockWarn(...args), error: vi.fn(), info: vi.fn() },
}))

import {
  buildRecommendationPayload,
  parseRecommendation,
  recommendRoutineWithAI,
} from "@/lib/ai-routine-recommendation"
import { putRecommendedFirst } from "@/app/onboarding/constants"

const profile = {
  experienceLevel: "BEGINNER",
  trainingFrequency: 3,
  objective: "MUSCLE_GAIN",
  hasInjury: true,
}

const options = [
  {
    id: "plan-intermedio",
    name: "Empuje / Tirón / Piernas · Ganar masa muscular · 3 días",
    difficulty: "INTERMEDIATE",
    splits: [{ name: "Empuje", muscleGroups: ["CHEST", "SHOULDERS"] }],
  },
  {
    id: "plan-base",
    name: "Base para empezar · Ganar masa muscular · 3 días",
    difficulty: "BEGINNER",
    splits: [{ name: "Cuerpo completo A", muscleGroups: ["FULL_BODY"] }],
  },
]

const mockFetch = vi.fn()

function aiAnswers(content: unknown, status = 200) {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", mockFetch)
  vi.stubEnv("DEEPSEEK_API_KEY", "llave-de-prueba")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("recommendRoutineWithAI (#117)", () => {
  it("sin llave no llama a la IA y devuelve null", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "")
    expect(await recommendRoutineWithAI(profile, options)).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("devuelve la plantilla elegida y el motivo", async () => {
    aiAnswers(JSON.stringify({ opcion: 2, motivo: "  Empiezas con lo básico\ny sin prisa. " }))
    expect(await recommendRoutineWithAI(profile, options)).toEqual({
      planId: "plan-base",
      reason: "Empiezas con lo básico y sin prisa.",
    })
  })

  it("llama a DeepSeek con el modelo de chat, en JSON y con la llave solo en la cabecera", async () => {
    aiAnswers(JSON.stringify({ opcion: 1, motivo: "Te conviene." }))
    await recommendRoutineWithAI(profile, options)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.deepseek.com/chat/completions")
    expect(init.headers.Authorization).toBe("Bearer llave-de-prueba")
    const body = JSON.parse(init.body)
    expect(body.model).toBe("deepseek-flash")
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(body.thinking).toEqual({ type: "disabled" })
    expect(init.body).not.toContain("llave-de-prueba")
  })

  it("solo envía datos de entrenamiento: sin ids ni datos de identidad", async () => {
    aiAnswers(JSON.stringify({ opcion: 1, motivo: "Te conviene." }))
    await recommendRoutineWithAI(profile, options)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const sent = JSON.parse(body.messages[1].content)
    expect(sent.persona).toEqual({
      experiencia: "principiante",
      dias_por_semana: 3,
      objetivo: "ganar masa muscular",
      tiene_lesion: true,
    })
    expect(Object.keys(sent)).toEqual(["persona", "rutinas"])
    expect(sent.rutinas.map((r: { opcion: number }) => r.opcion)).toEqual([1, 2])
    expect(body.messages[1].content).not.toContain("plan-base")
    expect(body.messages[1].content).not.toContain("plan-intermedio")
  })

  it("si la IA elige algo que no existe, devuelve null", async () => {
    aiAnswers(JSON.stringify({ opcion: 7, motivo: "Una rutina inventada." }))
    expect(await recommendRoutineWithAI(profile, options)).toBeNull()
  })

  it("si la respuesta no es JSON o viene vacía, devuelve null", async () => {
    aiAnswers("La mejor es la segunda.")
    expect(await recommendRoutineWithAI(profile, options)).toBeNull()
    aiAnswers("   ")
    expect(await recommendRoutineWithAI(profile, options)).toBeNull()
  })

  it("si DeepSeek responde con error, devuelve null", async () => {
    aiAnswers(JSON.stringify({ opcion: 1, motivo: "Te conviene." }), 500)
    expect(await recommendRoutineWithAI(profile, options)).toBeNull()
  })

  it("si la IA tarda más de unos segundos, corta y devuelve null", async () => {
    vi.useFakeTimers()
    mockFetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            const error = new Error("aborted")
            error.name = "AbortError"
            reject(error)
          })
        })
    )
    const pending = recommendRoutineWithAI(profile, options)
    await vi.advanceTimersByTimeAsync(6_000)
    expect(await pending).toBeNull()
  })

  it("si falla la red, devuelve null y no registra la llave", async () => {
    mockFetch.mockRejectedValue(new Error("Bearer llave-de-prueba"))
    expect(await recommendRoutineWithAI(profile, options)).toBeNull()
    expect(JSON.stringify(mockWarn.mock.calls)).not.toContain("llave-de-prueba")
  })

  it("con menos de dos plantillas no hay nada que recomendar", async () => {
    expect(await recommendRoutineWithAI(profile, options.slice(0, 1))).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("parseRecommendation", () => {
  it("rechaza opciones que no son un número entero de la lista", () => {
    expect(parseRecommendation('{"opcion":"2","motivo":"x"}', options)).toBeNull()
    expect(parseRecommendation('{"opcion":0,"motivo":"x"}', options)).toBeNull()
    expect(parseRecommendation('{"opcion":1.5,"motivo":"x"}', options)).toBeNull()
    expect(parseRecommendation('{"opcion":1}', options)).toBeNull()
    expect(parseRecommendation('{"opcion":1,"motivo":"  "}', options)).toBeNull()
  })

  it("recorta un motivo demasiado largo", () => {
    const result = parseRecommendation(
      JSON.stringify({ opcion: 1, motivo: "a".repeat(500) }),
      options
    )
    expect(result?.reason.length).toBe(280)
  })
})

describe("buildRecommendationPayload", () => {
  it("usa valores por defecto si llega un nivel u objetivo desconocido", () => {
    const payload = buildRecommendationPayload(
      { ...profile, experienceLevel: "OTRO", objective: "OTRO" },
      options
    )
    expect(payload.persona.experiencia).toBe("principiante")
    expect(payload.persona.objetivo).toBe("todavía no lo tiene claro")
  })
})

describe("putRecommendedFirst", () => {
  const plans = [{ id: "a" }, { id: "b" }, { id: "c" }]

  it("pone primero la rutina recomendada", () => {
    expect(putRecommendedFirst(plans, "c").map((p) => p.id)).toEqual(["c", "a", "b"])
  })

  it("sin recomendación (o si no está en la lista) deja el orden normal", () => {
    expect(putRecommendedFirst(plans, null)).toBe(plans)
    expect(putRecommendedFirst(plans, "zzz")).toBe(plans)
  })
})
