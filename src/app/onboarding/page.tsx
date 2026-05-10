"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useSound } from "@/hooks/use-sound"
import {
  Target,
  Flame,
  Heart,
  HelpCircle,
  Dumbbell,
  Calendar,
  Star,
  Zap,
  Award,
  Trophy,
  Timer,
  Scale,
  Clock,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  User,
  Activity,
  LogOut,
  List,
} from "lucide-react"

type Objective = "WEIGHT_LOSS" | "MUSCLE_GAIN" | "GENERAL_FITNESS" | "UNSURE"
type TrainingHistory = "NONE" | "ONCE" | "TWO_TO_THREE" | "FOUR_PLUS"
type ExperienceLevelStep = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ELITE"
type UsualSchedule = "BEFORE_8AM" | "8AM_11AM" | "11AM_2PM" | "2PM_5PM" | "5PM_7PM" | "7PM_9PM" | "AFTER_9PM"

interface OnboardingData {
  objective: Objective | null
  trainingHistory: TrainingHistory | null
  experienceLevel: ExperienceLevelStep | null
  trainingFrequency: number | null
  physicalConditions: string[]
  weight: number | null
  height: number | null
  usualSchedule: UsualSchedule | null
}

interface GeneratedPlanData {
  id: string
  name: string
  description: string | null
  focus: string
  difficulty: string
  frequency: number
  objective: string
  splits: {
    id: string
    label: string
    name: string
    muscleGroups: string[]
    estimatedDuration: number | null
    exercises: {
      id: string
      name: string
      muscleGroup: string
      equipment: string
      sets: number
      reps: string
      weight: number
      restSeconds: number
    }[]
  }[]
}

const TOTAL_STEPS = 9

const STEPS = [
  { num: 1, title: "Objetivo" },
  { num: 2, title: "Historial" },
  { num: 3, title: "Experiencia" },
  { num: 4, title: "Frecuencia" },
  { num: 5, title: "Condiciones" },
  { num: 6, title: "Peso y altura" },
  { num: 7, title: "Horario" },
  { num: 8, title: "Confirmación" },
  { num: 9, title: "Tu rutina" },
]

type StepBehavior = "auto-advance" | "manual" | "custom-button" | "system-auto" | "final"

const STEP_BEHAVIOR: Record<number, StepBehavior> = {
  1: "auto-advance",
  2: "auto-advance",
  3: "auto-advance",
  4: "auto-advance",
  5: "manual",
  6: "manual",
  7: "auto-advance",
  8: "custom-button",
  9: "custom-button",
}

const objectiveOptions = [
  {
    value: "WEIGHT_LOSS",
    label: "Perder peso",
    description: "Quemar grasa y definir",
    icon: Flame,
  },
  {
    value: "MUSCLE_GAIN",
    label: "Ganar masa muscular",
    description: "Fuerza e hipertrofia",
    icon: Dumbbell,
  },
  {
    value: "GENERAL_FITNESS",
    label: "Mejorar forma física",
    description: "Salud y bienestar general",
    icon: Heart,
  },
  {
    value: "UNSURE",
    label: "Necesito ayuda",
    description: "No estoy seguro de mi objetivo",
    icon: HelpCircle,
  },
]

const trainingHistoryOptions = [
  { value: "NONE", label: "No he entrenado antes", description: "Soy completamente nuevo" },
  { value: "ONCE", label: "1 vez por semana", description: "Entrenamiento ocasional" },
  { value: "TWO_TO_THREE", label: "2 a 3 veces por semana", description: "Entrenamiento regular" },
  { value: "FOUR_PLUS", label: "4 o más veces por semana", description: "Entrenamiento frecuente" },
]

const experienceOptions = [
  { value: "BEGINNER", label: "Principiante", icon: HelpCircle, description: "Nunca he entrenado antes" },
  { value: "INTERMEDIATE", label: "Intermedio", icon: Dumbbell, description: "Conozco lo básico" },
  { value: "ADVANCED", label: "Avanzado", icon: Star, description: "Buen dominio de técnica y rutinas" },
  { value: "ELITE", label: "Élite", icon: Trophy, description: "Entreno de forma autónoma" },
]

