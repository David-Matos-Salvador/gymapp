export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

/**
 * IMC de una medición: el guardado o, si no se guardó, el calculado con su peso y altura.
 * Las mediciones del seed y las cargadas por el miembro no siempre traen el IMC (#150).
 */
export function measurementBMI(m: {
  bmi?: number | null
  weight?: number | null
  height?: number | null
}): number | null {
  if (m.bmi != null) return m.bmi
  if (!m.weight || !m.height) return null
  return calculateBMI(m.weight, m.height)
}

export function getBMICategory(bmi: number): { label: string; color: string; bgColor: string } {
  if (bmi < 18.5) return { label: "Bajo peso", color: "text-orange-600", bgColor: "bg-orange-50" }
  if (bmi < 25) return { label: "Normal", color: "text-emerald-600", bgColor: "bg-emerald-50" }
  if (bmi < 30) return { label: "Sobrepeso", color: "text-orange-600", bgColor: "bg-orange-50" }
  return { label: "Obesidad", color: "text-red-600", bgColor: "bg-red-50" }
}
