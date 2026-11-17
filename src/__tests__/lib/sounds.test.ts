import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Web Audio falso: registra cada oscilador, ganancia y fuente de ruido que crea el módulo.

class FakeParam {
  value = 0
  setValueAtTime = vi.fn((v: number) => {
    this.value = v
  })
  linearRampToValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
  cancelScheduledValues = vi.fn()
}

class FakeNode {
  connect = vi.fn()
}

class FakeOscillator extends FakeNode {
  type = "sine"
  frequency = new FakeParam()
  start = vi.fn()
  stop = vi.fn()
}

class FakeGain extends FakeNode {
  gain = new FakeParam()
}

class FakeFilter extends FakeNode {
  type = "lowpass"
  frequency = new FakeParam()
  Q = new FakeParam()
}

class FakeBufferSource extends FakeNode {
  buffer: unknown = null
  loop = false
  start = vi.fn()
  stop = vi.fn()
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  state = "running"
  currentTime = 10
  sampleRate = 100
  destination = new FakeNode()
  oscillators: FakeOscillator[] = []
  gains: FakeGain[] = []
  filters: FakeFilter[] = []
  sources: FakeBufferSource[] = []
  resume = vi.fn(() => Promise.resolve())

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createOscillator() {
    const o = new FakeOscillator()
    this.oscillators.push(o)
    return o
  }

  createGain() {
    const g = new FakeGain()
    this.gains.push(g)
    return g
  }

  createBiquadFilter() {
    const f = new FakeFilter()
    this.filters.push(f)
    return f
  }

  createBufferSource() {
    const s = new FakeBufferSource()
    this.sources.push(s)
    return s
  }

  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length)
    return { getChannelData: () => data }
  }
}

type SoundsModule = typeof import("@/lib/sounds")

/** Carga el módulo de cero con un `window` que tiene el AudioContext falso. */
async function loadWithAudio(): Promise<{ mod: SoundsModule; ctx: FakeAudioContext }> {
  vi.stubGlobal("window", { AudioContext: FakeAudioContext })
  const mod = await import("@/lib/sounds")
  const ctx = FakeAudioContext.instances.at(-1)
  if (!ctx) throw new Error("No se creó el AudioContext")
  return { mod, ctx }
}

function frecuencias(ctx: FakeAudioContext) {
  return ctx.oscillators.map((o) => o.frequency.setValueAtTime.mock.calls[0][0])
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  FakeAudioContext.instances = []
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("sounds sin navegador", () => {
  it("no crea AudioContext ni falla cuando no hay window (servidor)", async () => {
    const { sounds, startAmbient, stopAmbient } = await import("@/lib/sounds")

    expect(() => {
      sounds.click()
      sounds.success()
      sounds.restStart()
      sounds.restWarning()
      vi.runAllTimers()
    }).not.toThrow()

    const setPhase = startAmbient()
    expect(() => setPhase("active")).not.toThrow()
    expect(() => stopAmbient()).not.toThrow()
    expect(FakeAudioContext.instances).toHaveLength(0)
  })
})

describe("sounds con Web Audio", () => {
  it("usa webkitAudioContext si no existe AudioContext (Safari antiguo)", async () => {
    vi.stubGlobal("window", { webkitAudioContext: FakeAudioContext })
    const { sounds } = await import("@/lib/sounds")

    sounds.click()

    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(1)
  })

  it("click toca un solo tono sine de 400 Hz con volumen bajo y lo apaga a tiempo", async () => {
    const { mod, ctx } = await loadWithAudio()

    mod.sounds.click()

    expect(ctx.oscillators).toHaveLength(1)
    const [osc] = ctx.oscillators
    const [gain] = ctx.gains
    expect(osc.type).toBe("sine")
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(400, 10)
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.04, 10)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 10.04)
    expect(osc.connect).toHaveBeenCalledWith(gain)
    expect(gain.connect).toHaveBeenCalledWith(ctx.destination)
    expect(osc.start).toHaveBeenCalledWith(10)
    expect(osc.stop).toHaveBeenCalledWith(10.04)
  })

  it("delete y error usan onda triangular de tono grave", async () => {
    const { mod, ctx } = await loadWithAudio()

    mod.sounds.delete()
    mod.sounds.error()

    expect(ctx.oscillators.map((o) => o.type)).toEqual(["triangle", "triangle"])
    expect(frecuencias(ctx)).toEqual([160, 123])
  })

  it("success toca sus cuatro notas en orden, una tras otra", async () => {
    const { mod, ctx } = await loadWithAudio()

    mod.sounds.success()
    // La primera nota sale con setTimeout de 0, así que todavía no suena nada.
    expect(ctx.oscillators).toHaveLength(0)

    vi.advanceTimersByTime(0)
    expect(frecuencias(ctx)).toEqual([262])

    vi.advanceTimersByTime(60)
    expect(frecuencias(ctx)).toEqual([262, 330])

    vi.runAllTimers()
    expect(frecuencias(ctx)).toEqual([262, 330, 392, 523])
  })

  it("cada acorde toca sus notas propias", async () => {
    const { mod, ctx } = await loadWithAudio()

    mod.sounds.workoutComplete()
    vi.runAllTimers()
    expect(frecuencias(ctx)).toEqual([262, 330, 392, 523, 659, 784])

    ctx.oscillators = []
    mod.sounds.confetti()
    vi.runAllTimers()
    expect(frecuencias(ctx)).toEqual([784, 988, 1175, 1319, 1568, 1976, 2093])
  })

  it("restStart baja de 262 a 131 Hz en un barrido", async () => {
    const { mod, ctx } = await loadWithAudio()

    mod.sounds.restStart()

    const [osc] = ctx.oscillators
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(262, 10)
    expect(osc.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(131, 10.25)
    expect(osc.stop).toHaveBeenCalledWith(10.25)
  })

  it("restWarning toca tres ticks agudos", async () => {
    const { mod, ctx } = await loadWithAudio()

    mod.sounds.restWarning()

    expect(frecuencias(ctx)).toEqual([1200, 1200, 1200])
  })

  it("todos los sonidos se pueden tocar sin errores", async () => {
    const { mod, ctx } = await loadWithAudio()

    for (const play of Object.values(mod.sounds)) {
      expect(() => play()).not.toThrow()
    }
    vi.runAllTimers()

    expect(ctx.oscillators.length).toBeGreaterThanOrEqual(Object.keys(mod.sounds).length)
  })

  it("reanuda el AudioContext suspendido antes de tocar", async () => {
    const { mod, ctx } = await loadWithAudio()
    ctx.state = "suspended"

    mod.sounds.click()

    expect(ctx.resume).toHaveBeenCalledTimes(1)
    expect(ctx.oscillators).toHaveLength(1)
  })

  it("no falla si el navegador rechaza reanudar el audio", async () => {
    const { mod, ctx } = await loadWithAudio()
    ctx.state = "suspended"
    ctx.resume.mockReturnValue(Promise.reject(new Error("sin gesto del usuario")))

    expect(() => mod.sounds.toggle()).not.toThrow()
    await Promise.resolve()
  })
})