const trainingFrequencyOptions = [
  { value: 3, label: "3 días por semana", description: "Ideal para principiantes — volumen equilibrado" },
  { value: 4, label: "4 días por semana", description: "Balance óptimo — 4 días de entrenamiento" },
  { value: 5, label: "5 días por semana", description: "Máximo rendimiento — 5 días intensivos" },
]

const physicalConditionOptions = [
  "Discapacidad",
  "Lesión",
  "Enfermedad",
  "Embarazo",
  "Otras",
  "No poseo",
]

const scheduleOptions = [
  { value: "BEFORE_8AM", label: "Madrugada", time: "5am - 8am", icon: "🌅" },
  { value: "8AM_11AM", label: "Mañana", time: "8am - 11am", icon: "🌤️" },
  { value: "11AM_2PM", label: "Mediodía", time: "11am - 2pm", icon: "☀️" },
  { value: "2PM_5PM", label: "Tarde", time: "2pm - 5pm", icon: "🌤️" },
  { value: "5PM_7PM", label: "Atardecer", time: "5pm - 7pm", icon: "🌅" },
  { value: "7PM_9PM", label: "Noche", time: "7pm - 9pm", icon: "🌙" },
  { value: "AFTER_9PM", label: "Madrugada", time: "9pm+", icon: "🌑" },
]

const loadingMessages = [
  { icon: Activity, text: "Analizando tu perfil...", duration: 1500 },
  { icon: Dumbbell, text: "Generando rutina personalizada...", duration: 1800 },
  { icon: Sparkles, text: "Preparando tu experiencia...", duration: 1200 },
]

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
    scale: 0.97,
  }),
}

function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

function getBMICategory(bmi: number): { label: string; color: string; bgColor: string } {
  if (bmi < 18.5) return { label: "Bajo peso", color: "text-orange-600", bgColor: "bg-orange-50" }
  if (bmi < 25) return { label: "Normal", color: "text-emerald-600", bgColor: "bg-emerald-50" }
  if (bmi < 30) return { label: "Sobrepeso", color: "text-orange-600", bgColor: "bg-orange-50" }
  return { label: "Obesidad", color: "text-red-600", bgColor: "bg-red-50" }
}

const objectiveLabelMap: Record<string, string> = {
  WEIGHT_LOSS: "Perder peso",
  MUSCLE_GAIN: "Ganar masa muscular",
  GENERAL_FITNESS: "Mejorar forma física",
  UNSURE: "Necesito ayuda para definir",
}

const trainingHistoryLabelMap: Record<string, string> = {
  NONE: "No he entrenado",
  ONCE: "1x por semana",
  TWO_TO_THREE: "2x a 3x",
  FOUR_PLUS: "4x o más",
}

const experienceLabelMap: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
  ELITE: "Élite",
}

const scheduleLabelMap: Record<string, string> = {
  BEFORE_8AM: "Madrugada (5am-8am)",
  "8AM_11AM": "Mañana (8am-11am)",
  "11AM_2PM": "Mediodía (11am-2pm)",
  "2PM_5PM": "Tarde (2pm-5pm)",
  "5PM_7PM": "Atardecer (5pm-7pm)",
  "7PM_9PM": "Noche (7pm-9pm)",
  AFTER_9PM: "Noche (después de 9pm)",
}

