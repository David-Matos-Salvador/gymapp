// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
// La hoja de detalle y la imagen tienen su propia lógica (y piden datos): aquí no importan.
vi.mock("@/components/workout/exercise-detail-sheet", () => ({
  ExerciseDetailSheet: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock("@/components/exercise/exercise-image", () => ({ ExerciseImage: () => null }))

import { ExerciseCard } from "@/components/workout/exercise-card"
import type { GymEquipmentRef, SetLog, SplitExercise } from "@/types/exercise"

type Props = React.ComponentProps<typeof ExerciseCard>

const press: SplitExercise = {
  id: "se-1",
  exerciseId: "press",
  sets: 3,
  reps: "10",
  weight: 40,
  restSeconds: 90,
  order: 0,
  exercise: { id: "press", name: "Press de banca", muscleGroup: "CHEST", equipment: "BARBELL" },
}

const pullUp: SplitExercise = {
  ...press,
  id: "se-2",
  exerciseId: "pull-up",
  weight: 0,
  exercise: { id: "pull-up", name: "Dominadas", muscleGroup: "BACK", equipment: "BODYWEIGHT" },
}

function sets(completed: boolean[], overrides: Partial<SetLog> = {}): SetLog[] {
  return completed.map((done, i) => ({
    exerciseId: "press",
    exerciseName: "Press de banca",
    setNumber: i + 1,
    reps: 10,
    weight: 40,
    restSeconds: 90,
    completed: done,
    ...overrides,
  }))
}

function machine(name: string, machineNumber: number | null): GymEquipmentRef {
  return { id: name, name, machineNumber, location: null, gymId: "gym-1", imageUrl: null }
}

function renderCard(props: Partial<Props> = {}) {
  const handlers = {
    onSetComplete: vi.fn(),
    onWeightChange: vi.fn(),
    onSetsCountChange: vi.fn(),
    onContinue: vi.fn(),
    onSkip: vi.fn(),
    onSetUpdate: vi.fn(),
    onStartRest: vi.fn(),
  }
  render(
    <ExerciseCard
      se={press}
      setsData={sets([false, false, false])}
      appearance="current"
      {...handlers}
      {...props}
    />
  )
  return handlers
}

describe("ExerciseCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("muestra el nombre, el músculo en español y el descanso", () => {
    renderCard({ appearance: "pending" })

    expect(screen.getByText("Press de banca")).toBeTruthy()
    expect(screen.getByText("Pecho")).toBeTruthy()
    expect(screen.getByText("90s")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Ver detalle del ejercicio" })).toBeTruthy()
  })

  it("un ejercicio pendiente no muestra contadores ni series", () => {
    renderCard({ appearance: "pending" })

    expect(screen.queryByRole("button", { name: /Completar serie/ })).toBeNull()
    expect(screen.queryByLabelText("Reps serie 1")).toBeNull()
    expect(screen.queryByRole("button", { name: "Aumentar kg" })).toBeNull()
  })

  it.each([
    ["una máquina por nombre", [machine("Prensa", 3)], false, "Prensa"],
    ["una máquina por número", [machine("Prensa", 3)], true, "Máquina 3"],
    ["varias por número", [machine("Prensa", 3), machine("Banco", 7)], true, "Máquinas 3, 7"],
    [
      "varias por nombre",
      [machine("Prensa", 3), machine("Banco", 7)],
      false,
      "Máquinas: Prensa, Banco",
    ],
    [
      "por nombre si a alguna le falta el número",
      [machine("Prensa", 3), machine("Banco", null)],
      true,
      "Máquinas: Prensa, Banco",
    ],
  ])("indica la máquina: %s", (_, gymEquipments, showMachineNumbers, label) => {
    renderCard({
      se: { ...press, exercise: { ...press.exercise, gymEquipments } },
      showMachineNumbers,
    })

    expect(screen.getByText(label)).toBeTruthy()
  })

  it("completar una serie la marca y arranca el descanso", () => {
    const handlers = renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Completar serie 1 de 3" }))

    expect(handlers.onSetComplete).toHaveBeenCalledWith(0)
    expect(handlers.onStartRest).toHaveBeenCalledWith(90)
  })

  it("el botón apunta a la siguiente serie sin completar", () => {
    renderCard({ setsData: sets([true, false, false]) })

    expect(screen.getByRole("button", { name: "Completar serie 2 de 3" })).toBeTruthy()
    expect(screen.getByText("1/3")).toBeTruthy()
  })

  it("la última serie no arranca descanso", () => {
    const handlers = renderCard({ setsData: sets([true, true, false]) })

    fireEvent.click(screen.getByRole("button", { name: "Completar serie 3 de 3" }))

    expect(handlers.onSetComplete).toHaveBeenCalledWith(2)
    expect(handlers.onStartRest).not.toHaveBeenCalled()
  })

  it("sin descanso configurado no arranca el temporizador", () => {
    const handlers = renderCard({ se: { ...press, restSeconds: 0 } })

    fireEvent.click(screen.getByRole("button", { name: "Completar serie 1 de 3" }))

    expect(handlers.onSetComplete).toHaveBeenCalledWith(0)
    expect(handlers.onStartRest).not.toHaveBeenCalled()
  })

  it("con todas las series hechas, el botón pasa al siguiente ejercicio", () => {
    const handlers = renderCard({ setsData: sets([true, true, true]) })

    fireEvent.click(screen.getByRole("button", { name: "Siguiente ejercicio" }))

    expect(handlers.onContinue).toHaveBeenCalled()
    expect(handlers.onSetComplete).not.toHaveBeenCalled()
  })

  it("no deja completar una serie con repeticiones fuera de rango", () => {
    const handlers = renderCard({ setsData: sets([false, false], { reps: 0 }) })

    fireEvent.click(screen.getByRole("button", { name: "Completar serie 1 de 2" }))

    expect(toast.error).toHaveBeenCalledWith("Serie 1: Ingresa entre 1 y 300 repeticiones")
    expect(handlers.onSetComplete).not.toHaveBeenCalled()
    expect(handlers.onStartRest).not.toHaveBeenCalled()
  })

  it("los botones de peso suben y bajan de 2.5 en 2.5 kg", () => {
    const handlers = renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Aumentar kg" }))
    expect(handlers.onWeightChange).toHaveBeenLastCalledWith(42.5)

    fireEvent.click(screen.getByRole("button", { name: "Disminuir kg" }))
    fireEvent.click(screen.getByRole("button", { name: "Disminuir kg" }))
    expect(handlers.onWeightChange).toHaveBeenLastCalledWith(37.5)
  })

  it("el peso no baja de 0 kg", () => {
    const low = renderCard({ setsData: sets([false], { weight: 0 }) })
    fireEvent.click(screen.getByRole("button", { name: "Disminuir kg" }))
    expect(low.onWeightChange).toHaveBeenLastCalledWith(0)
  })

  it("el peso tope es 500 kg", () => {
    const high = renderCard({ setsData: sets([false], { weight: 499 }) })
    fireEvent.click(screen.getByRole("button", { name: "Aumentar kg" }))
    expect(high.onWeightChange).toHaveBeenLastCalledWith(500)
  })

  it("se pueden sumar series, pero no bajar de una", () => {
    const handlers = renderCard({ setsData: sets([false]) })

    fireEvent.click(screen.getByRole("button", { name: "Aumentar Series" }))
    expect(handlers.onSetsCountChange).toHaveBeenCalledWith(2)

    handlers.onSetsCountChange.mockClear()
    fireEvent.click(screen.getByRole("button", { name: "Disminuir Series" }))
    expect(handlers.onSetsCountChange).not.toHaveBeenCalled()
  })

  it("editar reps y peso de una serie avisa con el valor dentro del rango", () => {
    const handlers = renderCard()

    fireEvent.change(screen.getByLabelText("Reps serie 2"), { target: { value: "12" } })
    expect(handlers.onSetUpdate).toHaveBeenLastCalledWith(1, { reps: 12 })

    fireEvent.change(screen.getByLabelText("Peso serie 1"), { target: { value: "800" } })
    expect(handlers.onSetUpdate).toHaveBeenLastCalledWith(0, { weight: 500 })
  })

  it("en peso corporal habla de lastre", () => {
    renderCard({ se: pullUp, setsData: sets([false], { weight: 0 }) })

    expect(screen.getByRole("button", { name: "Aumentar Lastre" })).toBeTruthy()
    expect(screen.getByLabelText("Lastre serie 1")).toBeTruthy()
    expect(screen.getByText("kg lastre")).toBeTruthy()
    expect(screen.getByText("Espalda")).toBeTruthy()
  })

  it("«Última: … · usar» copia peso y reps de la vez anterior en la serie que sigue", () => {
    const handlers = renderCard({
      setsData: sets([true, false, false]),
      lastPerformance: [
        { weight: 35, reps: 10 },
        { weight: 37.5, reps: 8 },
        { weight: 37.5, reps: 6 },
      ],
    })

    fireEvent.click(screen.getByRole("button", { name: "Última: 37.5 kg × 8 · usar" }))

    expect(handlers.onWeightChange).toHaveBeenCalledWith(37.5)
    expect(handlers.onSetUpdate).toHaveBeenCalledWith(1, { weight: 37.5, reps: 8 })
  })

  it("solo el ejercicio actual ofrece usar la vez anterior", () => {
    renderCard({ appearance: "pending", lastPerformance: [{ weight: 35, reps: 10 }] })

    expect(screen.queryByRole("button", { name: /Última:/ })).toBeNull()
  })

  // «usar» y el peso de las series ya hechas: ver peso-usar-ultima.test.tsx.

  it("saltar el ejercicio pregunta antes; si se dice que no, no lo salta", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    const handlers = renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Saltar ejercicio" }))

    expect(confirm).toHaveBeenCalledWith("¿Saltar este ejercicio? Puedes retomarlo en otra sesión.")
    expect(handlers.onSkip).not.toHaveBeenCalled()
  })

  it("al confirmar, salta el ejercicio", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    const handlers = renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Saltar ejercicio" }))

    expect(handlers.onSkip).toHaveBeenCalled()
  })

  it("un ejercicio terminado resume series y peso", () => {
    renderCard({ appearance: "completed", setsData: sets([true, true, false]) })

    expect(screen.getByText(/2\/3 series · 40 kg/)).toBeTruthy()
    expect(screen.queryByText("Omitido")).toBeNull()
    expect(screen.queryByRole("button", { name: /Completar serie/ })).toBeNull()
  })

  it("un ejercicio terminado de peso corporal sin lastre dice «peso corporal» y si se omitió", () => {
    renderCard({
      se: pullUp,
      appearance: "completed",
      setsData: sets([false, false], { weight: 0 }),
      skipped: true,
    })

    expect(screen.getByText(/0\/2 series · peso corporal/)).toBeTruthy()
    expect(screen.getByText("Omitido")).toBeTruthy()
  })
})
