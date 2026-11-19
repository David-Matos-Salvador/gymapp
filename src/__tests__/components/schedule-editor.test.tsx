// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { jsonResponse, mockFetch, offlineFetch, sentJson } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

import { ScheduleEditor } from "@/components/coach/schedule-editor"
import type { AvailabilityBlock } from "@/lib/coach-schedule"

const mondayMorning: AvailabilityBlock = {
  dayOfWeek: "MONDAY",
  startTime: "08:00",
  endTime: "12:00",
}
const wednesdayAfternoon: AvailabilityBlock = {
  dayOfWeek: "WEDNESDAY",
  startTime: "15:00",
  endTime: "18:00",
}

function day(id: string) {
  return within(screen.getByTestId(`availability-${id}`))
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: "Guardar horas de atención" }))
}

describe("ScheduleEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("muestra los siete días, de lunes a domingo, y cuánto dura cada sesión", () => {
    render(<ScheduleEditor initialBlocks={[]} />)

    for (const id of [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ]) {
      expect(screen.getByTestId(`availability-${id}`)).toBeTruthy()
    }
    expect(day("MONDAY").getByText("Lunes")).toBeTruthy()
    expect(day("SUNDAY").getByText("Domingo")).toBeTruthy()
    expect(screen.getAllByText("No atiendes este día")).toHaveLength(7)
    expect(screen.getByText(/Cada sesión dura 60 minutos/)).toBeTruthy()
  })

  it("empieza con las horas que el coach ya tenía", () => {
    render(<ScheduleEditor initialBlocks={[mondayMorning, wednesdayAfternoon]} />)

    expect(day("MONDAY").getByLabelText("Desde, lunes")).toHaveProperty("value", "08:00")
    expect(day("MONDAY").getByLabelText("Hasta, lunes")).toHaveProperty("value", "12:00")
    expect(day("WEDNESDAY").getByLabelText("Desde, miércoles")).toHaveProperty("value", "15:00")
    expect(day("TUESDAY").getByText("No atiendes este día")).toBeTruthy()
    expect(screen.getAllByText("No atiendes este día")).toHaveLength(5)
  })

  it("«Agregar horas» suma un bloque de 09:00 a 12:00 en ese día", () => {
    render(<ScheduleEditor initialBlocks={[]} />)

    fireEvent.click(screen.getByRole("button", { name: "Agregar horas el viernes" }))

    expect(day("FRIDAY").getByLabelText("Desde, viernes")).toHaveProperty("value", "09:00")
    expect(day("FRIDAY").getByLabelText("Hasta, viernes")).toHaveProperty("value", "12:00")
    expect(day("FRIDAY").queryByText("No atiendes este día")).toBeNull()
  })

  it("quitar un bloque deja el día sin atención", () => {
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    fireEvent.click(screen.getByRole("button", { name: "Quitar horas del lunes" }))

    expect(day("MONDAY").getByText("No atiendes este día")).toBeTruthy()
    expect(day("MONDAY").queryByLabelText("Desde, lunes")).toBeNull()
  })

  it("guardar envía todos los bloques con los cambios y refresca", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    render(<ScheduleEditor initialBlocks={[mondayMorning, wednesdayAfternoon]} />)

    fireEvent.change(screen.getByLabelText("Hasta, lunes"), { target: { value: "13:00" } })
    fireEvent.click(screen.getByRole("button", { name: "Agregar horas el sábado" }))
    fireEvent.click(screen.getByRole("button", { name: "Quitar horas del miércoles" }))
    save()

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Horas de atención guardadas"))
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trainer/availability",
      expect.objectContaining({ method: "PUT" })
    )
    expect(sentJson(fetchMock)).toEqual({
      blocks: [
        { dayOfWeek: "MONDAY", startTime: "08:00", endTime: "13:00" },
        { dayOfWeek: "SATURDAY", startTime: "09:00", endTime: "12:00" },
      ],
    })
    expect(router.refresh).toHaveBeenCalled()
  })

  it("se puede guardar sin ningún bloque para dejar de atender", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    fireEvent.click(screen.getByRole("button", { name: "Quitar horas del lunes" }))
    save()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(sentJson(fetchMock)).toEqual({ blocks: [] })
  })

  it("no guarda si la hora de fin no es posterior a la de inicio", () => {
    const fetchMock = mockFetch()
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    fireEvent.change(screen.getByLabelText("Hasta, lunes"), { target: { value: "07:00" } })
    save()

    expect(toast.error).toHaveBeenCalledWith("La hora de fin debe ser posterior a la de inicio")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("no guarda un bloque de menos de una sesión", () => {
    const fetchMock = mockFetch()
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    fireEvent.change(screen.getByLabelText("Hasta, lunes"), { target: { value: "08:30" } })
    save()

    expect(toast.error).toHaveBeenCalledWith("Cada bloque debe durar al menos 60 minutos")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("no guarda dos bloques que se cruzan el mismo día", () => {
    const fetchMock = mockFetch()
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    // El nuevo bloque es de 09:00 a 12:00 y se cruza con el de 08:00 a 12:00.
    fireEvent.click(screen.getByRole("button", { name: "Agregar horas el lunes" }))
    save()

    expect(toast.error).toHaveBeenCalledWith("Tienes bloques que se cruzan el lunes")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("no guarda si se borra una hora", () => {
    const fetchMock = mockFetch()
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    fireEvent.change(screen.getByLabelText("Desde, lunes"), { target: { value: "" } })
    save()

    expect(toast.error).toHaveBeenCalledWith("Usa horas con el formato HH:mm")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("si la API no deja guardar, muestra su mensaje y vuelve a habilitar el botón", async () => {
    mockFetch(jsonResponse({ error: "Solo un coach puede editar su agenda" }, 403))
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    save()

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Solo un coach puede editar su agenda")
    )
    expect(router.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Guardar horas de atención" })).toHaveProperty(
      "disabled",
      false
    )
  })

  it("si la API falla sin mensaje, da uno genérico", async () => {
    mockFetch(jsonResponse({}, 500))
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    save()

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("No se pudieron guardar tus horas")
    )
  })

  it("si se cae la conexión, avisa y deja reintentar", async () => {
    offlineFetch()
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    save()

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("No se pudieron guardar tus horas")
    )
    expect(screen.getByRole("button", { name: "Guardar horas de atención" })).toHaveProperty(
      "disabled",
      false
    )
  })

  it("mientras guarda, el botón dice «Guardando…» y no se puede volver a tocar", async () => {
    let resolve: (value: Response) => void = () => {}
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((r) => (resolve = r)))
    )
    render(<ScheduleEditor initialBlocks={[mondayMorning]} />)

    save()

    const button = await screen.findByRole("button", { name: "Guardando…" })
    expect(button).toHaveProperty("disabled", true)
    resolve(jsonResponse({ ok: true }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar horas de atención" })).toBeTruthy()
    )
  })

  it.todo(
    "sin conexión dice «No se pudieron guardar tus horas», cuando el resto de la app (#184) dice " +
      "«Error de conexión»; decidir si se unifica (schedule-editor.tsx:76)"
  )
})
