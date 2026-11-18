// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { jsonResponse, mockFetch, offlineFetch, sentJson } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn() }) }))

import { MembershipPanel } from "@/components/admin/membership-panel"

type Props = React.ComponentProps<typeof MembershipPanel>
type Membership = Props["memberships"][number]
type PendingPayment = Props["pendingPayments"][number]

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

const plan = {
  id: "plan-mensual",
  name: "Mensual",
  price: 100,
  currency: "PEN",
  durationDays: 30,
  gymId: "gym-1",
  gym: { name: "Fitness Total" },
}

function membership(overrides: Partial<Membership> & { id: string }): Membership {
  return {
    userId: `user-${overrides.id}`,
    planId: plan.id,
    status: "ACTIVE",
    startDate: daysFromNow(-10),
    endDate: daysFromNow(20),
    autoRenew: false,
    paymentConfirmed: false,
    paymentMethod: "CASH",
    paymentRef: null,
    planPrice: 100,
    planCurrency: "PEN",
    planDurationDays: 30,
    notes: null,
    createdAt: daysFromNow(-10),
    updatedAt: daysFromNow(-10),
    user: {
      id: `user-${overrides.id}`,
      name: "Laura Pérez",
      email: "laura@example.com",
      gymId: "gym-1",
      assignedTrainer: { name: "Diego" },
    },
    plan,
    ...overrides,
  }
}

// Una en cada pestaña, más otra vencida por fecha aunque su estado diga ACTIVE.
const unpaid = membership({ id: "m-sin-pago" })
const paid = membership({
  id: "m-pagada",
  paymentConfirmed: true,
  paymentRef: "OP-123",
  user: {
    id: "user-m-pagada",
    name: "Carlos Ruiz",
    email: "carlos@example.com",
    gymId: "gym-1",
    assignedTrainer: null,
  },
})
const expiredByDate = membership({
  id: "m-vencida-fecha",
  endDate: daysFromNow(-2),
  user: {
    id: "user-m-vencida-fecha",
    name: "Ana Torres",
    email: "ana@example.com",
    gymId: "gym-1",
    assignedTrainer: null,
  },
})
const cancelled = membership({
  id: "m-cancelada",
  status: "CANCELLED",
  paymentConfirmed: true,
  user: {
    id: "user-m-cancelada",
    name: null,
    email: "sofia@example.com",
    gymId: "gym-1",
    assignedTrainer: null,
  },
})

function receipt(overrides: Partial<PendingPayment> = {}): PendingPayment {
  return {
    id: "pago-1",
    userId: unpaid.userId,
    membershipId: unpaid.id,
    amount: 100,
    currency: "PEN",
    method: "YAPE",
    receiptUrl: "https://cdn.example.com/comprobante.jpg",
    createdAt: daysFromNow(-1),
    ...overrides,
  }
}

const members = [
  { id: "socio-1", name: "Laura Pérez", email: "laura@example.com", gymId: "gym-1" },
  { id: "socio-2", name: "Pedro Gil", email: "pedro@example.com", gymId: "gym-2" },
]
const plans = [
  plan,
  {
    id: "plan-otro-gym",
    name: "Trimestral Sur",
    price: 250,
    currency: "PEN",
    durationDays: 90,
    gymId: "gym-2",
    gym: { name: "Gym Sur" },
  },
]

function renderPanel(props: Partial<Props> = {}) {
  return render(
    <MembershipPanel
      memberships={[unpaid, paid, expiredByDate, cancelled]}
      pendingPayments={[]}
      members={members}
      plans={plans}
      {...props}
    />
  )
}

function openTab(name: RegExp) {
  // Las pestañas de Radix cambian con mouseDown (botón principal), no con click.
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 })
}

function cardOf(text: string) {
  // La tarjeta es el contenedor con data-slot="card" que muestra ese texto.
  const card = screen.getByText(text).closest('[data-slot="card"]')
  if (!card) throw new Error(`No hay tarjeta para ${text}`)
  return within(card as HTMLElement)
}

/** Abre un Select de Radix con el teclado y elige la opción con ese texto. */
async function choose(trigger: HTMLElement, option: RegExp) {
  fireEvent.keyDown(trigger, { key: "Enter" })
  const item = await screen.findByRole("option", { name: option })
  fireEvent.keyDown(item, { key: "Enter" })
}

