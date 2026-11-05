"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSound } from "@/hooks/use-sound"
import { calculateBMI, getBMICategory } from "@/lib/health"
import { formatMuscleGroups } from "@/constants/user"
import {
  type Objective,
  type TrainingHistory,
  type ExperienceLevelStep,
  type UsualSchedule,
  type OnboardingData,
  type GeneratedPlanData,
  type MeasurementsInput,
  TOTAL_STEPS,
  STEPS,
  STEP_BEHAVIOR,
  objectiveOptions,
  trainingHistoryOptions,
  experienceOptions,
  trainingFrequencyOptions,
  physicalConditionOptions,
  scheduleOptions,
  loadingMessages,
  stepVariants,
  objectiveLabelMap,
  trainingHistoryLabelMap,
  experienceLabelMap,
  scheduleLabelMap,
  emptyMeasurements,
  measurementFields,
} from "./constants"
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  Dumbbell,
  Zap,
  LogOut,
  UserRound,
  X,
} from "lucide-react"

interface CoachPlanData {
  id: string
  name: string
  description: string | null
  coachName: string | null
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

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { update: updateSession, data: session, status } = useSession()
  const { play } = useSound()
  const verifiedRef = useRef(false)

  const memberId = searchParams.get("memberId")
  const [assisted, setAssisted] = useState(false)
  const [memberName, setMemberName] = useState<string | null>(null)