export default function OnboardingPage() {
  const router = useRouter()
  const { update: updateSession, data: session, status } = useSession()
  const { play } = useSound()
  const verifiedRef = useRef(false)

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [generatedPlans, setGeneratedPlans] = useState<GeneratedPlanData[]>([])
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPhase, setGenerationPhase] = useState(0)
  const lastClickRef = useRef<{ id: string; time: number } | null>(null)

  const [data, setData] = useState<OnboardingData>({
    objective: null,
    trainingHistory: null,
    experienceLevel: null,
    trainingFrequency: null,
    physicalConditions: [],
    weight: null,
    height: null,
    usualSchedule: null,
  })

  const fetchGeneratedPlans = useCallback(async (freq: number): Promise<GeneratedPlanData[] | null> => {
    try {
      const res = await fetch("/api/fitness-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: data.objective ?? "UNSURE",
          experienceLevel: data.experienceLevel ?? "BEGINNER",
          trainingFrequency: freq,
        }),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.plans?.length > 0) {
          setGeneratedPlans(result.plans)
          return result.plans
        }
      }
    } catch {
      // silent
    }
    return null
  }, [data.objective, data.experienceLevel])

  useEffect(() => {
    if (status === "loading") return
    if (verifiedRef.current) return
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated") {
      verifiedRef.current = true
      const s = session as { user?: { role?: string; onboardingCompleted?: boolean } }
      if (s?.user?.role !== "MEMBER") {
        const role = s?.user?.role
        if (role === "ADMIN" || role === "SUPER_ADMIN") router.push("/admin")
        else if (role === "TRAINER") router.push("/coach")
        else router.push("/dashboard")
        return
      }
      fetch("/api/onboarding")
        .then((r) => r.json())
        .then((d) => {
          if (d.onboardingCompleted) {
            router.push("/dashboard")
          } else if (d.trainingFrequency) {
            setData((prev) => ({ ...prev, trainingFrequency: d.trainingFrequency }))
          }
        })
        .catch(() => {})
    }
  }, [status, session, router])

  const [weightInput, setWeightInput] = useState("")
  const [heightInput, setHeightInput] = useState("")
  const [weightError, setWeightError] = useState("")
  const [heightError, setHeightError] = useState("")

  const goNext = useCallback(() => {
    if (editingStep !== null) {
      setDirection(-1)
      setStep(8)
      setEditingStep(null)
      return
    }
    if (step >= TOTAL_STEPS) return
    play("click")
    setDirection(1)
    setStep((s) => s + 1)
  }, [step, play, editingStep])

  const goBack = useCallback(() => {
    if (step <= 1) return
    play("click")
    setDirection(-1)
    setStep((s) => s - 1)
  }, [step, play])

  const jumpToEditStep = useCallback(
    (targetStep: number) => {
      setEditingStep(targetStep)
      setDirection(1)
      setStep(targetStep)
    },
    []
  )

  const updateData = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }))
      setError("")
    },
    []
  )

  const handleScheduleSelect = useCallback(
    (value: UsualSchedule) => {
      updateData("usualSchedule", value)
      play("select")
      setTimeout(goNext, 200)
    },
    [updateData, play, goNext]
  )

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError("")
    setIsGenerating(true)
    setGenerationPhase(0)

    const savePromise = (async () => {
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        let errorMsg = "Error al guardar"
        if (!res.ok) {
          try {
            const text = await res.text()
            if (text) {
              const json = JSON.parse(text)
              errorMsg = json.error || json.details || "Error al guardar"
            } else {
              errorMsg = `Error del servidor (${res.status})`
            }
          } catch {
            errorMsg = `Error del servidor (${res.status})`
          }
          throw new Error(errorMsg)
        }
        return res.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar los datos")
        setIsSubmitting(false)
        setIsGenerating(false)
        throw err
      }
    })()

    const freq = data.trainingFrequency ?? 3
    const fetchPromise = fetchGeneratedPlans(freq)

    for (let i = 0; i < loadingMessages.length; i++) {
      setGenerationPhase(i)
      await new Promise((r) => setTimeout(r, loadingMessages[i].duration))
    }

    try {
      await savePromise
    } catch {
      return
    }

    const plans = await fetchPromise

    if (plans?.length) {
      setExpandedPlanId(null)
    }

    setIsGenerating(false)
    setIsSubmitting(false)
    play("success")

    setDirection(1)
    setStep(9)
  }, [data, play, fetchGeneratedPlans])

  const assignPlan = useCallback(
    async (planId: string) => {
      setIsSubmitting(true)
      setError("")

      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const res = await fetch("/api/onboarding/assign-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })
      if (!res.ok) {
        setError("Error al asignar la rutina")
        setIsSubmitting(false)
        return
      }
      play("success")
      try {
        await updateSession({ onboardingCompleted: true, onboardingCompletedAt: new Date().toISOString() })
      } catch {
        // silent
      }
      await new Promise((r) => setTimeout(r, 600))
      router.push("/dashboard")
      router.refresh()
    },
    [play, router, updateSession, data]
  )

  const handlePlanClick = useCallback(
    (plan: GeneratedPlanData) => {
      const now = Date.now()
      const prev = lastClickRef.current

      if (prev && prev.id === plan.id && now - prev.time < 300) {
        lastClickRef.current = null
        assignPlan(plan.id)
        return
      }

      lastClickRef.current = { id: plan.id, time: now }

      play("select")
      setExpandedPlanId((prev) => (prev === plan.id ? null : plan.id))
    },
    [assignPlan, play]
  )

  const handleWeightChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "")
    if (cleaned.split(".").length > 2) return
    setWeightInput(cleaned)
    const num = parseFloat(cleaned)
    if (cleaned === "") {
      updateData("weight", null)
      setWeightError("")
    } else if (isNaN(num) || num < 20 || num > 300) {
      setWeightError("Ingresa un peso entre 20 y 300 kg")
    } else {
      updateData("weight", num)
      setWeightError("")
    }
  }

  const handleHeightChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "")
    if (cleaned.split(".").length > 2) return
    setHeightInput(cleaned)
    const num = parseFloat(cleaned)
    if (cleaned === "") {
      updateData("height", null)
      setHeightError("")
    } else if (isNaN(num) || num < 100 || num > 250) {
      setHeightError("Ingresa una altura entre 100 y 250 cm")
    } else {
      updateData("height", num)
      setHeightError("")
    }
  }

  const canProceedStep1 = data.objective !== null
  const canProceedStep2 = data.trainingHistory !== null
  const canProceedStep3 = data.experienceLevel !== null
  const canProceedStep4 = data.trainingFrequency !== null
  const canProceedStep5 = data.physicalConditions.length > 0
  const canProceedStep6 = data.weight !== null && data.height !== null && !weightError && !heightError
  const canProceedStep7 = data.usualSchedule !== null

  const canProceedMap: Record<number, boolean> = {
    1: canProceedStep1,
    2: canProceedStep2,
    3: canProceedStep3,
    4: canProceedStep4,
    5: canProceedStep5,
    6: canProceedStep6,
    7: canProceedStep7,
    8: true,
    9: true,
  }

  const showNextButton = STEP_BEHAVIOR[step] === "manual"

  const bmi = data.weight && data.height ? calculateBMI(data.weight, data.height) : null

  const stepInfo = STEPS[step - 1]

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">¿Cuál es tu objetivo?</h2>
              <p className="text-muted-foreground">Selecciona lo que quieres lograr con tu entrenamiento</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {objectiveOptions.map((opt) => {
                const isSelected = data.objective === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      updateData("objective", opt.value as Objective)
                      play("select")
                      setTimeout(goNext, 200)
                    }}
                    className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
                        isSelected ? "bg-primary text-primary-foreground shadow-md" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <opt.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Historial de entrenamiento</h2>
              <p className="text-muted-foreground">¿Con qué frecuencia has entrenado hasta ahora?</p>
            </div>
            <div className="space-y-3">
              {trainingHistoryOptions.map((opt) => {
                const isSelected = data.trainingHistory === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      updateData("trainingHistory", opt.value as TrainingHistory)
                      play("select")
                      setTimeout(goNext, 200)
                    }}
                    className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-base">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.description}</p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Nivel de experiencia</h2>
              <p className="text-muted-foreground">¿Cuánto sabes sobre entrenamiento?</p>
            </div>
            <div className="space-y-3">
              {experienceOptions.map((opt) => {
                const isSelected = data.experienceLevel === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      updateData("experienceLevel", opt.value as ExperienceLevelStep)
                      play("select")
                      setTimeout(goNext, 200)
                    }}
                    className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all ${
                        isSelected ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <opt.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.description}</p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Frecuencia de entrenamiento</h2>
              <p className="text-muted-foreground">¿Cuántos días por semana puedes entrenar?</p>
            </div>
            <div className="space-y-3">
              {trainingFrequencyOptions.map((opt) => {
                const isSelected = data.trainingFrequency === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      updateData("trainingFrequency", opt.value)
                      play("select")
                      setTimeout(goNext, 200)
                    }}
                    className={`w-full flex items-center gap-5 rounded-2xl border-2 p-5 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.value}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.description}</p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Condiciones físicas</h2>
              <p className="text-muted-foreground">Selecciona las condiciones que te apliquen</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {physicalConditionOptions.map((condition) => {
                const isSelected = data.physicalConditions.includes(condition)
                const isNoPoseo = condition === "No poseo"

                return (
                  <motion.button
                    key={condition}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      play("click")
                      if (isNoPoseo) {
                        updateData(
                          "physicalConditions",
                          isSelected ? [] : ["No poseo"]
                        )
                      } else {
                        let newConditions: string[]
                        if (isSelected) {
                          newConditions = data.physicalConditions.filter((c) => c !== condition)
                        } else {
                          newConditions = [
                            ...data.physicalConditions.filter((c) => c !== "No poseo"),
                            condition,
                          ]
                        }
                        updateData("physicalConditions", newConditions)
                      }
                    }}
                    className={`flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-medium transition-all ${
                      isSelected
                        ? isNoPoseo
                          ? "border-primary bg-primary/5 text-foreground shadow-sm"
                          : "border-destructive/50 bg-destructive/5 text-destructive"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {condition}
                  </motion.button>
                )
              })}
            </div>
          </div>
        )

      case 6:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Peso y altura</h2>
              <p className="text-muted-foreground">Estos datos nos ayudan a personalizar tu rutina</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">¿Cuánto pesas?</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    placeholder="Ej: 75"
                    className="w-full h-16 rounded-2xl border-2 border-border bg-card px-5 pr-16 text-2xl font-semibold text-center placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-semibold">
                    kg
                  </span>
                </div>
                {weightError && <p className="text-sm text-red-500 text-center">{weightError}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">¿Cuánto mides?</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={heightInput}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    placeholder="Ej: 170"
                    className="w-full h-16 rounded-2xl border-2 border-border bg-card px-5 pr-16 text-2xl font-semibold text-center placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-semibold">
                    cm
                  </span>
                </div>
                {heightError && <p className="text-sm text-red-500 text-center">{heightError}</p>}
              </div>

              {bmi !== null && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`rounded-2xl ${getBMICategory(bmi).bgColor} border p-5 text-center`}
                >
                  <p className="text-sm font-medium text-muted-foreground">Tu Índice de Masa Corporal</p>
                  <p className={`text-4xl font-bold mt-1 ${getBMICategory(bmi).color}`}>{bmi.toFixed(1)}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${getBMICategory(bmi).color}`}>
                    {getBMICategory(bmi).label}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        )

      case 7:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Horario habitual</h2>
              <p className="text-muted-foreground">¿A qué hora sueles entrenar?</p>
            </div>
            <div className="space-y-2.5">
              {scheduleOptions.map((opt) => {
                const isSelected = data.usualSchedule === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleScheduleSelect(opt.value as UsualSchedule)
                    }}
                    className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <p className="font-semibold text-base">{opt.label}</p>
                        <p className="text-sm text-muted-foreground">{opt.time}</p>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )

      case 8:
        if (isGenerating) {
          return (
            <div className="flex flex-col items-center justify-center gap-8 py-16">
              <AnimatePresence mode="wait">
                <motion.div
                  key={generationPhase}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
                      {(() => {
                        const msg = loadingMessages[generationPhase]
                        return <msg.icon className="h-12 w-12 text-primary" />
                      })()}
                    </div>
                    <motion.div
                      className="absolute -inset-3 rounded-3xl border-2 border-primary/20"
                      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-lg font-semibold">{loadingMessages[generationPhase].text}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {loadingMessages.map((_, i) => (
                        <motion.div
                          key={i}
                          className={`h-2 rounded-full transition-all ${
                            i <= generationPhase ? "w-8 bg-primary" : "w-2 bg-muted"
                          }`}
                          layout
                          transition={{ duration: 0.3 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )
        }
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Confirmá tus datos</h2>
              <p className="text-muted-foreground">Revisá que toda la información sea correcta</p>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <SummaryRow label="Objetivo" value={objectiveLabelMap[data.objective!]} onEdit={() => jumpToEditStep(1)} />
              <SummaryRow label="Historial" value={trainingHistoryLabelMap[data.trainingHistory!]} onEdit={() => jumpToEditStep(2)} />
              <SummaryRow label="Experiencia" value={experienceLabelMap[data.experienceLevel!]} onEdit={() => jumpToEditStep(3)} />
              <SummaryRow label="Frecuencia" value={`${data.trainingFrequency} días por semana`} onEdit={() => jumpToEditStep(4)} />
              <SummaryRow label="Condiciones" value={data.physicalConditions.join(", ")} onEdit={() => jumpToEditStep(5)} />
              <SummaryRow label="Peso / Altura" value={`${data.weight} kg / ${data.height} cm`} onEdit={() => jumpToEditStep(6)} />
              {bmi !== null && (
                <div className={`flex items-center justify-between ${getBMICategory(bmi).bgColor} rounded-xl px-4 py-3`}>
                  <span className="text-sm font-medium">IMC</span>
                  <span className={`text-sm font-bold ${getBMICategory(bmi).color}`}>
                    {bmi.toFixed(1)} ({getBMICategory(bmi).label})
                  </span>
                </div>
              )}
              <SummaryRow label="Horario" value={scheduleLabelMap[data.usualSchedule!]} onEdit={() => jumpToEditStep(7)} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={goBack}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Confirmar y generar rutina
                  </>
                )}
              </Button>
            </div>
          </div>
        )

      case 9:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Tu rutina personalizada</h2>
              <p className="text-muted-foreground">Toc\u00e1 para ver detalles \u00b7 doble toque para elegir</p>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {generatedPlans.length > 0 ? (
              <div className="space-y-3">
                {generatedPlans.map((plan, i) => {
                  const isExpanded = expandedPlanId === plan.id
                  const totalExercises = plan.splits.reduce((sum, s) => sum + s.exercises.length, 0)
                  const allMuscleGroups = [...new Set(plan.splits.flatMap((s) => s.muscleGroups))]
                  return (
                    <motion.button
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handlePlanClick(plan)}
                      className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
                        isExpanded
                          ? "border-gym-orange bg-gym-orange/5 shadow-sm"
                          : "border-border bg-card hover:border-muted-foreground/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-bold text-base">{plan.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              plan.difficulty === "ADVANCED" || plan.difficulty === "ELITE"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-gym-green/10 text-gym-green"
                            }`}>
                              {plan.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{plan.splits.length} divisiones</span>
                            <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{plan.focus}</span>
                            <span>{totalExercises} ejercicios</span>
                          </div>
                        </div>
                        <ChevronRight className={`h-5 w-5 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "text-gym-orange rotate-90" : "text-muted-foreground"}`} />
                      </div>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-4 pt-4 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 capitalize">Grupos musculares: {allMuscleGroups.join(", ").toLowerCase()}</p>
                          <div className="space-y-2.5 mb-3">
                            {plan.splits.map((split) => (
                              <div key={split.id} className="rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gym-orange/10 text-gym-orange font-bold text-xs">
                                    {split.label}
                                  </span>
                                  <span className="text-xs font-semibold">{split.name}</span>
                                  {split.estimatedDuration && (
                                    <span className="text-[10px] text-muted-foreground ml-auto">~{split.estimatedDuration} min</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-1.5">{split.muscleGroups.join(" \u00b7 ")}</p>
                                <div className="space-y-0.5">
                                  {split.exercises.slice(0, 4).map((ex) => (
                                    <div key={ex.id} className="flex items-center gap-2 text-[10px]">
                                      <span className="text-muted-foreground">\u00b7</span>
                                      <span className="truncate">{ex.name}</span>
                                      <span className="text-muted-foreground ml-auto">{ex.sets}\u00d7{ex.reps}</span>
                                    </div>
                                  ))}
                                  {split.exercises.length > 4 && (
                                    <p className="text-[10px] text-muted-foreground pl-3">+{split.exercises.length - 4} m\u00e1s</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gym-orange font-medium mt-3 text-center">Doble toque para elegir esta rutina</p>
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Generando rutinas personalizadas...</p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 h-14">
          <button
            onClick={goBack}
            className={`flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors ${
              step <= 1 || isSubmitting || isGenerating ? "invisible" : ""
            }`}
            disabled={isSubmitting || isGenerating}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">
              {isGenerating ? "..." : `${stepInfo.num}/${TOTAL_STEPS}`}
            </span>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {isGenerating ? "Generando..." : stepInfo.title}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors disabled:opacity-30"
            disabled={isGenerating}
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="mx-auto max-w-lg px-5 pb-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col mx-auto w-full max-w-lg px-5 pt-8 pb-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            {renderStep()}

            {showNextButton && (
              <div className="mt-auto pt-6">
                <Button
                  className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  onClick={goNext}
                  disabled={!canProceedMap[step]}
                >
                  Continuar
                  <ChevronRight className="ml-1 h-5 w-5" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: string
  onEdit: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate mt-0.5">{value}</p>
      </div>
      <button
        onClick={onEdit}
        className="ml-3 text-xs font-semibold text-primary hover:underline shrink-0"
      >
        Editar
      </button>
    </div>
  )
}