describe("MembershipPanel", () => {
  beforeAll(() => {
    // jsdom no implementa lo que usa el Select de Radix para abrirse y desplazarse.
    Element.prototype.scrollIntoView ??= vi.fn()
    Element.prototype.hasPointerCapture ??= vi.fn(() => false)
    Element.prototype.releasePointerCapture ??= vi.fn()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("pestañas y tarjetas", () => {
    it("pone cada membresía en una sola pestaña y cuenta las vencidas por fecha aunque digan Activa", () => {
      renderPanel()

      expect(screen.getByRole("tab", { name: "Pago sin confirmar (1)" })).toBeTruthy()
      expect(screen.getByRole("tab", { name: "Activas (1)" })).toBeTruthy()
      expect(screen.getByRole("tab", { name: "Vencidas (2)" })).toBeTruthy()
    })

    it("la tarjeta sin pago muestra socio, plan, precio, gimnasio, coach y el botón para registrar el pago", () => {
      renderPanel()

      const card = cardOf("Laura Pérez")
      expect(card.getByText("laura@example.com")).toBeTruthy()
      expect(card.getByText("Mensual")).toBeTruthy()
      expect(card.getByText("Activa")).toBeTruthy()
      expect(card.getByText(/S\/\s?100\.00/)).toBeTruthy()
      expect(card.getByText("Fitness Total")).toBeTruthy()
      expect(card.getByText("Diego")).toBeTruthy()
      expect(card.getByText("Efectivo")).toBeTruthy()
      expect(card.getByText("Pago sin confirmar")).toBeTruthy()
      expect(card.getByRole("button", { name: "Registrar pago manual" })).toBeTruthy()
    })

    it("la pagada dice «Pagado», muestra la referencia y no ofrece registrar otro pago", async () => {
      renderPanel()
      openTab(/^Activas/)

      await screen.findByText("Carlos Ruiz")
      const card = cardOf("Carlos Ruiz")
      expect(card.getByText("Pagado")).toBeTruthy()
      expect(card.getByText("Ref: OP-123")).toBeTruthy()
      expect(card.getByText("Sin coach")).toBeTruthy()
      expect(card.queryByRole("button", { name: "Registrar pago manual" })).toBeNull()
    })

    it("en Vencidas todas se pueden renovar; sin nombre se muestra «Sin nombre»", async () => {
      renderPanel()
      openTab(/^Vencidas/)

      await screen.findByText("Ana Torres")
      expect(screen.getAllByText("Renovable")).toHaveLength(2)
      expect(screen.getAllByRole("button", { name: "Renovar" })).toHaveLength(2)
      expect(screen.getByText("Sin nombre")).toBeTruthy()
      expect(screen.getByText("Cancelada")).toBeTruthy()
      // La vencida por fecha no tiene pago, pero ya no se puede registrar: hay que renovarla.
      expect(
        cardOf("Ana Torres").queryByRole("button", { name: "Registrar pago manual" })
      ).toBeNull()
    })

    it("cada pestaña vacía tiene su propio mensaje", () => {
      renderPanel({ memberships: [] })

      expect(screen.getByText("No hay membresías con pago pendiente")).toBeTruthy()
    })

    it("el buscador filtra por nombre, correo o plan, sin distinguir mayúsculas", async () => {
      renderPanel()
      const search = screen.getByPlaceholderText("Buscar por nombre, correo o plan...")

      fireEvent.change(search, { target: { value: "LAURA@" } })
      expect(screen.getByText("Laura Pérez")).toBeTruthy()

      fireEvent.change(search, { target: { value: "nadie" } })
      expect(screen.getByText("No hay membresías con pago pendiente")).toBeTruthy()

      fireEvent.change(search, { target: { value: "mensual" } })
      expect(screen.getByText("Laura Pérez")).toBeTruthy()
    })
  })

  describe("registrar pago manual", () => {
    it("pide confirmar, envía método y referencia, y la membresía pasa a Activas", async () => {
      const fetchMock = mockFetch(jsonResponse({ membership: { updatedAt: daysFromNow(0) } }))
      renderPanel()

      fireEvent.click(screen.getByRole("button", { name: "Registrar pago manual" }))
      const dialog = within(await screen.findByRole("dialog"))
      expect(dialog.getByText("Registrar pago manual")).toBeTruthy()
      expect(dialog.getByText(/marca la membresía de Laura Pérez como pagada/)).toBeTruthy()

      fireEvent.change(dialog.getByLabelText("Referencia (opcional)"), {
        target: { value: "  OP-555  " },
      })
      fireEvent.click(dialog.getByRole("button", { name: "Sí, registrar pago" }))

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pago manual registrado"))
      expect(fetchMock).toHaveBeenCalledWith("/api/payments/manual", expect.anything())
      expect(sentJson(fetchMock)).toEqual({
        membershipId: unpaid.id,
        method: "CASH",
        reference: "OP-555",
      })
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(screen.getByRole("tab", { name: "Pago sin confirmar (0)" })).toBeTruthy()
      expect(screen.getByRole("tab", { name: "Activas (2)" })).toBeTruthy()
    })

    it("el método se puede cambiar y no ofrece Stripe", async () => {
      const fetchMock = mockFetch(jsonResponse({ membership: { updatedAt: daysFromNow(0) } }))
      renderPanel()

      fireEvent.click(screen.getByRole("button", { name: "Registrar pago manual" }))
      const dialog = within(await screen.findByRole("dialog"))
      fireEvent.keyDown(dialog.getByLabelText("Método"), { key: "Enter" })
      await screen.findByRole("option", { name: "Yape" })
      expect(screen.queryByRole("option", { name: "Stripe" })).toBeNull()
      fireEvent.keyDown(screen.getByRole("option", { name: "Yape" }), { key: "Enter" })

      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, registrar pago" })
      )

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(sentJson(fetchMock)).toEqual({ membershipId: unpaid.id, method: "YAPE" })
    })

    it("«Cancelar» cierra sin llamar a la API", async () => {
      const fetchMock = mockFetch()
      renderPanel()

      fireEvent.click(screen.getByRole("button", { name: "Registrar pago manual" }))
      fireEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar" })
      )

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("si la API falla, avisa con su mensaje y el diálogo sigue abierto", async () => {
      mockFetch(jsonResponse({ error: "La membresía ya está pagada" }, 409))
      renderPanel()

      fireEvent.click(screen.getByRole("button", { name: "Registrar pago manual" }))
      fireEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: "Sí, registrar pago",
        })
      )

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("La membresía ya está pagada"))
      expect(screen.getByRole("dialog")).toBeTruthy()
      // Con el diálogo abierto, el resto de la página queda oculto para lectores de pantalla.
      expect(screen.getByRole("tab", { name: "Pago sin confirmar (1)", hidden: true })).toBeTruthy()
    })

    it("si se cae la conexión, avisa y deja reintentar con el diálogo abierto", async () => {
      offlineFetch()
      renderPanel()

      fireEvent.click(screen.getByRole("button", { name: "Registrar pago manual" }))
      const dialog = within(await screen.findByRole("dialog"))
      fireEvent.click(dialog.getByRole("button", { name: "Sí, registrar pago" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error de conexión"))
      expect(dialog.getByRole("button", { name: "Sí, registrar pago" })).toHaveProperty(
        "disabled",
        false
      )
    })
  })

  describe("revisar comprobante", () => {
    it("la tarjeta muestra el comprobante pendiente en lugar de «Pago sin confirmar»", () => {
      renderPanel({ pendingPayments: [receipt()] })

      const card = cardOf("Laura Pérez")
      expect(card.getByText("Comprobante pendiente")).toBeTruthy()
      expect(card.getByAltText("Comprobante de pago")).toBeTruthy()
      expect(card.queryByText("Pago sin confirmar")).toBeNull()
      expect(card.queryByRole("button", { name: "Registrar pago manual" })).toBeNull()
    })

    it("confirmar el comprobante lo quita y pasa la membresía a Activas", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      renderPanel({ pendingPayments: [receipt()] })

      fireEvent.click(screen.getByRole("button", { name: "Revisar comprobante" }))
      const dialog = within(await screen.findByRole("dialog"))
      expect(dialog.getByRole("heading", { name: "Revisar comprobante" })).toBeTruthy()
      expect(dialog.getByText(/Laura Pérez · S\/\s?100\.00/)).toBeTruthy()
      expect(dialog.getByAltText("Comprobante de pago")).toBeTruthy()

      fireEvent.click(dialog.getByRole("button", { name: "Confirmar pago" }))

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Comprobante confirmado"))
      expect(fetchMock).toHaveBeenCalledWith("/api/payments/pago-1", expect.anything())
      expect(sentJson(fetchMock)).toEqual({ action: "CONFIRM" })
      expect(screen.getByRole("tab", { name: "Activas (2)" })).toBeTruthy()
      expect(screen.queryByText("Comprobante pendiente")).toBeNull()
    })

    it("tocar la miniatura también abre la revisión", async () => {
      renderPanel({ pendingPayments: [receipt()] })

      fireEvent.click(cardOf("Laura Pérez").getByAltText("Comprobante de pago"))

      expect(await screen.findByRole("dialog")).toBeTruthy()
    })

    it("rechazar el comprobante lo quita, deja la membresía sin pagar y vuelve a ofrecer el pago manual", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      renderPanel({ pendingPayments: [receipt()] })

      fireEvent.click(screen.getByRole("button", { name: "Revisar comprobante" }))
      fireEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", { name: "Rechazar" })
      )

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Comprobante rechazado"))
      expect(sentJson(fetchMock)).toEqual({
        action: "REJECT",
        notes: "Comprobante rechazado por el administrador",
      })
      expect(screen.getByRole("tab", { name: "Pago sin confirmar (1)" })).toBeTruthy()
      expect(screen.getByRole("button", { name: "Registrar pago manual" })).toBeTruthy()
    })

    it("si la API no deja confirmar, avisa y el comprobante sigue pendiente", async () => {
      mockFetch(jsonResponse({ error: "El pago ya fue procesado" }, 409))
      renderPanel({ pendingPayments: [receipt()] })

      fireEvent.click(screen.getByRole("button", { name: "Revisar comprobante" }))
      fireEvent.click(
        within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirmar pago" })
      )

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("El pago ya fue procesado"))
      expect(screen.getByRole("tab", { name: "Pago sin confirmar (1)", hidden: true })).toBeTruthy()
      expect(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar pago" })
      ).toHaveProperty("disabled", false)
    })

    it("un pago en recepción sin captura se revisa como «Confirmar pago en recepción»", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      renderPanel({ pendingPayments: [receipt({ receiptUrl: null, method: "CASH" })] })

      const card = cardOf("Laura Pérez")
      expect(card.getByText("Pago en recepción por confirmar (efectivo)")).toBeTruthy()
      expect(card.getByText("Sin imagen")).toBeTruthy()

      fireEvent.click(card.getByRole("button", { name: "Revisar pago" }))
      const dialog = within(await screen.findByRole("dialog"))
      expect(dialog.getByRole("heading", { name: "Confirmar pago en recepción" })).toBeTruthy()
      expect(
        dialog.getByText(/no tiene captura adjunta: se paga en recepción \(efectivo\)/)
      ).toBeTruthy()

      fireEvent.click(dialog.getByRole("button", { name: "Rechazar" }))

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pago rechazado"))
      expect(sentJson(fetchMock)).toEqual({
        action: "REJECT",
        notes: "No se recibió el pago en recepción",
      })
    })

    it("un pago sin membresía asociada se muestra en la tarjeta de ese socio", () => {
      renderPanel({ pendingPayments: [receipt({ membershipId: null })] })

      expect(cardOf("Laura Pérez").getByText("Comprobante pendiente")).toBeTruthy()
    })

    it("si se cae la conexión al rechazar un pago, avisa", async () => {
      offlineFetch()
      renderPanel({ pendingPayments: [receipt({ receiptUrl: null, method: "CASH" })] })

      fireEvent.click(cardOf("Laura Pérez").getByRole("button", { name: "Revisar pago" }))
      const dialog = within(await screen.findByRole("dialog"))
      fireEvent.click(dialog.getByRole("button", { name: "Rechazar" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error de conexión"))
    })
  })

  describe("renovar", () => {
    it("pide al servidor la renovación sin mandar fechas y mueve la membresía según la respuesta", async () => {
      const fetchMock = mockFetch(
        jsonResponse({
          membership: {
            status: "ACTIVE",
            paymentConfirmed: false,
            startDate: daysFromNow(0),
            endDate: daysFromNow(30),
            updatedAt: daysFromNow(0),
          },
        })
      )
      renderPanel()
      openTab(/^Vencidas/)

      await screen.findByText("Ana Torres")
      fireEvent.click(cardOf("Ana Torres").getByRole("button", { name: "Renovar" }))

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Membresía renovada correctamente")
      )
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/memberships/${expiredByDate.id}`,
        expect.objectContaining({ method: "PATCH" })
      )
      expect(sentJson(fetchMock)).toEqual({ renew: true })
      expect(screen.getByRole("tab", { name: "Vencidas (1)" })).toBeTruthy()
      expect(screen.getByRole("tab", { name: "Pago sin confirmar (2)" })).toBeTruthy()
    })

    it("si la API no deja renovar, avisa y la membresía sigue vencida", async () => {
      mockFetch(jsonResponse({ error: "El plan ya no está activo" }, 400))
      renderPanel()
      openTab(/^Vencidas/)

      await screen.findByText("Ana Torres")
      fireEvent.click(cardOf("Ana Torres").getByRole("button", { name: "Renovar" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("El plan ya no está activo"))
      expect(screen.getByRole("tab", { name: "Vencidas (2)" })).toBeTruthy()
    })
  })

  describe("nueva membresía", () => {
    async function openNew() {
      fireEvent.click(screen.getByRole("button", { name: "Nueva membresía" }))
      return within(await screen.findByRole("dialog"))
    }

    it("no deja crear sin miembro y plan, y el plan se habilita al elegir miembro", async () => {
      renderPanel()
      const dialog = await openNew()
      const [memberSelect, planSelect] = dialog.getAllByRole("combobox")

      expect(dialog.getByRole("button", { name: "Crear membresía" })).toHaveProperty(
        "disabled",
        true
      )
      expect(planSelect).toHaveProperty("disabled", true)

      await choose(memberSelect, /Laura Pérez/)
      expect(planSelect).toHaveProperty("disabled", false)
    })

    it("solo ofrece los planes del gimnasio del miembro elegido", async () => {
      renderPanel()
      const dialog = await openNew()
      const [memberSelect, planSelect] = dialog.getAllByRole("combobox")

      await choose(memberSelect, /Pedro Gil/)
      fireEvent.keyDown(planSelect, { key: "Enter" })

      expect(await screen.findByRole("option", { name: /Trimestral Sur/ })).toBeTruthy()
      expect(screen.queryByRole("option", { name: /Mensual/ })).toBeNull()
    })

    it("crea la membresía con pago pendiente y la agrega a «Pago sin confirmar»", async () => {
      const fetchMock = mockFetch(
        jsonResponse({
          membership: membership({ id: "m-nueva", userId: "socio-1", paymentMethod: "CASH" }),
        })
      )
      renderPanel({ memberships: [] })
      const dialog = await openNew()
      const [memberSelect, planSelect] = dialog.getAllByRole("combobox")

      await choose(memberSelect, /Laura Pérez/)
      await choose(planSelect, /Mensual/)
      fireEvent.change(dialog.getByLabelText("Referencia (opcional)"), {
        target: { value: "REC-9" },
      })
      fireEvent.click(dialog.getByRole("button", { name: "Crear membresía" }))

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Membresía creada; queda con pago pendiente")
      )
      expect(fetchMock).toHaveBeenCalledWith("/api/memberships", expect.anything())
      expect(sentJson(fetchMock)).toEqual({
        userId: "socio-1",
        planId: "plan-mensual",
        paymentMethod: "CASH",
        paymentRef: "REC-9",
      })
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(screen.getByRole("tab", { name: "Pago sin confirmar (1)" })).toBeTruthy()
      expect(screen.getByText("Laura Pérez")).toBeTruthy()
    })

    it("si la API rechaza, muestra el error dentro del diálogo", async () => {
      mockFetch(jsonResponse({ error: "El miembro ya tiene una membresía activa" }, 409))
      renderPanel()
      const dialog = await openNew()
      const [memberSelect, planSelect] = dialog.getAllByRole("combobox")

      await choose(memberSelect, /Laura Pérez/)
      await choose(planSelect, /Mensual/)
      fireEvent.click(dialog.getByRole("button", { name: "Crear membresía" }))

      expect(await dialog.findByText("El miembro ya tiene una membresía activa")).toBeTruthy()
      expect(dialog.getByRole("button", { name: "Crear membresía" })).toHaveProperty(
        "disabled",
        false
      )
    })

    it.todo(
      "«Nueva membresía» ofrece «Stripe» como método de pago aunque «Registrar pago manual» lo " +
        "oculta; ¿debería poder elegirse al crearla a mano? (membership-panel.tsx:810 frente a :718)"
    )
    it("si se cae la conexión al crearla, lo dice en el diálogo y deja reintentar", async () => {
      offlineFetch()
      renderPanel()
      const dialog = await openNew()
      const [memberSelect, planSelect] = dialog.getAllByRole("combobox")

      await choose(memberSelect, /Laura Pérez/)
      await choose(planSelect, /Mensual/)
      fireEvent.click(dialog.getByRole("button", { name: "Crear membresía" }))

      expect(await dialog.findByText("Error de conexión")).toBeTruthy()
      expect(dialog.getByRole("button", { name: "Crear membresía" })).toHaveProperty(
        "disabled",
        false
      )
    })
  })
})
