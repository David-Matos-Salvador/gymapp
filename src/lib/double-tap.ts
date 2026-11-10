export const DOUBLE_TAP_MS = 300

interface TapOptions {
  /** Qué hacer con un toque simple (por ejemplo, abrir o cerrar la tarjeta). */
  onSingle: () => void
  /** Qué hacer con dos toques seguidos sobre el mismo elemento. */
  onDouble: () => void
  /**
   * Si es true, el toque simple espera `delayMs` antes de ejecutarse. Sirve cuando el toque
   * simple mueve la pantalla: sin la espera, el segundo toque caería sobre otro elemento.
   */
  defer: boolean
}

/** Distingue un toque simple de un doble toque sobre el mismo elemento. */
export function createDoubleTap(delayMs = DOUBLE_TAP_MS) {
  let last: { id: string; time: number } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    tap(id: string, { onSingle, onDouble, defer }: TapOptions) {
      const now = Date.now()
      cancel()

      if (last && last.id === id && now - last.time < delayMs) {
        last = null
        onDouble()
        return
      }

      last = { id, time: now }
      if (defer) {
        timer = setTimeout(() => {
          timer = null
          onSingle()
        }, delayMs)
      } else {
        onSingle()
      }
    },
    cancel,
  }
}
