/**
 * Título de un día de la rutina para mostrar junto con su letra («A: Pecho y tríceps»).
 *
 * Las rutinas generadas ya traen la letra en el nombre («Torso / Piernas - A»); en ese caso se
 * muestra solo el nombre, para no repetirla («A: Torso / Piernas - A»).
 */
export function formatSplitTitle(label: string, name: string, separator = ": "): string {
  const trimmedLabel = label.trim()
  const trimmedName = name.trim()
  if (!trimmedLabel) return trimmedName
  if (!trimmedName) return trimmedLabel

  const escaped = trimmedLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const alreadyHasLabel = new RegExp(
    `(^${escaped}\\s*[:.\\-–—)])|([\\s\\-–—(]${escaped}\\)?$)`,
    "i"
  )
  if (alreadyHasLabel.test(trimmedName)) return trimmedName

  return `${trimmedLabel}${separator}${trimmedName}`
}
