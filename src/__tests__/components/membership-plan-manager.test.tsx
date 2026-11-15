// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jsonResponse, mockFetch, sentJson } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn() }) }))

import {
  MembershipPlanManager,
  type MembershipPlan,
} from "@/components/admin/membership-plan-manager"

const monthly: MembershipPlan = {
  id: "plan-1",
  name: "Mensual",
  description: "Acceso completo",
  price: 100,
  currency: "PEN",
  durationDays: 30,
  active: true,
}

const dayPass: MembershipPlan = {
  id: "plan-2",
  name: "Pase Diario",
  description: null,
  price: 15,
  currency: "PEN",
  durationDays: 1,
  active: false,
}

function renderManager(props: Partial<React.ComponentProps<typeof MembershipPlanManager>> = {}) {
  return render(
    <MembershipPlanManager initialPlans={[monthly, dayPass]} gymId="gym-1" canManage {...props} />
  )
}

function openNewPlan() {
  fireEvent.click(screen.getByRole("button", { name: "Nuevo plan" }))
}

function fillPlan({ name, price, days }: { name?: string; price?: string; days?: string }) {
  if (name !== undefined) {
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: name } })
  }
  if (price !== undefined) {
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: price } })
  }
  if (days !== undefined) {
    fireEvent.change(screen.getByLabelText("Duración (días)"), { target: { value: days } })
  }
}

