export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

export function getBMICategory(bmi: number): { label: string; color: string; bgColor: string } {
  if (bmi < 18.5) return { label: "Bajo peso", color: "text-orange-600", bgColor: "bg-orange-50" }
  if (bmi < 25) return { label: "Normal", color: "text-emerald-600", bgColor: "bg-emerald-50" }
  if (bmi < 30) return { label: "Sobrepeso", color: "text-orange-600", bgColor: "bg-orange-50" }
  return { label: "Obesidad", color: "text-red-600", bgColor: "bg-red-50" }
}
