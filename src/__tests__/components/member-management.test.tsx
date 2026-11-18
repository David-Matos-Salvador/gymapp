// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { jsonResponse, mockFetch, sentJson } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn() }) }))

import { MemberManagement, type MemberItem } from "@/components/admin/member-management"
import { TrainerPanel } from "@/components/admin/trainer-panel"

const members: MemberItem[] = [
  {
    id: "u-1",
    name: "Laura Pérez",
    email: "laura@example.com",
    assignedTrainer: { name: "Diego" },
  },
  { id: "u-2", name: null, email: "carlos@example.com", assignedTrainer: null },
]

function openCreate() {
  fireEvent.click(screen.getByRole("button", { name: "Nuevo miembro" }))
  return screen.findByRole("dialog").then((dialog) => within(dialog))
}

function fill(dialog: ReturnType<typeof within>, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(dialog.getByLabelText(label), { target: { value } })
  }
}

describe("MemberManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("lista los miembros con su coach; sin nombre ni coach lo dice", () => {
    render(<MemberManagement initialMembers={members} canManage />)

    expect(screen.getByText("Laura Pérez")).toBeTruthy()
    expect(screen.getByText("Diego")).toBeTruthy()
    expect(screen.getByText("Sin nombre")).toBeTruthy()
    expect(screen.getByText("Sin coach")).toBeTruthy()
  })

  it("quien no puede administrar ve el directorio pero no «Nuevo miembro»", () => {
    render(<MemberManagement initialMembers={members} canManage={false} />)

    expect(screen.getByText("Laura Pérez")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Nuevo miembro" })).toBeNull()
  })

  it("el buscador filtra por nombre o correo y avisa si no hay coincidencias", () => {
    render(<MemberManagement initialMembers={members} canManage />)
    const search = screen.getByPlaceholderText("Buscar por nombre o correo...")

    fireEvent.change(search, { target: { value: "CARLOS" } })
    expect(screen.queryByText("Laura Pérez")).toBeNull()
    expect(screen.getByText("carlos@example.com")).toBeTruthy()

    fireEvent.change(search, { target: { value: "zzz" } })
    expect(screen.getByText("No hay miembros que coincidan")).toBeTruthy()
  })

  it("no envía el alta si falta nombre, correo o contraseña", async () => {
    const fetchMock = mockFetch()
    render(<MemberManagement initialMembers={members} canManage />)
    const dialog = await openCreate()

    fill(dialog, { Nombre: "Pedro", Correo: "pedro@example.com" })
    fireEvent.click(dialog.getByRole("button", { name: "Crear miembro" }))

    expect(dialog.getByText("Completa nombre, correo y contraseña inicial")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("crea el miembro sin espacios de más, lo agrega primero y cierra el diálogo", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ user: { id: "u-3", name: "Pedro Gil", email: "pedro@example.com" } })
    )
    render(<MemberManagement initialMembers={members} canManage />)
    const dialog = await openCreate()

    fill(dialog, {
      Nombre: "  Pedro Gil ",
      Correo: " pedro@example.com ",
      "Teléfono (opcional)": "   ",
      "Contraseña inicial": "Clave1234",
    })
    fireEvent.click(dialog.getByRole("button", { name: "Crear miembro" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Miembro creado"))
    expect(fetchMock).toHaveBeenCalledWith("/api/trainer/members", expect.anything())
    expect(sentJson(fetchMock)).toEqual({
      name: "Pedro Gil",
      email: "pedro@example.com",
      password: "Clave1234",
    })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const names = screen.getAllByText(/^(Pedro Gil|Laura Pérez|Sin nombre)$/)
    expect(names[0].textContent).toBe("Pedro Gil")
  })

  it("si la API rechaza el alta, muestra su mensaje en el diálogo", async () => {
    mockFetch(jsonResponse({ error: "Ese correo ya está registrado" }, 409))
    render(<MemberManagement initialMembers={members} canManage />)
    const dialog = await openCreate()

    fill(dialog, {
      Nombre: "Laura",
      Correo: "laura@example.com",
      "Contraseña inicial": "Clave1234",
    })
    fireEvent.click(dialog.getByRole("button", { name: "Crear miembro" }))

    expect(await dialog.findByText("Ese correo ya está registrado")).toBeTruthy()
    expect(dialog.getByRole("button", { name: "Crear miembro" })).toHaveProperty("disabled", false)
  })

  it("al reabrir el diálogo, el formulario y el error empiezan de cero", async () => {
    render(<MemberManagement initialMembers={members} canManage />)
    let dialog = await openCreate()
    fill(dialog, { Nombre: "Pedro" })
    fireEvent.click(dialog.getByRole("button", { name: "Crear miembro" }))
    fireEvent.click(dialog.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    dialog = await openCreate()
    expect(dialog.getByLabelText("Nombre")).toHaveProperty("value", "")
    expect(dialog.queryByText("Completa nombre, correo y contraseña inicial")).toBeNull()
  })

  it.todo(
    "si se cae la conexión al crear el miembro, avisa y deja reintentar " +
      "(hoy `handleCreate` no tiene try/catch: «Crear miembro» queda deshabilitado y sin aviso; " +
      "member-management.tsx:69)"
  )
})

describe("TrainerPanel", () => {
  it("lista los coaches con su cantidad de clientes, en singular o plural", () => {
    render(
      <TrainerPanel
        trainers={[
          { id: "t-1", name: "Diego", email: "diego@example.com", clientCount: 1 },
          { id: "t-2", name: null, email: "ana@example.com", clientCount: 0 },
        ]}
      />
    )

    expect(screen.getByText("Diego")).toBeTruthy()
    expect(screen.getByText("1 cliente")).toBeTruthy()
    expect(screen.getByText("Sin nombre")).toBeTruthy()
    expect(screen.getByText("0 clientes")).toBeTruthy()
  })

  it("sin coaches lo dice", () => {
    render(<TrainerPanel trainers={[]} />)

    expect(screen.getByText("No hay coaches en este gimnasio")).toBeTruthy()
  })
})
