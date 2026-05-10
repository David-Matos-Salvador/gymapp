const audioContext = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.08
) {
  if (!audioContext) return
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

function playChime(notes: number[], duration = 0.08, delay = 0.04, volume = 0.06) {
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, duration, "sine", volume), i * delay * 1000)
  })
}

export const sounds = {
  click: () => playTone(600, 0.04, "sine", 0.05),
  select: () => playChime([523, 659, 784], 0.06, 0.03, 0.05),
  success: () => playChime([523, 659, 784, 1047], 0.1, 0.05, 0.07),
  delete: () => playTone(200, 0.15, "triangle", 0.06),
  unlock: () => playChime([784, 988, 1175, 1319, 1568], 0.08, 0.04, 0.07),
  toggle: () => playTone(440, 0.03, "square", 0.03),
  notification: () => playChime([659, 784], 0.08, 0.06, 0.06),
  hover: () => playTone(800, 0.02, "sine", 0.02),
  exerciseComplete: () => playChime([523, 587, 659, 784, 880, 1047], 0.06, 0.03, 0.06),
  streak: () => playChime([880, 1047, 1319, 1568, 1760], 0.07, 0.04, 0.08),
  restStart: () => playTone(440, 0.1, "sine", 0.05),
  restEnd: () => playChime([523, 659, 784], 0.08, 0.06, 0.07),
  workoutComplete: () => playChime([523, 659, 784, 1047, 1319, 1568], 0.1, 0.05, 0.09),
  confetti: () => playChime([784, 988, 1175, 1319, 1568, 1976, 2093], 0.05, 0.02, 0.06),
}
