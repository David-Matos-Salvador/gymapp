const audioContext =
  typeof window !== "undefined"
    ? new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
    : null

function ensureContext(): AudioContext | null {
  if (!audioContext) return null
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {})
  }
  return audioContext
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.08,
  rampDown = true
) {
  const ctx = ensureContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  gainNode.gain.setValueAtTime(volume, ctx.currentTime)
  if (rampDown) {
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  }

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

function playChime(notes: number[], duration = 0.08, delay = 0.04, volume = 0.06) {
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, duration, "sine", volume), i * delay * 1000)
  })
}

function playSwoop(startFreq: number, endFreq: number, duration: number, volume = 0.05) {
  const ctx = ensureContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime)
  oscillator.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration)

  gainNode.gain.setValueAtTime(volume, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

function playTick(volume = 0.03) {
  playTone(1200, 0.015, "sine", volume)
}

// ─── Capa 1: UI Sonidos Orgánicos (Redondeados, Baja Frecuencia) ───

export const sounds = {
  click: () => playTone(400, 0.04, "sine", 0.04),
  select: () => playChime([330, 392], 0.08, 0.04, 0.05),
  success: () => playChime([262, 330, 392, 523], 0.1, 0.06, 0.06),
  delete: () => playTone(160, 0.18, "triangle", 0.05),
  unlock: () => playChime([523, 659, 784, 1047], 0.08, 0.04, 0.07),
  toggle: () => playTone(330, 0.03, "sine", 0.03),
  notification: () => playChime([523, 659], 0.1, 0.08, 0.06),
  hover: () => playTone(600, 0.02, "sine", 0.02),

  // ─── Sonidos específicos de entrenamiento ───

  setComplete: () => playChime([196, 262], 0.1, 0.06, 0.06),
  exerciseComplete: () => playChime([262, 330, 392, 523], 0.1, 0.06, 0.07),
  restStart: () => playSwoop(262, 131, 0.25, 0.05),
  restEnd: () => playChime([262, 330, 392], 0.08, 0.06, 0.07),
  restWarning: () => {
    playTick(0.04)
    playTick(0.04)
    playTick(0.04)
  },
  workoutStart: () => playChime([262, 330, 392, 523, 659], 0.12, 0.08, 0.07),
  workoutComplete: () => playChime([262, 330, 392, 523, 659, 784], 0.12, 0.07, 0.09),
  streak: () => playChime([523, 659, 784, 1047], 0.09, 0.05, 0.08),
  error: () => playTone(123, 0.22, "triangle", 0.06),
  confetti: () => playChime([784, 988, 1175, 1319, 1568, 1976, 2093], 0.05, 0.02, 0.06),
  phaseTransition: () => playSwoop(196, 330, 0.3, 0.04),
} as const

// ─── Capa 2: Motor de Ambiente ───

type AmbientPhase = "none" | "warmup" | "active" | "cooldown"

let ambientActive = false
let ambientPhase: AmbientPhase = "none"
let ambientGainNode: GainNode | null = null
let ambientSourceA: AudioBufferSourceNode | null = null
let ambientGainA: GainNode | null = null
let ambientSourceB: AudioBufferSourceNode | null = null
let ambientGainB: GainNode | null = null
let activeAmbientChannel: "A" | "B" = "A"

function createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * seconds
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function createAmbientSource(
  ctx: AudioContext,
  phase: AmbientPhase,
  destination: AudioNode
): AudioBufferSourceNode {
  const source = ctx.createBufferSource()
  const buffer = createNoiseBuffer(ctx)
  source.buffer = buffer
  source.loop = true

  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  gain.gain.value = 0

  switch (phase) {
    case "warmup": {
      filter.type = "lowpass"
      filter.frequency.value = 220
      filter.Q.value = 0.7
      gain.gain.value = 0.04
      break
    }
    case "active": {
      filter.type = "bandpass"
      filter.frequency.value = 140
      filter.Q.value = 0.5
      gain.gain.value = 0.025
      break
    }
    case "cooldown": {
      filter.type = "lowpass"
      filter.frequency.value = 180
      filter.Q.value = 0.8
      gain.gain.value = 0.035
      break
    }
    default:
      break
  }

  source.connect(filter)
  filter.connect(gain)
  gain.connect(destination)
  source.start(ctx.currentTime)
  return source
}

function getActiveGain(): GainNode | null {
  return activeAmbientChannel === "A" ? ambientGainA : ambientGainB
}

function startAmbientPhase(phase: AmbientPhase) {
  const ctx = audioContext
  if (!ambientActive || ambientPhase === phase || !ctx) return

  if (!ambientGainNode) return

  const previousPhase = ambientPhase
  ambientPhase = phase

  const fadeOut = previousPhase !== "none"
  const fadeIn = phase !== "none"

  if (fadeOut) {
    const oldGain = getActiveGain()
    if (oldGain) {
      oldGain.gain.cancelScheduledValues(ctx.currentTime)
      oldGain.gain.setValueAtTime(oldGain.gain.value, ctx.currentTime)
      oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5)
      setTimeout(() => {
        const oldSource = activeAmbientChannel === "A" ? ambientSourceA : ambientSourceB
        if (oldSource) {
          try {
            oldSource.stop()
          } catch {
            /* already stopped */
          }
        }
      }, 1600)
    }
  }

  if (fadeIn) {
    activeAmbientChannel = activeAmbientChannel === "A" ? "B" : "A"
    const newSource = createAmbientSource(ctx, phase, ambientGainNode)
    const newGain = getActiveGain()

    if (activeAmbientChannel === "A") {
      if (ambientSourceA) {
        try {
          ambientSourceA.stop()
        } catch {
          /* ignore */
        }
      }
      ambientSourceA = newSource
    } else {
      if (ambientSourceB) {
        try {
          ambientSourceB.stop()
        } catch {
          /* ignore */
        }
      }
      ambientSourceB = newSource
    }

    if (newGain) {
      newGain.gain.cancelScheduledValues(ctx.currentTime)
      newGain.gain.setValueAtTime(0, ctx.currentTime)
      newGain.gain.linearRampToValueAtTime(
        phase === "warmup" ? 0.04 : phase === "active" ? 0.025 : 0.035,
        ctx.currentTime + 1.5
      )
    }
  }
}

