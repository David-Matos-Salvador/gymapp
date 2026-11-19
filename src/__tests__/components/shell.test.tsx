// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { jsonResponse } from "./helpers"

type Role = "MEMBER" | "TRAINER" | "ADMIN" | "SUPER_ADMIN"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
const nav = vi.hoisted(() => ({ pathname: "/dashboard" }))
const auth = vi.hoisted(() => ({ role: null as Role | null }))
const realtime = vi.hoisted(() => ({ handler: null as null | ((type: string) => void) }))
const play = vi.hoisted(() => vi.fn())

vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => nav.pathname,
}))
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: auth.role ? { id: "u-1", name: "Laura", role: auth.role } : null,
    isAdmin: auth.role === "ADMIN",
    isSuperAdmin: auth.role === "SUPER_ADMIN",
    isTrainer: auth.role === "TRAINER",
    isMember: auth.role === "MEMBER",
  }),
}))
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play }) }))
vi.mock("@/hooks/use-realtime", () => ({
  useRealtime: (handler: (type: string) => void) => {
    realtime.handler = handler
  },
}))
vi.mock("framer-motion", () => {
  const MockDiv = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  )
  const MockPresence = ({ children }: { children?: React.ReactNode }) => children
  return { motion: { div: MockDiv }, AnimatePresence: MockPresence }
})
// La campana y la lista ya tienen sus pruebas: aquí solo importa qué les pasa el menú.
vi.mock("@/components/notifications", () => ({
  NotificationBell: ({
    unreadCount,
    children,
  }: {
    unreadCount: number
    children?: React.ReactNode
  }) => (
    <div>
      <span data-testid="unread">{unreadCount}</span>
      {children}
    </div>
  ),
  NotificationList: ({
    notifications,
    onMarkRead,
    onMarkAllRead,
    onNavigate,
  }: {
    notifications: { id: string; title: string }[]
    onMarkRead: (id: string) => void
    onMarkAllRead: () => void
    onNavigate: (n: unknown) => void
  }) => (
    <ul>
      {notifications.map((n) => (
        <li key={n.id}>
          {n.title}
          <button onClick={() => onMarkRead(n.id)}>Leer {n.title}</button>
          <button onClick={() => onNavigate(n)}>Abrir {n.title}</button>
        </li>
      ))}
      <button onClick={onMarkAllRead}>Marcar todas</button>
    </ul>
  ),
}))
vi.mock("@/components/notifications/trainer-request-dialog", () => ({
  TrainerRequestDialog: ({ requestId }: { requestId: string | null }) =>
    requestId ? <div role="dialog">Solicitud {requestId}</div> : null,
}))

import { AppBottomNav, AppShell } from "@/components/layout/shell"

