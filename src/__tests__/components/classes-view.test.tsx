// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { jsonResponse, mockFetch, sentJson } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn() }) }))

import { ClassesView } from "@/components/classes/classes-view"

// Reservar y lo que ve cada perfil. Cancelar con confirmación ya está en
// clases-cancelar-confirma.test.tsx y el estado de reservas en clases-reserva-estado.test.ts.
type Props = React.ComponentProps<typeof ClassesView>
type ClassItem = Props["classes"][number]

function classItem(overrides: Partial<ClassItem> & { id: string; name: string }): ClassItem {
  return {
    description: null,
    dayOfWeek: "MONDAY",
    startTime: "07:00",
    duration: 60,
    capacity: 10,
    trainerId: "coach-ana",
    trainer: { name: "Ana" },
    confirmedCount: 3,
    ...overrides,
  }
}

const spinning = classItem({
  id: "spinning",
  name: "Spinning",
  dayOfWeek: "FRIDAY",
  startTime: "19:30",
  duration: 45,
  description: "Cardio en bicicleta",
})
const yoga = classItem({ id: "yoga", name: "Yoga" })
const fullBox = classItem({
  id: "box",
  name: "Box",
  dayOfWeek: "WEDNESDAY",
  capacity: 8,
  confirmedCount: 8,
  trainerId: "coach-diego",
  trainer: { name: null },
})

function renderView(props: Partial<Props> = {}) {
  return render(
    <ClassesView
      classes={[spinning, yoga, fullBox]}
      bookings={[]}
      userRole="MEMBER"
      userId="miembro"
      {...props}
    />
  )
}

function cardOf(name: string) {
  const card = screen.getByText(name).closest('[data-slot="card"]')
  if (!card) throw new Error(`No hay tarjeta para ${name}`)
  return within(card as HTMLElement)
}