describe("ambiente", () => {
  it("startAmbient prepara la mezcla sin sonar hasta elegir una fase", async () => {
    const { mod, ctx } = await loadWithAudio()

    mod.startAmbient()

    // Ganancia general + un canal A + un canal B, ambos en silencio.
    expect(ctx.gains).toHaveLength(3)
    const [master, gainA, gainB] = ctx.gains
    expect(master.gain.value).toBe(1)
    expect(master.connect).toHaveBeenCalledWith(ctx.destination)
    expect(gainA.gain.value).toBe(0)
    expect(gainB.gain.value).toBe(0)
    expect(ctx.sources).toHaveLength(0)
  })

  it("llamar startAmbient dos veces no duplica la mezcla", async () => {
    const { mod, ctx } = await loadWithAudio()

    const first = mod.startAmbient()
    const second = mod.startAmbient()

    expect(second).toBe(first)
    expect(ctx.gains).toHaveLength(3)
  })

  it("cada fase arranca un ruido en bucle con su filtro", async () => {
    const { mod, ctx } = await loadWithAudio()
    const setPhase = mod.startAmbient()

    setPhase("warmup")

    expect(ctx.sources).toHaveLength(1)
    const [source] = ctx.sources
    expect(source.loop).toBe(true)
    expect(source.start).toHaveBeenCalledWith(10)
    expect(ctx.filters[0].type).toBe("lowpass")
    expect(ctx.filters[0].frequency.value).toBe(220)

    setPhase("active")
    expect(ctx.sources).toHaveLength(2)
    expect(ctx.filters[1].type).toBe("bandpass")
    expect(ctx.filters[1].frequency.value).toBe(140)

    setPhase("cooldown")
    expect(ctx.sources).toHaveLength(3)
    expect(ctx.filters[2].frequency.value).toBe(180)
  })

  it("repetir la misma fase no crea otra fuente", async () => {
    const { mod, ctx } = await loadWithAudio()
    const setPhase = mod.startAmbient()

    setPhase("active")
    setPhase("active")

    expect(ctx.sources).toHaveLength(1)
  })

  it("al cambiar de fase funde el canal anterior a 0 y sube el nuevo", async () => {
    const { mod, ctx } = await loadWithAudio()
    const setPhase = mod.startAmbient()
    const [, gainA, gainB] = ctx.gains

    // La primera fase entra por el canal B; la siguiente, por el A.
    setPhase("warmup")
    expect(gainB.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.04, 11.5)

    setPhase("active")
    expect(gainB.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 11.5)
    expect(gainA.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.025, 11.5)
  })

  it("stopAmbient baja el volumen y detiene las fuentes", async () => {
    const { mod, ctx } = await loadWithAudio()
    const setPhase = mod.startAmbient()
    setPhase("warmup")
    setPhase("active")
    const master = ctx.gains[0]

    mod.stopAmbient()

    expect(master.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 11)
    vi.advanceTimersByTime(1100)
    for (const source of ctx.sources) {
      expect(source.stop).toHaveBeenCalled()
    }
  })

  it("después de stopAmbient una fase vieja ya no suena y se puede volver a empezar", async () => {
    const { mod, ctx } = await loadWithAudio()
    const setPhase = mod.startAmbient()
    mod.stopAmbient()
    vi.runAllTimers()

    setPhase("active")
    expect(ctx.sources).toHaveLength(0)

    const again = mod.startAmbient()
    again("active")
    expect(ctx.sources).toHaveLength(1)
  })

  it("stopAmbient sin ambiente activo no hace nada", async () => {
    const { mod, ctx } = await loadWithAudio()

    expect(() => mod.stopAmbient()).not.toThrow()
    expect(ctx.gains).toHaveLength(0)
  })
})
