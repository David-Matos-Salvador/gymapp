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