describe("MembershipPlanManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("lista los planes con precio, duración y si están activos", () => {
    renderManager()

    expect(screen.getByText("Mensual")).toBeTruthy()
    expect(screen.getByText("Acceso completo")).toBeTruthy()
    expect(screen.getByText(/S\/\s?100\.00/)).toBeTruthy()
    expect(screen.getByText("/ 30 días")).toBeTruthy()
    expect(screen.getByText("Activo")).toBeTruthy()
    expect(screen.getByText("Pase Diario")).toBeTruthy()
    expect(screen.getByText("/ 1 día")).toBeTruthy()
    expect(screen.getByText("Inactivo")).toBeTruthy()
  })

  it("sin planes, lo dice", () => {
    renderManager({ initialPlans: [] })

    expect(screen.getByText("No hay planes de membresía para este gimnasio")).toBeTruthy()
  })

  it("quien no puede administrar solo ve los planes: sin crear, editar, activar ni eliminar", () => {
    renderManager({ canManage: false })

    expect(screen.getByText("Mensual")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Nuevo plan" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Editar plan" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Desactivar plan" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Activar plan" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Eliminar plan" })).toBeNull()
  })

  it("sin gimnasio elegido no se puede crear un plan", () => {
    renderManager({ gymId: undefined })

    const button = screen.getByRole("button", { name: "Nuevo plan" }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it("no deja crear un plan sin nombre", () => {
    renderManager()
    openNewPlan()

    const create = screen.getByRole("button", { name: "Crear plan" }) as HTMLButtonElement
    expect(create.disabled).toBe(true)

    fillPlan({ name: "   " })
    expect(create.disabled).toBe(true)

    fillPlan({ name: "Trimestral" })
    expect(create.disabled).toBe(false)
  })

  it("crea el plan en soles para el gimnasio y lo agrega a la lista", async () => {
    const created = { ...monthly, id: "plan-3", name: "Trimestral", price: 270, durationDays: 90 }
    const fetchMock = mockFetch(jsonResponse({ plan: created }, 201))
    renderManager()
    openNewPlan()

    fillPlan({ name: "  Trimestral ", price: "270", days: "90" })
    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Plan creado"))
    expect(fetchMock.mock.calls[0][0]).toBe("/api/membership-plans")
    expect(fetchMock.mock.calls[0][1].method).toBe("POST")
    expect(sentJson(fetchMock)).toEqual({
      name: "Trimestral",
      price: 270,
      currency: "PEN",
      durationDays: 90,
      gymId: "gym-1",
    })
    expect(screen.getByText("Trimestral")).toBeTruthy()
    expect(screen.getByText("/ 90 días")).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole("button", { name: "Crear plan" })).toBeNull())
  })

  it("rechaza un precio con más de dos decimales sin llamar a la API", () => {
    const fetchMock = mockFetch()
    renderManager()
    openNewPlan()

    fillPlan({ name: "Trimestral", price: "99.999" })
    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }))

    expect(toast.error).toHaveBeenCalledWith("El precio admite máximo dos decimales")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rechaza un precio negativo y una duración de cero días", () => {
    const fetchMock = mockFetch()
    renderManager()
    openNewPlan()

    fillPlan({ name: "Trimestral", price: "-5" })
    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }))
    expect(toast.error).toHaveBeenLastCalledWith("El precio debe estar entre 0 y 1.000.000")

    fillPlan({ price: "50", days: "0" })
    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }))
    expect(toast.error).toHaveBeenLastCalledWith(
      "La duración debe ser un entero entre 1 y 3650 días"
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("si la API rechaza el plan, muestra su mensaje y deja el formulario abierto", async () => {
    mockFetch(jsonResponse({ error: "Ya existe un plan con ese nombre" }, 409))
    renderManager()
    openNewPlan()

    fillPlan({ name: "Mensual", price: "100" })
    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Ya existe un plan con ese nombre")
    )
    expect(screen.getByRole("button", { name: "Crear plan" })).toBeTruthy()
  })

  it("editar abre el formulario con los datos del plan y guarda los cambios", async () => {
    const fetchMock = mockFetch(jsonResponse({ plan: { ...monthly, price: 120 } }))
    renderManager()

    fireEvent.click(screen.getAllByRole("button", { name: "Editar plan" })[0])
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Mensual")
    expect((screen.getByLabelText("Precio") as HTMLInputElement).value).toBe("100")
    expect((screen.getByLabelText("Duración (días)") as HTMLInputElement).value).toBe("30")

    fillPlan({ price: "120" })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Plan actualizado"))
    expect(fetchMock.mock.calls[0][0]).toBe("/api/membership-plans/plan-1")
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH")
    expect(sentJson(fetchMock)).toEqual({
      name: "Mensual",
      description: "Acceso completo",
      price: 120,
      currency: "PEN",
      durationDays: 30,
    })
    expect(screen.getByText(/S\/\s?120\.00/)).toBeTruthy()
  })

  it("desactivar un plan lo marca como inactivo", async () => {
    const fetchMock = mockFetch(jsonResponse({ plan: { ...monthly, active: false } }))
    renderManager({ initialPlans: [monthly] })

    fireEvent.click(screen.getByRole("button", { name: "Desactivar plan" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Plan desactivado"))
    expect(fetchMock.mock.calls[0][0]).toBe("/api/membership-plans/plan-1")
    expect(sentJson(fetchMock)).toEqual({ active: false })
    expect(screen.getByText("Inactivo")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Activar plan" })).toBeTruthy()
  })

  it("eliminar pide confirmación y explica qué pasa si el plan tiene membresías", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    renderManager({ initialPlans: [monthly] })

    fireEvent.click(screen.getByRole("button", { name: "Eliminar plan" }))
    expect(
      screen.getByText(
        "Si el plan tiene membresías, no se podrá eliminar. Puedes desactivarlo en su lugar."
      )
    ).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Plan eliminado"))
    expect(fetchMock.mock.calls[0][0]).toBe("/api/membership-plans/plan-1")
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE")
    expect(screen.queryByText("Mensual")).toBeNull()
    expect(screen.getByText("No hay planes de membresía para este gimnasio")).toBeTruthy()
  })

  it("si el plan no se puede eliminar, muestra el motivo y el plan sigue en la lista", async () => {
    mockFetch(jsonResponse({ error: "El plan tiene membresías asociadas" }, 409))
    renderManager({ initialPlans: [monthly] })

    fireEvent.click(screen.getByRole("button", { name: "Eliminar plan" }))
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("El plan tiene membresías asociadas")
    )
    expect(screen.getByText("Mensual")).toBeTruthy()
  })

  // Posibles fallos vistos al escribir estas pruebas (anotados en el #22, sin arreglar aquí).
  it.todo(
    "con el precio vacío debería pedir un precio: hoy Number('') es 0 y crea un plan gratis sin avisar"
  )
  it.todo(
    "si se cae la conexión al guardar debería avisar y soltar el botón: hoy queda deshabilitado"
  )
})
