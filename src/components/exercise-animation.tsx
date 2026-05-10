"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnimationPhase {
  name: string
  angle: number
  duration: number
}

interface AnimationData {
  phases: AnimationPhase[]
  joints: string[]
  breathPattern: {
    inhale: string
    exhale: string
  }
}

interface ExerciseData {
  id: string
  name: string
  description?: string | null
  category?: string | null
  muscleGroup: string
  equipment: string
  imageUrl?: string | null
  videoUrl?: string | null
  animationData?: AnimationData | null
  createdAt: string
  updatedAt: string
}

interface ExerciseAnimationProps {
  exerciseId: string
}

// ---------------------------------------------------------------------------
// Drawing constants (all values in a 300×300 coordinate space)
// ---------------------------------------------------------------------------

const CANVAS = 300

const HEAD_CENTER = { x: 150, y: 50 }
const HEAD_RADIUS = 17

const NECK = { x: 150, y: 67 }

const SHOULDER_CENTER = { x: 150, y: 72 }
const SHOULDER_L = { x: 100, y: 72 }
const SHOULDER_R = { x: 200, y: 72 }

const HIP_CENTER = { x: 150, y: 160 }
const HIP_L = { x: 125, y: 160 }
const HIP_R = { x: 175, y: 160 }

const KNEE_L = { x: 115, y: 225 }
const KNEE_R = { x: 185, y: 225 }

const FOOT_L = { x: 105, y: 285 }
const FOOT_R = { x: 195, y: 285 }

