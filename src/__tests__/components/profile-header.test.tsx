// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

import { ProfileHeader } from "@/components/profile/profile-header"

type User = Parameters<typeof ProfileHeader>[0]["user"]

const member: User = {
  id: "u1",
  name: "Ana Pérez",
  email: "ana@example.com",
  role: "MEMBER",
  sex: "FEMALE",
  birthDate: "1995-04-10",
  objective: "MUSCLE_GAIN",
  experienceLevel: "INTERMEDIATE",
  medicalNotes: null,
  emergencyContact: null,
  emergencyPhone: null,
  phone: "999888777",
  image: null,
  bio: null,
  createdAt: "2026-11-10T12:00:00.000Z",
}

describe("ProfileHeader", () => {
  it("muestra el primer nombre, el correo, el rol y la antigüedad", () => {
    render(<ProfileHeader user={member} />)

    expect(screen.getByRole("heading", { name: "Ana" })).toBeTruthy()
    expect(screen.getByText("ana@example.com")).toBeTruthy()
    expect(screen.getByText("Miembro")).toBeTruthy()
    expect(screen.getByText(/Miembro desde noviembre.*2026/)).toBeTruthy()
    expect(screen.getByText("Intermedio")).toBeTruthy()
  })

  it("al miembro con datos pendientes le muestra el porcentaje y dónde completarlos", () => {
    render(<ProfileHeader user={member} />)

    expect(screen.getByText("Perfil completado")).toBeTruthy()
    // 6 de 8 campos del miembro
    expect(screen.getByText("75%")).toBeTruthy()
    expect(screen.getByText("Completa tus datos en «Editar información», más abajo")).toBeTruthy()
  })

  it("con el perfil completo ya no pide completar datos", () => {
    render(
      <ProfileHeader
        user={{ ...member, emergencyContact: "Luis Pérez", emergencyPhone: "988777666" }}
      />
    )

    expect(screen.getByText("100%")).toBeTruthy()
    expect(screen.queryByText(/Completa tus datos/)).toBeNull()
  })

  it("el admin no tiene barra de perfil completado", () => {
    render(<ProfileHeader user={{ ...member, role: "ADMIN" }} />)

    expect(screen.getByText("Administrador")).toBeTruthy()
    expect(screen.queryByText("Perfil completado")).toBeNull()
  })

  it("sin nombre ni nivel, saluda como «Atleta» y no muestra el nivel", () => {
    render(<ProfileHeader user={{ ...member, name: null, experienceLevel: null }} />)

    expect(screen.getByRole("heading", { name: "Atleta" })).toBeTruthy()
    expect(screen.queryByText("Intermedio")).toBeNull()
  })

  it("un rol desconocido se muestra tal cual", () => {
    render(<ProfileHeader user={{ ...member, role: "GUEST" }} />)

    expect(screen.getByText("GUEST")).toBeTruthy()
  })
})
