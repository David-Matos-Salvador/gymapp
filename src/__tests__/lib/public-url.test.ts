import { describe, it, expect } from "vitest"
import { buildInviteUrl, publicOrigin } from "@/lib/public-url"

// Así llega el request detrás del proxy: con la dirección interna del contenedor.
const internalRequest = new Request("https://0.0.0.0:3000/api/trainer/invites")

describe("publicOrigin", () => {
  it("usa la URL pública configurada y no la interna del contenedor", () => {
    expect(publicOrigin(internalRequest, { AUTH_URL: "https://gym.example.com" })).toBe(
      "https://gym.example.com"
    )
  })

  it("usa NEXT_PUBLIC_APP_URL cuando no hay AUTH_URL", () => {
    expect(
      publicOrigin(internalRequest, {
        AUTH_URL: "",
        NEXT_PUBLIC_APP_URL: "https://gym.example.com/",
      })
    ).toBe("https://gym.example.com")
  })

  it("se queda solo con el origen si la URL configurada trae una ruta", () => {
    expect(publicOrigin(internalRequest, { AUTH_URL: "https://gym.example.com/api/auth" })).toBe(
      "https://gym.example.com"
    )
  })

  it("cae en la URL del request si no hay ninguna configurada o es inválida", () => {
    const local = new Request("http://localhost:3000/api/trainer/invites")
    expect(publicOrigin(local, {})).toBe("http://localhost:3000")
    expect(publicOrigin(local, { AUTH_URL: "no-es-una-url" })).toBe("http://localhost:3000")
  })
})

describe("buildInviteUrl", () => {
  it("arma el enlace de invitación con el origen dado", () => {
    expect(buildInviteUrl("https://gym.example.com", "abc123")).toBe(
      "https://gym.example.com/invite/abc123"
    )
  })
})
