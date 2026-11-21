// Rangos aceptados para las mediciones corporales. Los usan el onboarding y las APIs para
// que un error de tipeo (150 % de grasa, 9999 cm) no ensucie el progreso del miembro.
interface MeasurementRange {
  min: number
  max: number
  unit: string
}

const PERIMETER: MeasurementRange = { min: 10, max: 250, unit: "cm" }

export const MEASUREMENT_RANGES = {
  weight: { min: 20, max: 300, unit: "kg" },
  height: { min: 100, max: 250, unit: "cm" },
  bodyFat: { min: 1, max: 70, unit: "%" },
  muscleMass: { min: 10, max: 150, unit: "kg" },
  neck: PERIMETER,
  shoulders: PERIMETER,
  chest: PERIMETER,
  waist: PERIMETER,
  hips: PERIMETER,
  leftArm: PERIMETER,
  rightArm: PERIMETER,
  leftForearm: PERIMETER,
  rightForearm: PERIMETER,
  leftThigh: PERIMETER,
  rightThigh: PERIMETER,
  leftCalf: PERIMETER,
  rightCalf: PERIMETER,
} satisfies Record<string, MeasurementRange>

export type MeasurementKey = keyof typeof MEASUREMENT_RANGES

export function isMeasurementInRange(key: MeasurementKey, value: number): boolean {
  const { min, max } = MEASUREMENT_RANGES[key]
  return Number.isFinite(value) && value >= min && value <= max
}

export function measurementRangeMessage(key: MeasurementKey): string {
  const { min, max, unit } = MEASUREMENT_RANGES[key]
  return `Entre ${min} y ${max} ${unit}`
}

const MEASUREMENT_NAMES: Record<MeasurementKey, string> = {
  weight: "Peso",
  height: "Altura",
  bodyFat: "% de grasa",
  muscleMass: "Masa muscular",
  neck: "Cuello",
  shoulders: "Hombros",
  chest: "Pecho",
  waist: "Cintura",
  hips: "Cadera",
  leftArm: "Bíceps izq.",
  rightArm: "Bíceps der.",
  leftForearm: "Antebrazo izq.",
  rightForearm: "Antebrazo der.",
  leftThigh: "Muslo izq.",
  rightThigh: "Muslo der.",
  leftCalf: "Pantorrilla izq.",
  rightCalf: "Pantorrilla der.",
}

// Revisa un formulario de medidas tal como se escribió (los campos vacíos se ignoran) y
// devuelve el aviso del primer campo fuera de rango, para decir qué corregir antes de enviar.
export function measurementFormError(form: Record<string, string | undefined>): string | null {
  for (const key of Object.keys(MEASUREMENT_RANGES) as MeasurementKey[]) {
    const raw = form[key]?.trim()
    if (!raw) continue
    if (!isMeasurementInRange(key, parseFloat(raw))) {
      const { min, max, unit } = MEASUREMENT_RANGES[key]
      return `${MEASUREMENT_NAMES[key]}: ingresa un valor entre ${min} y ${max} ${unit}`
    }
  }
  return null
}

// Altura escrita en el campo de centímetros. Mucha gente la dice en metros («1.68», «1,68»):
// un valor con decimales entre 1 y 2,5 se toma como metros y se pasa a centímetros.
export function heightInputToCm(cleaned: string): { cm: number; fromMeters: boolean } | null {
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  if (cleaned.includes(".") && num >= 1 && num <= 2.5) {
    return { cm: Math.round(num * 100), fromMeters: true }
  }
  return { cm: num, fromMeters: false }
}

// Limpia lo que se escribe en un campo decimal. Acepta coma o punto (los teclados en español
// traen coma) y devuelve null si quedaría más de un separador.
export function cleanDecimalInput(value: string): string | null {
  const cleaned = value.replace(/,/g, ".").replace(/[^0-9.]/g, "")
  return cleaned.split(".").length > 2 ? null : cleaned
}