const UPPER_ARM_LEN = 52
const FOREARM_LEN = 48
const UPPER_LEG_LEN = 65
const LOWER_LEG_LEN = 60

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the endpoint when traveling `length` pixels from (x, y) at `angleDeg`. */
function pointAtAngle(
  x: number,
  y: number,
  angleDeg: number,
  length: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: x + Math.cos(rad) * length,
    y: y - Math.sin(rad) * length,
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * Map the abstract animation angle (0–90) to a drawing angle range.
 * startDeg, endDeg – the drawing angle values that correspond to
 * animation angle 0 and 90 respectively.
 */
function mapAngle(
  animAngle: number,
  startDeg: number,
  endDeg: number,
): number {
  const t = Math.max(0, Math.min(1, animAngle / 90))
  return lerp(startDeg, endDeg, t)
}

/** Map a Prisma MuscleGroup enum to the body part that should be highlighted. */
function muscleGroupToHighlight(muscleGroup: string): BodyPart {
  const map: Record<string, BodyPart> = {
    CHEST: "torso",
    BACK: "torso",
    SHOULDERS: "shoulders",
    BICEPS: "upperArm",
    TRICEPS: "upperArm",
    LEGS: "upperLeg",
    GLUTES: "hips",
    ABS: "torso",
    CALVES: "lowerLeg",
    FOREARMS: "forearm",
    TRAPS: "shoulders",
    FULL_BODY: "full",
    CARDIO: "full",
  }
  return map[muscleGroup] ?? "full"
}

type BodyPart = "torso" | "shoulders" | "upperArm" | "forearm" | "hips" | "upperLeg" | "lowerLeg" | "full"

// ---------------------------------------------------------------------------
// Drawing a stick figure
// ---------------------------------------------------------------------------

interface ArmAngles {
  /** Upper arm direction in degrees (math coords: 0=right, 90=up) */
  upperArmL: number
  upperArmR: number
  /** Forearm direction in degrees */
  forearmL: number
  forearmR: number
}

/**
 * Compute arm angles from the current animation angle.
 *
 * For arms the animation angle drives the *elbow flexion*:
 *   animAngle 0  → elbow nearly straight (forearm continues upper-arm direction)
 *   animAngle 90 → elbow fully bent   (forearm "curls up" toward shoulder)
 */
function computeArmAngles(
  animAngle: number,
  joints: string[],
): ArmAngles {
  // Resting upper arm hangs mostly down, slightly forward
  const upperRestL = 255 // left arm, degrees (math coords)
  const upperRestR = 285 // right arm

  // How much the elbow bends (interior angle between upper-arm and forearm)
  // At animAngle=0 → 5° bend (almost straight), animAngle=90 → 150° bend
  const elbowBend = mapAngle(animAngle, 5, 150)

  const upperArmL = upperRestL
  const upperArmR = upperRestR

  // Forearm direction = upper arm direction rotated by elbowBend
  // (bending "forward" means rotating toward the body center / upward)
  const forearmL = upperArmL + elbowBend
  const forearmR = upperArmR - elbowBend

  return { upperArmL, upperArmR, forearmL, forearmR }
}

/** Draw the entire stick figure. */
function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  animAngle: number,
  joints: string[],
  highlight: BodyPart,
  staticFigure: boolean,
) {
  const arms = computeArmAngles(animAngle, joints)

  // -- Helper: draw a line segment with optional highlight --
  function line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    part: BodyPart,
  ) {
    const isHighlighted = highlight === part || highlight === "full"
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineWidth = isHighlighted ? width + 2 : width
    ctx.strokeStyle = isHighlighted ? "#ef4444" : "#94a3b8"
    ctx.lineCap = "round"
    ctx.stroke()
  }

  // -- Helper: draw a circle --
  function circle(
    cx: number,
    cy: number,
    r: number,
    part: BodyPart,
    fill?: boolean,
  ) {
    const isHighlighted = highlight === part || highlight === "full"
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    if (fill) {
      ctx.fillStyle = isHighlighted ? "#ef4444" : "#94a3b8"
      ctx.fill()
    } else {
      ctx.strokeStyle = isHighlighted ? "#ef4444" : "#94a3b8"
      ctx.lineWidth = isHighlighted ? 3 : 2
      ctx.stroke()
    }
  }

  // -- Head --
  circle(HEAD_CENTER.x, HEAD_CENTER.y, HEAD_RADIUS, "torso", false)

  // -- Torso (neck → hip) --
  line(NECK.x, NECK.y, SHOULDER_CENTER.x, SHOULDER_CENTER.y, 3, "torso")
  line(SHOULDER_CENTER.x, SHOULDER_CENTER.y, HIP_CENTER.x, HIP_CENTER.y, 3, "torso")

  // -- Shoulder bar --
  line(SHOULDER_L.x, SHOULDER_L.y, SHOULDER_R.x, SHOULDER_R.y, 2, "shoulders")

  // -- Left arm --
  const elbowL = pointAtAngle(SHOULDER_L.x, SHOULDER_L.y, arms.upperArmL, UPPER_ARM_LEN)
  const handL = pointAtAngle(elbowL.x, elbowL.y, arms.forearmL, FOREARM_LEN)

  line(SHOULDER_L.x, SHOULDER_L.y, elbowL.x, elbowL.y, 3.5, "upperArm")
  circle(elbowL.x, elbowL.y, 3, "upperArm", true)
  line(elbowL.x, elbowL.y, handL.x, handL.y, 3, "forearm")
  circle(handL.x, handL.y, 3, "forearm", true)

  // -- Right arm --
  const elbowR = pointAtAngle(SHOULDER_R.x, SHOULDER_R.y, arms.upperArmR, UPPER_ARM_LEN)
  const handR = pointAtAngle(elbowR.x, elbowR.y, arms.forearmR, FOREARM_LEN)

  line(SHOULDER_R.x, SHOULDER_R.y, elbowR.x, elbowR.y, 3.5, "upperArm")
  circle(elbowR.x, elbowR.y, 3, "upperArm", true)
  line(elbowR.x, elbowR.y, handR.x, handR.y, 3, "forearm")
  circle(handR.x, handR.y, 3, "forearm", true)

  // -- Left leg --
  const kneeL = { x: KNEE_L.x, y: KNEE_L.y }
  const footL = { x: FOOT_L.x, y: FOOT_L.y }

  line(HIP_L.x, HIP_L.y, kneeL.x, kneeL.y, 4, "upperLeg")
  circle(kneeL.x, kneeL.y, 3, "upperLeg", true)
  line(kneeL.x, kneeL.y, footL.x, footL.y, 3.5, "lowerLeg")
  circle(footL.x, footL.y, 3, "lowerLeg", true)

  // -- Right leg --
  const kneeR = { x: KNEE_R.x, y: KNEE_R.y }
  const footR = { x: FOOT_R.x, y: FOOT_R.y }

  line(HIP_R.x, HIP_R.y, kneeR.x, kneeR.y, 4, "upperLeg")
  circle(kneeR.x, kneeR.y, 3, "upperLeg", true)
  line(kneeR.x, kneeR.y, footR.x, footR.y, 3.5, "lowerLeg")
  circle(footR.x, footR.y, 3, "lowerLeg", true)

  // -- Hip bar --
  line(HIP_L.x, HIP_L.y, HIP_R.x, HIP_R.y, 2, "hips")

  // -- Shoulder joints --
  circle(SHOULDER_L.x, SHOULDER_L.y, 4, "shoulders", true)
  circle(SHOULDER_R.x, SHOULDER_R.y, 4, "shoulders", true)
}

