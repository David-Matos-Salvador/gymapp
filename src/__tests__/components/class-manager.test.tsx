// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jsonResponse, mockFetch, offlineFetch, sentJson } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("@/components/layout/shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

import { ClassManager } from "@/components/coach/class-manager"

type ClassItem = React.ComponentProps<typeof ClassManager>["classItem"]

const yoga: ClassItem = {
  id: "yoga",
  name: "Yoga",
  description: "Para empezar el día",
  capacity: 10,
  duration: 60,
  dayOfWeek: "MONDAY",
  startTime: "07:00",
  bookings: [
    {
      id: "b-laura",
      status: "CONFIRMED",
      user: { id: "u-1", name: "Laura Pérez", email: "laura@example.com" },
    },
    {
      id: "b-carlos",
      status: "ATTENDED",
      user: { id: "u-2", name: null, email: "carlos@example.com" },
    },
    {
      id: "b-ana",
      status: "CANCELLED",
      user: { id: "u-3", name: "Ana Torres", email: "ana@example.com" },
    },
  ],
}

function renderManager(classItem: ClassItem = yoga) {
  return render(<ClassManager classItem={classItem} />)
}

describe("ClassManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("muestra el nombre, las reservas confirmadas y el enlace para volver", () => {
    renderManager()

    expect(screen.getByRole("heading", { name: "Yoga" })).toBeTruthy()
    expect(screen.getByText("1 reserva confirmada de 10")).toBeTruthy()
    expect(screen.getByRole("link", { name: /Volver a clases/ }).getAttribute("href")).toBe(
      "/classes"
    )
  })

  it("usa el plural cuando no hay una sola reserva confirmada", () => {
    renderManager({ ...yoga, bookings: [] })

    expect(screen.getByText("0 reservas confirmadas de 10")).toBeTruthy()
    expect(screen.getByText("Sin reservas todavía")).toBeTruthy()
  })

  it("el formulario empieza con los datos de la clase", () => {
    renderManager()

    expect(screen.getByLabelText("Nombre")).toHaveProperty("value", "Yoga")
    expect(screen.getByLabelText("Descripción")).toHaveProperty("value", "Para empezar el día")
    expect(screen.getByLabelText("Día")).toHaveProperty("value", "MONDAY")
    expect(screen.getByLabelText("Hora")).toHaveProperty("value", "07:00")
    expect(screen.getByLabelText("Duración (min)")).toHaveProperty("value", "60")
    expect(screen.getByLabelText("Capacidad")).toHaveProperty("value", "10")
  })

  it("guardar envía los cambios con números y sin espacios, y refresca", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    renderManager()

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "  Yoga suave  " } })
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "   " } })
    fireEvent.change(screen.getByLabelText("Día"), { target: { value: "SATURDAY" } })
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "09:30" } })
    fireEvent.change(screen.getByLabelText("Duración (min)"), { target: { value: "45" } })
    fireEvent.change(screen.getByLabelText("Capacidad"), { target: { value: "12" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Clase actualizada"))
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/classes/yoga",
      expect.objectContaining({ method: "PATCH" })
    )
    expect(sentJson(fetchMock)).toEqual({
      name: "Yoga suave",
      description: null,
      capacity: 12,
      duration: 45,
      dayOfWeek: "SATURDAY",
      startTime: "09:30",
    })
    expect(router.refresh).toHaveBeenCalled()
  })

  it("si la API no deja guardar, muestra su mensaje y vuelve a habilitar el botón", async () => {
    mockFetch(jsonResponse({ error: "La capacidad no puede ser menor que las reservas" }, 400))
    renderManager()

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("La capacidad no puede ser menor que las reservas")
    )
    expect(router.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toHaveProperty(
      "disabled",
      false
    )
  })

  it("lista los inscritos con su estado y solo deja marcar asistencia a los confirmados", () => {
    renderManager()

    expect(screen.getByText("Laura Pérez")).toBeTruthy()
    expect(screen.getByText("Confirmada")).toBeTruthy()
    // Sin nombre se muestra el correo.
    expect(screen.getAllByText("carlos@example.com")).toHaveLength(2)
    expect(screen.getByText("Cancelada")).toBeTruthy()
    expect(screen.getAllByRole("button", { name: /Asistió/ })).toHaveLength(1)
  })

  it("marcar asistencia cambia el estado y descuenta la reserva confirmada", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    renderManager()

    fireEvent.click(screen.getByRole("button", { name: /Asistió/ }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Asistencia marcada"))
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings/b-laura",
      expect.objectContaining({ method: "PATCH" })
    )
    expect(sentJson(fetchMock)).toEqual({ status: "ATTENDED" })
    expect(screen.queryByRole("button", { name: /Asistió/ })).toBeNull()
    expect(screen.getByText("0 reservas confirmadas de 10")).toBeTruthy()
  })

  it("si no se puede marcar asistencia, avisa y la reserva sigue confirmada", async () => {
    mockFetch(jsonResponse({}, 500))
    renderManager()

    fireEvent.click(screen.getByRole("button", { name: /Asistió/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error al marcar asistencia"))
    expect(screen.getByRole("button", { name: /Asistió/ })).toBeTruthy()
  })

  it("cancelar la clase pregunta antes; si se dice que no, no hace nada", () => {
    const fetchMock = mockFetch()
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderManager()

    fireEvent.click(screen.getByRole("button", { name: /Cancelar clase/ }))

    expect(confirm).toHaveBeenCalledWith(
      "¿Cancelar esta clase? Se cancelarán las reservas confirmadas."
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("al confirmar, borra la clase y vuelve al inicio", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderManager()

    fireEvent.click(screen.getByRole("button", { name: /Cancelar clase/ }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Clase cancelada"))
    expect(fetchMock).toHaveBeenCalledWith("/api/classes/yoga", { method: "DELETE" })
    expect(router.push).toHaveBeenCalledWith("/dashboard")
  })

  it("si no se puede cancelar la clase, muestra el mensaje de la API y se queda", async () => {
    mockFetch(jsonResponse({ error: "No puedes cancelar esta clase" }, 403))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderManager()

    fireEvent.click(screen.getByRole("button", { name: /Cancelar clase/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No puedes cancelar esta clase"))
    expect(router.push).not.toHaveBeenCalled()
  })

  it("el encabezado muestra la capacidad guardada mientras se escribe otra", () => {
    const { rerender } = renderManager()

    fireEvent.change(screen.getByLabelText("Capacidad"), { target: { value: "" } })
    expect(screen.getByText("1 reserva confirmada de 10")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Capacidad"), { target: { value: "99" } })
    expect(screen.getByText("1 reserva confirmada de 10")).toBeTruthy()

    // Al guardar, router.refresh() trae la clase con la capacidad nueva.
    rerender(<ClassManager classItem={{ ...yoga, capacity: 99 }} />)
    expect(screen.getByText("1 reserva confirmada de 99")).toBeTruthy()
  })

  it("si se cae la conexión al marcar asistencia, avisa y deja reintentar", async () => {
    offlineFetch()
    renderManager()

    fireEvent.click(screen.getByRole("button", { name: /Asistió/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error de conexión"))
    expect(screen.getByRole("button", { name: /Asistió/ })).toHaveProperty("disabled", false)
  })

  it("si se cae la conexión al cancelar la clase, avisa y se queda", async () => {
    offlineFetch()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderManager()

    fireEvent.click(screen.getByRole("button", { name: /Cancelar clase/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error de conexión"))
    expect(router.push).not.toHaveBeenCalled()
  })
})
