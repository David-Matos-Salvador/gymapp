import { logger } from "@/lib/logger"

/**
 * Recomendación de rutina con IA (DeepSeek) para el onboarding (#117).
 *
 * La IA solo elige una de las plantillas que ya existen y explica por qué. Recibe
 * experiencia, días por semana, objetivo y si la persona marcó una lesión: nunca nombre,
 * correo, teléfono ni ids. Si falta la llave, la IA falla, tarda o responde algo que no
 * es válido, devuelve `null` y el onboarding sigue con la regla normal (#86).
 */

// Formato y nombre del modelo según la documentación oficial (api-docs.deepseek.com, 11/2026).
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
const DEEPSEEK_MODEL = "deepseek-flash"

export const AI_RECOMMENDATION_TIMEOUT_MS = 6_000
const MAX_REASON_LENGTH = 280

export interface RecommendationProfile {
  experienceLevel: string
  trainingFrequency: number
  objective: string
  hasInjury: boolean
}

export interface RecommendationOption {
  id: string
  name: string
  difficulty: string | null
  splits: { name: string; muscleGroups: string[] }[]
}

export interface RoutineRecommendation {
  planId: string
  reason: string
}

const EXPERIENCE_LABELS: Record<string, string> = {
  BEGINNER: "principiante",
  INTERMEDIATE: "intermedio",
  ADVANCED: "avanzado",
  ELITE: "élite",
}

const OBJECTIVE_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "perder peso",
  MUSCLE_GAIN: "ganar masa muscular",
  GENERAL_FITNESS: "mejorar la forma física",
  UNSURE: "todavía no lo tiene claro",
}

const SYSTEM_PROMPT = `Eres un entrenador personal. Recibes en JSON los datos de entrenamiento de una persona y una lista de rutinas numeradas.
Elige la rutina de la lista que más le conviene. No inventes rutinas ni ejercicios: solo puedes elegir un número de la lista.
Responde únicamente con un objeto JSON con este formato:
{"opcion": 1, "motivo": "Una o dos frases en español, hablándole de tú, que expliquen por qué le conviene."}`

/** Lo único que sale hacia la IA: datos de entrenamiento y opciones numeradas, sin ids. */
export function buildRecommendationPayload(
  profile: RecommendationProfile,
  options: RecommendationOption[]
) {
  return {
    persona: {
      experiencia: EXPERIENCE_LABELS[profile.experienceLevel] ?? "principiante",
      dias_por_semana: profile.trainingFrequency,
      objetivo: OBJECTIVE_LABELS[profile.objective] ?? OBJECTIVE_LABELS.UNSURE,
      tiene_lesion: profile.hasInjury,
    },
    rutinas: options.map((option, index) => ({
      opcion: index + 1,
      nombre: option.name,
      nivel: EXPERIENCE_LABELS[option.difficulty ?? ""] ?? "intermedio",
      dias: option.splits.map((split) => ({
        nombre: split.name,
        grupos_musculares: split.muscleGroups,
      })),
    })),
  }
}

/** Valida la respuesta de la IA: una opción que exista y un motivo corto. */
export function parseRecommendation(
  content: unknown,
  options: RecommendationOption[]
): RoutineRecommendation | null {
  if (typeof content !== "string" || content.trim().length === 0) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null

  const { opcion, motivo } = parsed as { opcion?: unknown; motivo?: unknown }
  if (typeof opcion !== "number" || !Number.isInteger(opcion)) return null
  const option = options[opcion - 1]
  if (!option) return null
  if (typeof motivo !== "string") return null

  const reason = motivo.replace(/\s+/g, " ").trim()
  if (reason.length === 0) return null

  return {
    planId: option.id,
    reason:
      reason.length > MAX_REASON_LENGTH ? `${reason.slice(0, MAX_REASON_LENGTH - 1)}…` : reason,
  }
}

export async function recommendRoutineWithAI(
  profile: RecommendationProfile,
  options: RecommendationOption[]
): Promise<RoutineRecommendation | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || options.length < 2) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_RECOMMENDATION_TIMEOUT_MS)

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(buildRecommendationPayload(profile, options)) },
        ],
        // Sin modo de razonamiento: la respuesta tiene que llegar en pocos segundos.
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.3,
        stream: false,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      logger.warn("AI routine recommendation unavailable", {
        context: { cause: `http_${res.status}` },
      })
      return null
    }

    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    const recommendation = parseRecommendation(data.choices?.[0]?.message?.content, options)
    if (!recommendation) {
      logger.warn("AI routine recommendation unavailable", {
        context: { cause: "invalid_response" },
      })
    }
    return recommendation
  } catch (error) {
    // No se registra el error completo: podría arrastrar la cabecera con la llave.
    const cause = error instanceof Error && error.name === "AbortError" ? "timeout" : "network"
    logger.warn("AI routine recommendation unavailable", { context: { cause } })
    return null
  } finally {
    clearTimeout(timer)
  }
}