// ---------------------------------------------------------------------------
// Breathing indicator
// ---------------------------------------------------------------------------

function drawBreathIndicator(
  ctx: CanvasRenderingContext2D,
  currentPhaseName: string,
  breathPattern: AnimationData["breathPattern"],
) {
  const cx = 38
  const cy = 38
  const r = 14

  // Determine color based on breath pattern
  let fillColor = "#94a3b8" // default grey
  if (currentPhaseName === breathPattern.inhale) {
    fillColor = "#10b981" // green
  } else if (currentPhaseName === breathPattern.exhale) {
    fillColor = "#3b82f6" // blue
  } else if (currentPhaseName === "isometric_hold") {
    fillColor = "#a78bfa" // purple (hold breath)
  }

  // Outer glow
  ctx.beginPath()
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
  ctx.fillStyle = fillColor + "33"
  ctx.fill()

  // Main circle
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = fillColor
  ctx.fill()

  // Inner highlight
  ctx.beginPath()
  ctx.arc(cx - 4, cy - 4, r * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = "rgba(255,255,255,0.4)"
  ctx.fill()

  // Label
  ctx.fillStyle = "#1e293b"
  ctx.font = "bold 11px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  const label = currentPhaseName === "isometric_hold"
    ? "MANTENER"
    : currentPhaseName === breathPattern.inhale
      ? "INH"
      : "EXH"
  ctx.fillText(label, cx, cy + r + 6)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExerciseAnimation({ exerciseId }: ExerciseAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const phaseIndexRef = useRef(0)
  const phaseTimeRef = useRef(0)
  const lastTimeRef = useRef(0)

  const [exercise, setExercise] = useState<ExerciseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ------------------------------------------------------------------
  // Fetch exercise data
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    async function fetchExercise() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch("/api/exercises")
        if (!res.ok) throw new Error("Failed to fetch exercises")

        const data = await res.json()
        const found = (data.exercises as ExerciseData[] | undefined)?.find(
          (ex) => ex.id === exerciseId,
        )

        if (!found) throw new Error("Exercise not found")
        if (!cancelled) setExercise(found)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load exercise")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchExercise()
    return () => {
      cancelled = true
    }
  }, [exerciseId])

  // ------------------------------------------------------------------
  // Animation loop
  // ------------------------------------------------------------------
  const tick = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const animData = exercise?.animationData ?? null

    // -- No animation data → draw static figure once --
    if (!animData) {
      ctx.clearRect(0, 0, CANVAS, CANVAS)
      const highlightPart = muscleGroupToHighlight(exercise?.muscleGroup ?? "FULL_BODY")
      drawStickFigure(ctx, 0, [], highlightPart, true)
      // Draw a small dot to indicate static mode
      ctx.beginPath()
      ctx.arc(CANVAS - 24, 24, 6, 0, Math.PI * 2)
      ctx.fillStyle = "#cbd5e1"
      ctx.fill()
      return
    }

    const now = performance.now()
    if (lastTimeRef.current === 0) lastTimeRef.current = now
    const delta = Math.min(now - lastTimeRef.current, 50) // cap at 50ms
    lastTimeRef.current = now

    phaseTimeRef.current += delta
    const phases = animData.phases
    const currentPhase = phases[phaseIndexRef.current]

    // Transition to next phase when current phase duration is exceeded
    if (phaseTimeRef.current >= currentPhase.duration) {
      phaseTimeRef.current -= currentPhase.duration
      phaseIndexRef.current = (phaseIndexRef.current + 1) % phases.length
    }

    // Compute the current animation angle
    const phase = phases[phaseIndexRef.current]
    let currentAngle: number

    if (phase.name === "isometric_hold") {
      // Hold phase: angle stays constant
      currentAngle = phase.angle
    } else {
      // Non-hold phase: interpolate from the previous phase's angle
      const prevIndex = (phaseIndexRef.current - 1 + phases.length) % phases.length
      const prevPhase = phases[prevIndex]
      const progress = Math.min(phaseTimeRef.current / phase.duration, 1)
      const eased = easeInOutQuad(progress)
      currentAngle = lerp(prevPhase.angle, phase.angle, eased)
    }

    // Clear and draw
    ctx.clearRect(0, 0, CANVAS, CANVAS)

    const highlightPart = muscleGroupToHighlight(exercise?.muscleGroup ?? "FULL_BODY")
    const currentPhaseName = phases[phaseIndexRef.current].name

    drawStickFigure(ctx, currentAngle, animData.joints, highlightPart, false)
    drawBreathIndicator(ctx, currentPhaseName, animData.breathPattern)

    rafRef.current = requestAnimationFrame(tick)
  }, [exercise])

  // Start / restart the animation loop whenever the exercise data changes
  useEffect(() => {
    if (!exercise || loading) return

    // Reset animation state
    phaseIndexRef.current = 0
    phaseTimeRef.current = 0
    lastTimeRef.current = 0

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [exercise, loading, tick])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  // -- Loading skeleton --
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto flex min-h-[250px] max-w-[300px] items-center justify-center rounded-xl bg-muted/30"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </motion.div>
    )
  }

  // -- Error state --
  if (error || !exercise) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto flex min-h-[250px] max-w-[300px] flex-col items-center justify-center gap-2 rounded-xl bg-muted/30 px-4"
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-muted-foreground"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-center text-sm text-muted-foreground">
          {error || "Exercise not found"}
        </p>
      </motion.div>
    )
  }

  const hasAnimation = !!exercise.animationData

  const hasVideo = !!exercise.videoUrl

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex min-h-[250px] max-w-[300px] flex-col items-center gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
<<<<<<< ours
      {hasVideo ? (
        <div className="w-full aspect-video rounded-lg overflow-hidden">
          <iframe
            src={exercise.videoUrl!}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={exercise.name}
          />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={CANVAS}
          height={CANVAS}
          className="w-full max-w-[240px] aspect-square rounded-lg"
          aria-label={`${exercise.name} animation`}
        />
      )}
=======
      <canvas
        ref={canvasRef}
        width={CANVAS}
        height={CANVAS}
        className="w-full max-w-[240px] aspect-square rounded-lg"
        aria-label={`${exercise.name} animación`}
      />
>>>>>>> theirs

      {/* Breathing legend (only for animated exercises) */}
      {hasAnimation && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Inhalar
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
            Exhalar
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400" />
            Mantener
          </span>
        </div>
      )}

      {/* Muscle group label */}
      <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
        {exercise.muscleGroup.replace(/_/g, " ")}
      </span>
    </motion.div>
  )
}