export function startAmbient(): (phase: AmbientPhase) => void {
  const ctx = ensureContext()
  if (!ctx) return () => {}

  if (ambientActive) return startAmbientPhase

  ambientActive = true
  ambientGainNode = ctx.createGain()
  ambientGainNode.gain.value = 1.0
  ambientGainNode.connect(ctx.destination)

  ambientGainA = ctx.createGain()
  ambientGainA.gain.value = 0
  ambientGainA.connect(ambientGainNode)

  ambientGainB = ctx.createGain()
  ambientGainB.gain.value = 0
  ambientGainB.connect(ambientGainNode)

  return startAmbientPhase
}

export function stopAmbient() {
  if (!ambientActive) return
  const ctx = audioContext

  if (ambientGainNode && ctx) {
    ambientGainNode.gain.cancelScheduledValues(ctx.currentTime)
    ambientGainNode.gain.setValueAtTime(1.0, ctx.currentTime)
    ambientGainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0)
  }

  setTimeout(() => {
    try {
      ambientSourceA?.stop()
    } catch {
      /* ignore */
    }
    try {
      ambientSourceB?.stop()
    } catch {
      /* ignore */
    }
    ambientSourceA = null
    ambientSourceB = null
    ambientGainA = null
    ambientGainB = null
    ambientGainNode = null
  }, 1100)

  ambientActive = false
  ambientPhase = "none"
  activeAmbientChannel = "A"
}

export type { AmbientPhase }