  const [step, setStep] = useState(1)
  const [gymId, setGymId] = useState<string | null>(null)
  const [gymName, setGymName] = useState<string | null>(null)
  const [gymQuery, setGymQuery] = useState("")
  const [gymResults, setGymResults] = useState<
    Array<{ id: string; name: string; slug: string; address: string | null }>
  >([])
  const [gymSearching, setGymSearching] = useState(false)
  const [gymSaving, setGymSaving] = useState(false)
  const [gymError, setGymError] = useState("")
  const [direction, setDirection] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [generatedPlans, setGeneratedPlans] = useState<GeneratedPlanData[]>([])
  const [coachPlan, setCoachPlan] = useState<CoachPlanData | null>(null)
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
    measurements: { ...emptyMeasurements },
  })

  const fetchGeneratedPlans = useCallback(
    async (freq: number): Promise<GeneratedPlanData[] | null> => {
      try {
        const res = await fetch("/api/fitness-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objective: data.objective ?? "UNSURE",
            experienceLevel: data.experienceLevel ?? "BEGINNER",
            trainingFrequency: freq,
            memberId: memberId ?? undefined,
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
    },
    [data.objective, data.experienceLevel, memberId]
  )

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

      if (memberId) {
        fetch(`/api/onboarding?memberId=${encodeURIComponent(memberId)}`)
          .then((r) => {
            if (r.status === 401 || r.status === 403) {
              router.push("/coach")
              return null
            }
            return r.json()
          })
          .then((d) => {
            if (!d) return
            if (d.onboardingCompleted) {
              router.push("/coach")
              return
            }
            setAssisted(true)
            if (d.gymId) {
              setGymId(d.gymId)
              setGymName(d.gymName ?? null)
            }
            if (d.memberName) setMemberName(d.memberName)
            if (d.trainingFrequency) {
              setData((prev) => ({ ...prev, trainingFrequency: d.trainingFrequency }))
            }
            if (d.coachPlan) {
              setCoachPlan(d.coachPlan)
            }
          })
          .catch(() => {})
        return
      }

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
          } else {
            if (d.gymId) {
              setGymId(d.gymId)
              setGymName(d.gymName ?? null)
            }
            if (d.trainingFrequency) {
              setData((prev) => ({ ...prev, trainingFrequency: d.trainingFrequency }))
            }
          }
          if (d.coachPlan) {
            setCoachPlan(d.coachPlan)
          }
        })
        .catch(() => {})
    }
  }, [status, session, router, memberId])

  const [weightInput, setWeightInput] = useState("")
  const [heightInput, setHeightInput] = useState("")
  const [weightError, setWeightError] = useState("")
  const [heightError, setHeightError] = useState("")
  const [measurementInputs, setMeasurementInputs] = useState<Record<string, string>>({})

  const searchGyms = useCallback(async () => {
    if (gymQuery.trim().length < 2) {
      setGymResults([])
      return
    }
    setGymSearching(true)
    setGymError("")
    try {
      const res = await fetch(`/api/gyms/search?q=${encodeURIComponent(gymQuery.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setGymError(data.error || "Error al buscar gimnasios")
        return
      }
      setGymResults(data.gyms ?? [])
    } finally {
      setGymSearching(false)
    }
  }, [gymQuery])

  const joinGym = useCallback(async (gym: { id: string; name: string }) => {
    setGymSaving(true)
    setGymError("")
    try {
      const res = await fetch("/api/user/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gymId: gym.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGymError(data.error || "No se pudo vincular el gimnasio")
        return
      }
      setGymId(gym.id)
      setGymName(gym.name)
    } finally {
      setGymSaving(false)
    }
  }, [])

  const goNext = useCallback(() => {
    if (editingStep !== null) {
      setDirection(-1)
      setStep(10)
      setEditingStep(null)
      return
    }
    if (step >= TOTAL_STEPS) return
    // Condiciones físicas: continuar sin elegir ninguna equivale a "No poseo".
    // Así el dato queda explícito en el perfil y en el resumen.
    if (step === 6) {
      setData((prev) =>
        prev.physicalConditions.length > 0 ? prev : { ...prev, physicalConditions: ["No poseo"] }
      )
    }
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

  const jumpToEditStep = useCallback((targetStep: number) => {
    setEditingStep(targetStep)
    setDirection(1)
    setStep(targetStep)
  }, [])

  const updateData = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }))
      setError("")
    },
    []
  )

  const updateMeasurement = useCallback(
    <K extends keyof MeasurementsInput>(key: K, value: MeasurementsInput[K]) => {
      setData((prev) => ({
        ...prev,
        measurements: { ...prev.measurements, [key]: value },
      }))
      setError("")
    },
    []
  )

  const handleMeasurementChange = useCallback(
    (key: Exclude<keyof MeasurementsInput, "notes">, value: string) => {
      const cleaned = value.replace(/[^0-9.]/g, "")
      if (cleaned.split(".").length > 2) return
      setMeasurementInputs((prev) => ({ ...prev, [key]: cleaned }))
      const num = parseFloat(cleaned)
      updateMeasurement(key, cleaned === "" || isNaN(num) || num <= 0 ? null : num)
    },
    [updateMeasurement]
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
          body: JSON.stringify({ ...data, memberId: memberId ?? undefined }),
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

    if (!assisted) {
      try {
        await updateSession({
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        })
      } catch {
        // silent
      }
    }

    if (plans?.length) {
      setExpandedPlanId(null)
    }

    setIsGenerating(false)
    setIsSubmitting(false)
    play("success")

    setDirection(1)
    setStep(11)
  }, [data, play, fetchGeneratedPlans, memberId, assisted, updateSession])

  const assignPlan = useCallback(
    async (planId: string) => {
      setIsSubmitting(true)
      setError("")

      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, memberId: memberId ?? undefined }),
      })

      const res = await fetch("/api/onboarding/assign-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, memberId: memberId ?? undefined }),
      })
      if (!res.ok) {
        setError("Error al asignar la rutina")
        setIsSubmitting(false)
        return
      }
      play("success")
      if (assisted) {
        await new Promise((r) => setTimeout(r, 600))
        router.push("/coach")
        router.refresh()
        return
      }
      try {
        await updateSession({
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        })
      } catch {
        // silent
      }
      await new Promise((r) => setTimeout(r, 600))
      router.push("/dashboard")
      router.refresh()
    },
    [play, router, updateSession, data, memberId, assisted]
  )

  // Completa el onboarding manteniendo la rutina que ya asignó el coach
  const finishWithCoachPlan = useCallback(async () => {
    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, memberId: memberId ?? undefined }),
      })
      if (!res.ok) {
        let errorMsg = "Error al guardar"
        try {
          const json = await res.json()
          errorMsg = json.error || json.details || errorMsg
        } catch {
          // keep default
        }
        throw new Error(errorMsg)
      }
      play("success")
      if (assisted) {
        await new Promise((r) => setTimeout(r, 600))
        router.push("/coach")
        router.refresh()
        return
      }
      try {
        await updateSession({
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        })
      } catch {
        // silent
      }
      await new Promise((r) => setTimeout(r, 600))
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar los datos")
      setIsSubmitting(false)
    }
  }, [data, play, router, updateSession, memberId, assisted])

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

  const handleCoachCardClick = useCallback(() => {
    if (!coachPlan) return
    const id = `coach-${coachPlan.id}`
    const now = Date.now()
    const prev = lastClickRef.current

    if (prev && prev.id === id && now - prev.time < 300) {
      lastClickRef.current = null
      finishWithCoachPlan()
      return
    }

    lastClickRef.current = { id, time: now }

    play("select")
    setExpandedPlanId((prev) => (prev === id ? null : id))
  }, [coachPlan, finishWithCoachPlan, play])

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
  // Condiciones físicas es opcional: sin selección se guarda "No poseo" al continuar.
  const canProceedStep5 = true
  const canProceedStep6 =
    data.weight !== null && data.height !== null && !weightError && !heightError
  const canProceedStep7 = true
  const canProceedStep8 = data.usualSchedule !== null

  const canProceedMap: Record<number, boolean> = {
    1: true,
    2: canProceedStep1,
    3: canProceedStep2,
    4: canProceedStep3,
    5: canProceedStep4,
    6: canProceedStep5,
    7: canProceedStep6,
    8: canProceedStep7,
    9: canProceedStep8,
    10: true,
    11: true,
  }

  const showNextButton = STEP_BEHAVIOR[step] === "manual"

  const bmi = data.weight && data.height ? calculateBMI(data.weight, data.height) : null

  const filledMeasurements = measurementFields.filter((f) => data.measurements[f.key] !== null)
  const measurementsSummary =
    filledMeasurements.length > 0
      ? filledMeasurements
          .slice(0, 3)
          .map((f) => `${f.label}: ${data.measurements[f.key]}${f.unit}`)
          .join(" · ") + (filledMeasurements.length > 3 ? ` +${filledMeasurements.length - 3}` : "")
      : data.measurements.notes.trim()
        ? `Notas: ${data.measurements.notes.trim()}`
        : "Sin medidas"

  const stepInfo = STEPS[step - 1]

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold">¿Entrenas en un gimnasio?</h2>
              <p className="text-sm text-muted-foreground">
                Si tu gimnasio usa GymApp, búscalo para ver sus máquinas y ejercicios. Si no, sigue
                con el catálogo por defecto.
              </p>
            </div>

            {gymId ? (
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">Tu gimnasio</p>
                <p className="text-lg font-semibold">{gymName}</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    value={gymQuery}
                    onChange={(e) => setGymQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void searchGyms()
                    }}
                    placeholder="Nombre o slug del gimnasio"
                  />
                  <Button onClick={() => void searchGyms()} disabled={gymSearching}>
                    {gymSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>

                {gymError && <p className="text-sm text-destructive">{gymError}</p>}

                {gymResults.length > 0 && (
                  <div className="space-y-2">
                    {gymResults.map((gym) => (
                      <button
                        key={gym.id}
                        type="button"
                        onClick={() => void joinGym(gym)}
                        disabled={gymSaving}
                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <span>
                          <span className="block text-sm font-medium">{gym.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {gym.address || gym.slug}
                          </span>
                        </span>
                        {gymSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {gymResults.length === 0 && gymQuery.trim().length >= 2 && !gymSearching && (
                  <p className="text-sm text-muted-foreground">
                    No encontramos gimnasios con ese nombre.
                  </p>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  Puedes continuar sin gimnasio y usar el catálogo por defecto.
                </p>
              </>
            )}
          </div>
        )
      case 2:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">¿Cuál es tu objetivo?</h2>
              <p className="text-muted-foreground">
                Selecciona lo que quieres lograr con tu entrenamiento
              </p>
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
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-primary/10 text-primary"
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

      case 3:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Historial de entrenamiento</h2>
              <p className="text-muted-foreground">
                ¿Con qué frecuencia has entrenado hasta ahora?
              </p>
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

      case 4:
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
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground"
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

      case 5:
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

      case 6:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Condiciones físicas</h2>
              <p className="text-muted-foreground">
                Selecciona las que te apliquen. Si no tienes ninguna, toca Continuar.
              </p>
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
                        updateData("physicalConditions", isSelected ? [] : ["No poseo"])
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

      case 7:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Peso y altura</h2>
              <p className="text-muted-foreground">
                Estos datos nos ayudan a personalizar tu rutina
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">
                  ¿Cuánto pesas?
                </label>
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
                <label className="text-sm font-semibold text-muted-foreground">
                  ¿Cuánto mides?
                </label>
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
                  <p className="text-sm font-medium text-muted-foreground">
                    Tu Índice de Masa Corporal
                  </p>
                  <p className={`text-4xl font-bold mt-1 ${getBMICategory(bmi).color}`}>
                    {bmi.toFixed(1)}
                  </p>
                  <p className={`text-sm font-semibold mt-0.5 ${getBMICategory(bmi).color}`}>
                    {getBMICategory(bmi).label}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        )

      case 8:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Medidas corporales</h2>
              <p className="text-muted-foreground">
                {assisted
                  ? "Toma las medidas del cliente — todas son opcionales"
                  : "Todas las medidas son opcionales, tu coach puede completarlas más tarde"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {measurementFields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    {f.label} ({f.unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={measurementInputs[f.key] ?? ""}
                    onChange={(e) => handleMeasurementChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full h-12 rounded-xl border-2 border-border bg-card px-4 text-base font-semibold placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Notas (opcional)
              </label>
              <textarea
                value={data.measurements.notes}
                onChange={(e) => updateMeasurement("notes", e.target.value)}
                placeholder="Observaciones, lesiones, postura..."
                rows={2}
                className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Puedes omitir este paso: las medidas se podrán registrar después.
            </p>
          </div>
        )

      case 9:
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

      case 10:
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
              <h2 className="text-2xl font-bold tracking-tight">Confirma tus datos</h2>
              <p className="text-muted-foreground">Revisa que toda la información sea correcta</p>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <SummaryRow
                label="Gimnasio"
                value={gymName ?? "Sin gimnasio (catálogo por defecto)"}
                onEdit={() => jumpToEditStep(1)}
              />
              <SummaryRow
                label="Objetivo"
                value={objectiveLabelMap[data.objective!]}
                onEdit={() => jumpToEditStep(2)}
              />
              <SummaryRow
                label="Historial"
                value={trainingHistoryLabelMap[data.trainingHistory!]}
                onEdit={() => jumpToEditStep(3)}
              />
              <SummaryRow
                label="Experiencia"
                value={experienceLabelMap[data.experienceLevel!]}
                onEdit={() => jumpToEditStep(4)}
              />
              <SummaryRow
                label="Frecuencia"
                value={`${data.trainingFrequency} días por semana`}
                onEdit={() => jumpToEditStep(5)}
              />
              <SummaryRow
                label="Condiciones"
                value={data.physicalConditions.join(", ")}
                onEdit={() => jumpToEditStep(6)}
              />
              <SummaryRow
                label="Peso / Altura"
                value={`${data.weight} kg / ${data.height} cm`}
                onEdit={() => jumpToEditStep(7)}
              />
              {bmi !== null && (
                <div
                  className={`flex items-center justify-between ${getBMICategory(bmi).bgColor} rounded-xl px-4 py-3`}
                >
                  <span className="text-sm font-medium">IMC</span>
                  <span className={`text-sm font-bold ${getBMICategory(bmi).color}`}>
                    {bmi.toFixed(1)} ({getBMICategory(bmi).label})
                  </span>
                </div>
              )}
              <SummaryRow
                label="Medidas"
                value={measurementsSummary}
                onEdit={() => jumpToEditStep(8)}
              />
              <SummaryRow
                label="Horario"
                value={scheduleLabelMap[data.usualSchedule!]}
                onEdit={() => jumpToEditStep(9)}
              />
            </div>

            {coachPlan && (
              <div className="rounded-2xl border-2 border-accent-yellow/40 bg-accent-yellow/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-accent-yellow" />
                  <p className="text-sm font-semibold text-accent-yellow">
                    Tu coach{coachPlan.coachName ? ` ${coachPlan.coachName}` : ""} ya te asignó una
                    rutina
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="font-bold text-base">{coachPlan.name}</p>
                  {coachPlan.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {coachPlan.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {coachPlan.splits.length} divisiones ·{" "}
                    {coachPlan.splits.reduce((s, sp) => s + sp.exercises.length, 0)} ejercicios
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full h-12 rounded-xl bg-accent-yellow text-accent-yellow-foreground hover:bg-accent-yellow/90"
                  onClick={finishWithCoachPlan}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Dumbbell className="mr-2 h-4 w-4" />
                      Usar la rutina de mi coach
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={goBack}>
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

      case 11:
        return (
          <div className="flex flex-col gap-5">
            <div className="text-center space-y-2 pb-1">
              <h2 className="text-2xl font-bold tracking-tight">Tu rutina personalizada</h2>
              <p className="text-muted-foreground">
                Toca para ver detalles · doble toque para elegir
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {generatedPlans.length > 0 || coachPlan ? (
              <div className="space-y-3">
                {coachPlan && (
                  <motion.button
                    key="coach-plan"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleCoachCardClick}
                    className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
                      expandedPlanId === `coach-${coachPlan.id}`
                        ? "border-accent-yellow bg-accent-yellow/5 shadow-sm"
                        : "border-accent-yellow/40 bg-accent-yellow/5 hover:border-accent-yellow/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-accent-yellow/10 text-accent-yellow flex items-center gap-1">
                            <UserRound className="h-3 w-3" />
                            Asignada por tu coach
                            {coachPlan.coachName ? ` · ${coachPlan.coachName}` : ""}
                          </span>
                        </div>
                        <h3 className="font-bold text-base mt-1.5">{coachPlan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {coachPlan.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3 w-3" />
                            {coachPlan.splits.length} divisiones
                          </span>
                          <span>
                            {coachPlan.splits.reduce((sum, s) => sum + s.exercises.length, 0)}{" "}
                            ejercicios
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 shrink-0 mt-1 transition-transform duration-200 ${expandedPlanId === `coach-${coachPlan.id}` ? "text-accent-yellow rotate-90" : "text-muted-foreground"}`}
                      />
                    </div>
                    {expandedPlanId === `coach-${coachPlan.id}` && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-4 pt-4 border-t"
                      >
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Grupos musculares:{" "}
                          {formatMuscleGroups([
                            ...new Set(coachPlan.splits.flatMap((s) => s.muscleGroups)),
                          ])}
                        </p>
                        <div className="space-y-2.5 mb-3">
                          {coachPlan.splits.map((split) => (
                            <div key={split.id} className="rounded-lg border bg-muted/30 p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-yellow/10 text-accent-yellow font-bold text-xs">
                                  {split.label}
                                </span>
                                <span className="text-xs font-semibold">{split.name}</span>
                                {split.estimatedDuration && (
                                  <span className="text-[10px] text-muted-foreground ml-auto">
                                    ~{split.estimatedDuration} min
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground mb-1.5">
                                {formatMuscleGroups(split.muscleGroups, " · ")}
                              </p>
                              <div className="space-y-0.5">
                                {split.exercises.slice(0, 4).map((ex) => (
                                  <div key={ex.id} className="flex items-center gap-2 text-[10px]">
                                    <span className="text-muted-foreground">·</span>
                                    <span className="truncate">{ex.name}</span>
                                    <span className="text-muted-foreground ml-auto">
                                      {ex.sets}×{ex.reps}
                                    </span>
                                  </div>
                                ))}
                                {split.exercises.length > 4 && (
                                  <p className="text-[10px] text-muted-foreground pl-3">
                                    +{split.exercises.length - 4} m\u00e1s
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-accent-yellow font-medium mt-3 text-center">
                          Doble toque para usar esta rutina
                        </p>
                      </motion.div>
                    )}
                  </motion.button>
                )}

                {generatedPlans.length > 0 && coachPlan && (
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    O elige una rutina generada para ti
                  </p>
                )}

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
                          ? "border-accent-yellow bg-accent-yellow/5 shadow-sm"
                          : "border-border bg-card hover:border-muted-foreground/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-bold text-base">{plan.name}</h3>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                plan.difficulty === "ADVANCED" || plan.difficulty === "ELITE"
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-accent-yellow/10 text-accent-yellow"
                              }`}
                            >
                              {experienceLabelMap[plan.difficulty] ?? plan.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {plan.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Dumbbell className="h-3 w-3" />
                              {plan.splits.length} divisiones
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {plan.focus}
                            </span>
                            <span>{totalExercises} ejercicios</span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "text-accent-yellow rotate-90" : "text-muted-foreground"}`}
                        />
                      </div>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="mt-4 pt-4 border-t"
                        >
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Grupos musculares: {formatMuscleGroups(allMuscleGroups)}
                          </p>
                          <div className="space-y-2.5 mb-3">
                            {plan.splits.map((split) => (
                              <div key={split.id} className="rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-yellow/10 text-accent-yellow font-bold text-xs">
                                    {split.label}
                                  </span>
                                  <span className="text-xs font-semibold">{split.name}</span>
                                  {split.estimatedDuration && (
                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                      ~{split.estimatedDuration} min
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-1.5">
                                  {formatMuscleGroups(split.muscleGroups, " · ")}
                                </p>
                                <div className="space-y-0.5">
                                  {split.exercises.slice(0, 4).map((ex) => (
                                    <div
                                      key={ex.id}
                                      className="flex items-center gap-2 text-[10px]"
                                    >
                                      <span className="text-muted-foreground">·</span>
                                      <span className="truncate">{ex.name}</span>
                                      <span className="text-muted-foreground ml-auto">
                                        {ex.sets}×{ex.reps}
                                      </span>
                                    </div>
                                  ))}
                                  {split.exercises.length > 4 && (
                                    <p className="text-[10px] text-muted-foreground pl-3">
                                      +{split.exercises.length - 4} m\u00e1s
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-accent-yellow font-medium mt-3 text-center">
                            Doble toque para elegir esta rutina
                          </p>
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
            {assisted && memberName && (
              <span className="max-w-[140px] truncate rounded-full bg-accent-yellow/10 px-2.5 py-0.5 text-xs font-semibold text-accent-yellow">
                {memberName}
              </span>
            )}
            <span className="text-sm font-semibold text-muted-foreground">
              {isGenerating ? "..." : `${stepInfo.num}/${TOTAL_STEPS}`}
            </span>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {isGenerating ? "Generando..." : stepInfo.title}
            </span>
          </div>

          {assisted ? (
            <button
              onClick={() => router.push("/coach")}
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors disabled:opacity-30"
              disabled={isGenerating}
              title="Salir del onboarding asistido"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors disabled:opacity-30"
              disabled={isGenerating}
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
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
