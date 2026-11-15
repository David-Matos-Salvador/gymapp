// Nombre de la copia que se crea al personalizar la rutina de un cliente (#126).
// El intento 0 es el nombre base; los siguientes agregan un número para no chocar
// con otra rutina del mismo coach (el nombre es único por dueño).
export function personalizedPlanName(
  sourceName: string,
  clientName: string | null | undefined,
  attempt = 0
) {
  const firstName = clientName?.trim().split(/\s+/)[0] || "tu cliente"
  const base = sourceName.replace(/\s*\(personalizada para [^)]*\)(\s+\d+)?$/, "")
  const name = `${base} (personalizada para ${firstName})`
  return attempt === 0 ? name : `${name} ${attempt + 1}`
}

export function personalizeConfirmQuestion(clientName: string | null | undefined) {
  const firstName = clientName?.trim().split(/\s+/)[0] || "este cliente"
  return `Se creará una copia personalizada de la rutina para ${firstName}. ¿Continuar?`
}
