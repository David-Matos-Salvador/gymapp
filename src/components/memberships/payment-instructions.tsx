import { Info } from "lucide-react"

/** Métodos que se pagan fuera de la app y necesitan saber a qué número o cuenta pagar. */
const METHODS_WITH_INSTRUCTIONS = ["YAPE", "TRANSFER"]

/**
 * A qué número de Yape o cuenta pagar, tal como lo escribió el admin del gimnasio (#173).
 * Solo se muestra con Yape o transferencia.
 */
export function PaymentInstructions({
  method,
  instructions,
}: {
  method: string
  instructions: string | null
}) {
  if (!METHODS_WITH_INSTRUCTIONS.includes(method)) return null

  return (
    <div className="flex gap-2 rounded-lg border p-3 text-sm" role="note">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      {instructions ? (
        <div className="space-y-1">
          <p className="font-medium">Cómo pagar</p>
          <p className="whitespace-pre-line break-words text-muted-foreground">{instructions}</p>
        </div>
      ) : (
        <p className="text-muted-foreground">
          Tu gimnasio aún no publicó a qué número o cuenta pagar. Pregunta en recepción.
        </p>
      )}
    </div>
  )
}