describe("ClassesView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sin clases lo dice", () => {
    renderView({ classes: [] })

    expect(screen.getByText("Aún no hay clases programadas")).toBeTruthy()
  })

  it("ordena las clases de lunes a domingo", () => {
    renderView()

    const titles = screen
      .getAllByText(/^(Spinning|Yoga|Box)$/)
      .map((element) => element.textContent)
    expect(titles).toEqual(["Yoga", "Box", "Spinning"])
  })

  it("cada tarjeta muestra día, hora, duración, lugares, coach y descripción", () => {
    renderView()

    const card = cardOf("Spinning")
    expect(card.getByText("viernes")).toBeTruthy()
    expect(card.getByText("19:30 · 45 min")).toBeTruthy()
    expect(card.getByText("3/10")).toBeTruthy()
    expect(card.getByText("Ana")).toBeTruthy()
    expect(card.getByText("Cardio en bicicleta")).toBeTruthy()
    expect(cardOf("Box").getByText("Sin asignar")).toBeTruthy()
  })

  it("una clase llena no se puede reservar", () => {
    renderView()

    const button = cardOf("Box").getByRole("button", { name: "Clase llena" })
    expect(button).toHaveProperty("disabled", true)
  })

  it("reservar suma el lugar al momento y ofrece cancelar y añadir a Google Calendar", async () => {
    const fetchMock = mockFetch(jsonResponse({ booking: { id: "reserva-9" } }))
    renderView()

    fireEvent.click(cardOf("Yoga").getByRole("button", { name: "Reservar lugar" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Clase reservada"))
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings",
      expect.objectContaining({ method: "POST" })
    )
    expect(sentJson(fetchMock)).toEqual({ classId: "yoga" })

    const card = cardOf("Yoga")
    expect(card.getByText("4/10")).toBeTruthy()
    expect(card.getByRole("button", { name: /Cancelar reserva/ })).toBeTruthy()
    const calendar = card.getByRole("link", { name: /Añadir a Google Calendar/ })
    const url = new URL(calendar.getAttribute("href")!)
    expect(url.origin).toBe("https://calendar.google.com")
    expect(url.searchParams.get("text")).toBe("Yoga")
    expect(url.searchParams.get("recur")).toBe("RRULE:FREQ=WEEKLY")
    expect(url.searchParams.get("dates")).toMatch(/^\d{8}T070000\/\d{8}T080000$/)
    expect(calendar.getAttribute("target")).toBe("_blank")
  })

  it("una clase ya reservada empieza con «Cancelar reserva»", () => {
    renderView({ bookings: [{ id: "reserva-1", status: "CONFIRMED", classItem: yoga }] })

    expect(cardOf("Yoga").getByRole("button", { name: /Cancelar reserva/ })).toBeTruthy()
    expect(cardOf("Spinning").getByRole("button", { name: "Reservar lugar" })).toBeTruthy()
  })

  it("sin membresía activa, al miembro le ofrece ir a «Ver membresía»", async () => {
    mockFetch(
      jsonResponse(
        { error: "Necesitas una membresía activa para reservar", code: "MEMBERSHIP_REQUIRED" },
        403
      )
    )
    renderView()

    fireEvent.click(cardOf("Yoga").getByRole("button", { name: "Reservar lugar" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    const [message, options] = toast.error.mock.calls[0]
    expect(message).toBe("Necesitas una membresía activa para reservar")
    expect(options.action.label).toBe("Ver membresía")
    options.action.onClick()
    expect(router.push).toHaveBeenCalledWith("/membresia")
    expect(cardOf("Yoga").getByText("3/10")).toBeTruthy()
  })

  it("a un coach que reserva sin membresía no le ofrece ir a la membresía", async () => {
    mockFetch(jsonResponse({ error: "Sin membresía", code: "MEMBERSHIP_REQUIRED" }, 403))
    renderView({ userRole: "TRAINER", userId: "coach-diego" })

    fireEvent.click(cardOf("Yoga").getByRole("button", { name: "Reservar lugar" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Sin membresía", undefined))
  })

  it("si la API falla sin mensaje, dice «Error al reservar» y deja intentarlo otra vez", async () => {
    mockFetch(jsonResponse({}, 500))
    renderView()

    fireEvent.click(cardOf("Yoga").getByRole("button", { name: "Reservar lugar" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error al reservar", undefined))
    expect(cardOf("Yoga").getByRole("button", { name: "Reservar lugar" })).toHaveProperty(
      "disabled",
      false
    )
  })

  it("si falla la cancelación, avisa y la reserva sigue", async () => {
    mockFetch(jsonResponse({ error: "x" }, 500))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderView({ bookings: [{ id: "reserva-1", status: "CONFIRMED", classItem: yoga }] })

    fireEvent.click(cardOf("Yoga").getByRole("button", { name: /Cancelar reserva/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error al cancelar"))
    expect(cardOf("Yoga").getByRole("button", { name: /Cancelar reserva/ })).toBeTruthy()
    vi.restoreAllMocks()
  })

  describe("según el perfil", () => {
    it("el coach gestiona sus propias clases y puede reservar las de otros", () => {
      renderView({ userRole: "TRAINER", userId: "coach-ana" })

      const manage = cardOf("Yoga").getByRole("link", { name: /Gestionar clase/ })
      expect(manage.getAttribute("href")).toBe("/coach/classes/yoga")
      expect(cardOf("Yoga").queryByRole("button", { name: "Reservar lugar" })).toBeNull()
      expect(cardOf("Box").getByRole("button", { name: "Clase llena" })).toBeTruthy()
      expect(cardOf("Box").queryByRole("link", { name: /Gestionar clase/ })).toBeNull()
    })

    it("el miembro no ve «Gestionar clase»", () => {
      renderView()

      expect(screen.queryByRole("link", { name: /Gestionar clase/ })).toBeNull()
      expect(screen.getAllByRole("button", { name: "Reservar lugar" })).toHaveLength(2)
    })

    it("el admin solo mira: no reserva ni gestiona", () => {
      renderView({ userRole: "ADMIN", userId: "admin" })

      expect(screen.queryByRole("button")).toBeNull()
      expect(screen.queryByRole("link")).toBeNull()
      expect(screen.getByText("Yoga")).toBeTruthy()
    })
  })

  it.todo(
    "si se cae la conexión al reservar o cancelar, avisa y deja reintentar " +
      "(hoy `handleBook` y `handleCancel` no tienen try/catch: el botón queda deshabilitado con " +
      "el spinner y sin aviso hasta recargar; classes-view.tsx:117 y :155)"
  )
})