function notification(overrides: Record<string, unknown> & { id: string; title: string }) {
  return {
    message: "",
    type: "INFO",
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/** Etiquetas del menú inferior, en orden. */
function menuLabels() {
  return within(screen.getByRole("navigation"))
    .getAllByRole("link")
    .map((link) => ({
      label: link.textContent?.replace(/\d+\+?$/, ""),
      href: link.getAttribute("href"),
    }))
}

/** Responde a la campana y al contador de comprobantes según la dirección. */
function routeFetch(routes: Record<string, Response>) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async (url) => routes[url] ?? jsonResponse({}, 404)
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("AppBottomNav: menú por perfil", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    nav.pathname = "/dashboard"
  })

  it("el miembro ve su rutina, progreso y membresía, sin opciones de coach ni de admin", () => {
    auth.role = "MEMBER"
    render(<AppBottomNav />)

    expect(menuLabels()).toEqual([
      { label: "Inicio", href: "/dashboard" },
      { label: "Mi Rutina", href: "/my-routine" },
      { label: "Progreso", href: "/progress" },
      { label: "Membresía", href: "/membresia" },
      { label: "Clases", href: "/classes" },
      { label: "Perfil", href: "/profile" },
    ])
  })

  it("el coach ve sus clientes, su agenda y los comprobantes, sin rutina ni admin", () => {
    auth.role = "TRAINER"
    render(<AppBottomNav />)

    expect(menuLabels()).toEqual([
      { label: "Inicio", href: "/dashboard" },
      { label: "Clases", href: "/classes" },
      { label: "Clientes", href: "/coach/clients" },
      { label: "Agenda", href: "/coach/schedule" },
      { label: "Comprobantes", href: "/coach/payments" },
      { label: "Perfil", href: "/profile" },
    ])
  })

  it("el admin ve la gestión del gimnasio, membresías y comprobantes, sin clientes ni agenda", () => {
    auth.role = "ADMIN"
    render(<AppBottomNav />)

    expect(menuLabels()).toEqual([
      { label: "Inicio", href: "/dashboard" },
      { label: "Clases", href: "/classes" },
      { label: "Admin", href: "/admin/gym-management" },
      { label: "Membresías", href: "/admin/memberships" },
      { label: "Comprobantes", href: "/coach/payments" },
      { label: "Perfil", href: "/profile" },
    ])
  })

  it("el súper admin ve lo mismo que el admin", () => {
    auth.role = "SUPER_ADMIN"
    render(<AppBottomNav />)

    expect(menuLabels().map((item) => item.label)).toEqual([
      "Inicio",
      "Clases",
      "Admin",
      "Membresías",
      "Comprobantes",
      "Perfil",
    ])
  })

  it("mientras carga la sesión solo muestra lo común a todos", () => {
    auth.role = null
    render(<AppBottomNav />)

    expect(menuLabels().map((item) => item.label)).toEqual(["Inicio", "Clases", "Perfil"])
  })

  it("resalta la opción de la página actual, también en sus subpáginas", () => {
    auth.role = "TRAINER"
    nav.pathname = "/coach/clients/u-9"
    render(<AppBottomNav />)

    const nav$ = within(screen.getByRole("navigation"))
    expect(nav$.getByRole("link", { name: "Clientes" }).className).toContain("text-accent-yellow")
    expect(nav$.getByRole("link", { name: "Inicio" }).className).not.toContain("text-accent-yellow")
  })

  it("muestra los comprobantes pendientes y corta en 99+", () => {
    auth.role = "ADMIN"
    const { rerender } = render(<AppBottomNav pendingCount={3} />)
    expect(screen.getByRole("link", { name: /Comprobantes/ }).textContent).toBe("Comprobantes3")

    rerender(<AppBottomNav pendingCount={150} />)
    expect(screen.getByRole("link", { name: /Comprobantes/ }).textContent).toBe("Comprobantes99+")

    rerender(<AppBottomNav pendingCount={0} />)
    expect(screen.getByRole("link", { name: /Comprobantes/ }).textContent).toBe("Comprobantes")
  })

  it("suena al tocar una opción", () => {
    auth.role = "MEMBER"
    render(<AppBottomNav />)

    fireEvent.click(screen.getByRole("link", { name: "Clases" }))

    expect(play).toHaveBeenCalledWith("click")
  })
})

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    nav.pathname = "/dashboard"
    realtime.handler = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ["MEMBER", "Miembro"],
    ["TRAINER", "Coach"],
    ["ADMIN", "Admin"],
    ["SUPER_ADMIN", "Súper Admin"],
  ] as const)("con perfil %s muestra la etiqueta «%s» en la cabecera", (role, chip) => {
    auth.role = role
    routeFetch({ "/api/notifications": jsonResponse({ notifications: [] }) })
    render(<AppShell>contenido</AppShell>)

    expect(within(screen.getByRole("banner")).getByText(chip)).toBeTruthy()
    expect(screen.getByText("contenido")).toBeTruthy()
    expect(screen.getByRole("navigation")).toBeTruthy()
  })

  it("en modo inmersivo muestra solo el contenido, sin cabecera ni menú", () => {
    auth.role = "MEMBER"
    routeFetch({})
    render(<AppShell immersive>entrenando</AppShell>)

    expect(screen.getByText("entrenando")).toBeTruthy()
    expect(screen.queryByRole("banner")).toBeNull()
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it("el miembro no pide el contador de comprobantes", async () => {
    auth.role = "MEMBER"
    const fetchMock = routeFetch({ "/api/notifications": jsonResponse({ notifications: [] }) })
    render(<AppShell>contenido</AppShell>)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/notifications"))
    expect(fetchMock).not.toHaveBeenCalledWith("/api/payments/pending-count")
  })

  it.each(["TRAINER", "ADMIN", "SUPER_ADMIN"] as const)(
    "con perfil %s pone en el menú los comprobantes pendientes",
    async (role) => {
      auth.role = role
      routeFetch({
        "/api/notifications": jsonResponse({ notifications: [] }),
        "/api/payments/pending-count": jsonResponse({ count: 4 }),
      })
      render(<AppShell>contenido</AppShell>)

      await waitFor(() =>
        expect(screen.getByRole("link", { name: /Comprobantes/ }).textContent).toBe("Comprobantes4")
      )
    }
  )

  it("cuenta las notificaciones sin leer", async () => {
    auth.role = "MEMBER"
    routeFetch({
      "/api/notifications": jsonResponse({
        notifications: [
          notification({ id: "n1", title: "Pago confirmado" }),
          notification({ id: "n2", title: "Clase mañana", read: true }),
          notification({ id: "n3", title: "Nueva rutina" }),
        ],
      }),
    })
    render(<AppShell>contenido</AppShell>)

    await waitFor(() => expect(screen.getByTestId("unread").textContent).toBe("2"))
  })

  it("marcar una como leída baja el contador y avisa a la API", async () => {
    auth.role = "MEMBER"
    const fetchMock = routeFetch({
      "/api/notifications": jsonResponse({
        notifications: [notification({ id: "n1", title: "Pago confirmado" })],
      }),
      "/api/notifications/n1": jsonResponse({ ok: true }),
    })
    render(<AppShell>contenido</AppShell>)
    await waitFor(() => expect(screen.getByTestId("unread").textContent).toBe("1"))

    fireEvent.click(screen.getByRole("button", { name: "Leer Pago confirmado" }))

    expect(screen.getByTestId("unread").textContent).toBe("0")
    expect(fetchMock).toHaveBeenCalledWith("/api/notifications/n1", { method: "PATCH" })
  })

  it("marcar todas como leídas avisa a la API solo por las que faltaban", async () => {
    auth.role = "MEMBER"
    const fetchMock = routeFetch({
      "/api/notifications": jsonResponse({
        notifications: [
          notification({ id: "n1", title: "Uno" }),
          notification({ id: "n2", title: "Dos", read: true }),
          notification({ id: "n3", title: "Tres" }),
        ],
      }),
      "/api/notifications/n1": jsonResponse({ ok: true }),
      "/api/notifications/n3": jsonResponse({ ok: true }),
    })
    render(<AppShell>contenido</AppShell>)
    await waitFor(() => expect(screen.getByTestId("unread").textContent).toBe("2"))

    fireEvent.click(screen.getByRole("button", { name: "Marcar todas" }))

    expect(screen.getByTestId("unread").textContent).toBe("0")
    const patched = fetchMock.mock.calls
      .filter(([, init]) => (init as RequestInit | undefined)?.method === "PATCH")
      .map(([url]) => url)
    expect(patched).toEqual(["/api/notifications/n1", "/api/notifications/n3"])
  })

  it("si se cae la conexión al marcar como leída, avisa", async () => {
    auth.role = "MEMBER"
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/notifications")
        return jsonResponse({ notifications: [notification({ id: "n1", title: "Uno" })] })
      throw new TypeError("Failed to fetch")
    })
    vi.stubGlobal("fetch", fetchMock)
    render(<AppShell>contenido</AppShell>)
    await waitFor(() => expect(screen.getByTestId("unread").textContent).toBe("1"))

    fireEvent.click(screen.getByRole("button", { name: "Leer Uno" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error al marcar como leída"))
  })

  it.todo(
    "si la API responde con error (500) al marcar como leída, no avisa y la notificación queda " +
      "como leída en pantalla aunque no se guardó: solo hay `catch` para la caída de conexión, " +
      "no se mira `res.ok` (shell.tsx:181 y :193)"
  )

  it("una notificación de pago lleva al miembro a su membresía", async () => {
    auth.role = "MEMBER"
    routeFetch({
      "/api/notifications": jsonResponse({
        notifications: [notification({ id: "n1", title: "Pago", type: "PAYMENT" })],
      }),
    })
    render(<AppShell>contenido</AppShell>)

    fireEvent.click(await screen.findByRole("button", { name: "Abrir Pago" }))

    expect(router.push).toHaveBeenCalledWith("/membresia")
  })

  it.each(["TRAINER", "ADMIN", "SUPER_ADMIN"] as const)(
    "una notificación de pago lleva al perfil %s a la bandeja de comprobantes",
    async (role) => {
      auth.role = role
      routeFetch({
        "/api/notifications": jsonResponse({
          notifications: [notification({ id: "n1", title: "Pago", type: "PAYMENT" })],
        }),
        "/api/payments/pending-count": jsonResponse({ count: 1 }),
      })
      render(<AppShell>contenido</AppShell>)

      fireEvent.click(await screen.findByRole("button", { name: "Abrir Pago" }))

      expect(router.push).toHaveBeenCalledWith("/coach/payments")
    }
  )

  it("una solicitud de coach abre el diálogo de la solicitud sin cambiar de página", async () => {
    auth.role = "TRAINER"
    routeFetch({
      "/api/notifications": jsonResponse({
        notifications: [
          notification({
            id: "n1",
            title: "Solicitud",
            type: "TRAINER_REQUEST",
            metadata: { requestId: "req-7" },
          }),
        ],
      }),
      "/api/payments/pending-count": jsonResponse({ count: 0 }),
    })
    render(<AppShell>contenido</AppShell>)
    expect(screen.queryByRole("dialog")).toBeNull()

    fireEvent.click(await screen.findByRole("button", { name: "Abrir Solicitud" }))

    expect(screen.getByRole("dialog").textContent).toBe("Solicitud req-7")
    expect(router.push).not.toHaveBeenCalled()
  })

  it("el aviso en tiempo real de comprobantes vuelve a pedir el contador", async () => {
    auth.role = "ADMIN"
    let pending = 1
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/notifications"
          ? jsonResponse({ notifications: [] })
          : jsonResponse({ count: pending })
      )
    )
    render(<AppShell>contenido</AppShell>)
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Comprobantes/ }).textContent).toBe("Comprobantes1")
    )

    pending = 5
    act(() => realtime.handler?.("pending-count"))

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Comprobantes/ }).textContent).toBe("Comprobantes5")
    )
  })

  it.todo(
    "no hay menú propio para escritorio: en todas las pantallas se usa la misma barra inferior " +
      "fija; con 6 opciones por perfil, confirmar con David si en escritorio debería haber una " +
      "barra lateral (shell.tsx:296)"
  )
})
