import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createDoubleTap, DOUBLE_TAP_MS } from "@/lib/double-tap"

// Issue #76: con una tarjeta abierta, el primer toque la cerraba, la lista se movía y el
// segundo toque caía en otra tarjeta. El toque simple ahora espera cuando mueve la pantalla.
describe("createDoubleTap", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const preparar = () => {
    const onSingle = vi.fn()
    const onDouble = vi.fn()
    const doubleTap = createDoubleTap()
    const tocar = (id: string, defer: boolean) => doubleTap.tap(id, { onSingle, onDouble, defer })
    return { onSingle, onDouble, doubleTap, tocar }
  }

  it("sin espera, el toque simple se ejecuta al instante", () => {
    const { onSingle, onDouble, tocar } = preparar()
    tocar("a", false)
    expect(onSingle).toHaveBeenCalledTimes(1)
    expect(onDouble).not.toHaveBeenCalled()
  })

  it("con espera, el toque simple se ejecuta al pasar el tiempo del doble toque", () => {
    const { onSingle, tocar } = preparar()
    tocar("a", true)
    expect(onSingle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(DOUBLE_TAP_MS)
    expect(onSingle).toHaveBeenCalledTimes(1)
  })

  it("con espera, dos toques seguidos eligen y no ejecutan el toque simple", () => {
    const { onSingle, onDouble, tocar } = preparar()
    tocar("a", true)
    vi.advanceTimersByTime(100)
    tocar("a", true)
    vi.advanceTimersByTime(DOUBLE_TAP_MS * 2)
    expect(onDouble).toHaveBeenCalledTimes(1)
    expect(onSingle).not.toHaveBeenCalled()
  })

  it("dos toques lentos son dos toques simples", () => {
    const { onSingle, onDouble, tocar } = preparar()
    tocar("a", false)
    vi.advanceTimersByTime(DOUBLE_TAP_MS + 50)
    tocar("a", false)
    expect(onSingle).toHaveBeenCalledTimes(2)
    expect(onDouble).not.toHaveBeenCalled()
  })

  it("dos toques seguidos sobre elementos distintos no eligen ninguno", () => {
    const { onSingle, onDouble, tocar } = preparar()
    tocar("a", true)
    vi.advanceTimersByTime(100)
    tocar("b", true)
    vi.advanceTimersByTime(DOUBLE_TAP_MS)
    expect(onDouble).not.toHaveBeenCalled()
    // El toque pendiente sobre "a" se descarta: solo cuenta el último.
    expect(onSingle).toHaveBeenCalledTimes(1)
  })

  it("cancel descarta el toque simple pendiente", () => {
    const { onSingle, doubleTap, tocar } = preparar()
    tocar("a", true)
    doubleTap.cancel()
    vi.advanceTimersByTime(DOUBLE_TAP_MS * 2)
    expect(onSingle).not.toHaveBeenCalled()
  })
})

describe("tarjetas de rutina del onboarding", () => {
  it("esperan el segundo toque cuando ya hay una tarjeta abierta", () => {
    const fuente = readFileSync(path.join(process.cwd(), "src/app/onboarding/page.tsx"), "utf8")
    expect(fuente).toContain("defer: expandedPlanId !== null")
    expect(fuente).not.toContain("lastClickRef")
  })
})
