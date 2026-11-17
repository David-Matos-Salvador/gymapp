// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { LucideIcon } from "lucide-react"
import { Dumbbell } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { StatCard } from "@/components/ui/stat-card"

const FakeIcon = ((props: Record<string, unknown>) => (
  <svg data-testid="icono" {...props} />
)) as unknown as LucideIcon

describe("Badge", () => {
  it("muestra su texto con la variante por defecto", () => {
    render(<Badge>Miembro</Badge>)

    expect(screen.getByText("Miembro").className).toContain("bg-primary")
  })

  it("aplica la variante y suma las clases extra", () => {
    render(
      <Badge variant="destructive" className="mt-1">
        Vencida
      </Badge>
    )

    const badge = screen.getByText("Vencida")
    expect(badge.className).toContain("bg-destructive")
    expect(badge.className).toContain("mt-1")
  })
})

describe("EmptyState", () => {
  it("muestra el mensaje con un ícono por defecto", () => {
    const { container } = render(<EmptyState message="Todavía no tienes pagos registrados." />)

    expect(screen.getByText("Todavía no tienes pagos registrados.")).toBeTruthy()
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("acepta otro ícono y clases extra", () => {
    const { container } = render(
      <EmptyState icon={FakeIcon} message="Sin clases esta semana." className="py-2" />
    )

    expect(screen.getByTestId("icono")).toBeTruthy()
    expect((container.firstChild as HTMLElement).className).toContain("py-2")
  })
})

describe("StatCard", () => {
  it("muestra etiqueta, valor y sufijo", () => {
    render(<StatCard label="Entrenamientos" value={12} suffix="este mes" icon={Dumbbell} />)

    expect(screen.getByText("Entrenamientos")).toBeTruthy()
    expect(screen.getByText("12")).toBeTruthy()
    expect(screen.getByText("este mes")).toBeTruthy()
  })

  it("si recibe contenido propio, lo muestra en lugar del valor", () => {
    render(
      <StatCard label="Membresía" value={99} icon={Dumbbell}>
        <p>Activa hasta el 30/11</p>
      </StatCard>
    )

    expect(screen.getByText("Activa hasta el 30/11")).toBeTruthy()
    expect(screen.queryByText("99")).toBeNull()
  })

  it("con href es un enlace", () => {
    render(<StatCard label="Rutinas" value={3} icon={Dumbbell} href="/rutinas" />)

    expect(screen.getByRole("link").getAttribute("href")).toBe("/rutinas")
  })

  it("sin href no es enlace y onClick responde al tocar la tarjeta", () => {
    const onClick = vi.fn()
    render(<StatCard label="Check-ins" value={4} icon={Dumbbell} onClick={onClick} />)

    expect(screen.queryByRole("link")).toBeNull()
    fireEvent.click(screen.getByText("Check-ins"))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
