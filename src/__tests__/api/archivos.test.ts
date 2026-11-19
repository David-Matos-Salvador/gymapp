import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const userUpdate = vi.fn()
  const photoFindMany = vi.fn()
  const photoFindUnique = vi.fn()
  const photoCreate = vi.fn()
  const photoDelete = vi.fn()
  return {
    userFindUnique,
    userUpdate,
    photoFindMany,
    photoFindUnique,
    photoCreate,
    photoDelete,
    readStoredFile: vi.fn(),
    saveFile: vi.fn(),
    rateLimit: vi.fn(),
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    prisma: {
      user: { findUnique: userFindUnique, update: userUpdate },
      progressPhoto: {
        findMany: photoFindMany,
        findUnique: photoFindUnique,
        create: photoCreate,
        delete: photoDelete,
      },
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
vi.mock("@/lib/logger", () => ({ logger: mocks.logger }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }))
vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>()
  return { ...actual, readStoredFile: mocks.readStoredFile, saveFile: mocks.saveFile }
})

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      })
      Object.defineProperty(response, "json", { value: async () => body })
      return response
    }),
  },
}))

import { GET as getFile } from "@/app/api/files/[...key]/route"
import { POST as upload } from "@/app/api/upload/route"
import { GET as listPhotos, POST as createPhoto } from "@/app/api/progress-photos/route"
import { DELETE as deletePhoto } from "@/app/api/progress-photos/[id]/route"

const member = { id: "member-1", email: "ana@test.com", role: "MEMBER", gymId: "gym-1" }
const otherMember = { id: "member-2", email: "beto@test.com", role: "MEMBER", gymId: "gym-2" }

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

function sessionAs(user: { email: string } | null) {
  mockAuth.mockResolvedValue(user ? { user: { email: user.email } } : null)
}

function usersInDb(...users: Array<{ id: string; email: string }>) {
  mocks.userFindUnique.mockImplementation(
    async ({ where }: { where: { email?: string; id?: string } }) =>
      users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null
  )
}

function fileRequest(key: string) {
  return getFile(new Request(`http://localhost/api/files/${key}`), {
    params: Promise.resolve({ key: key.split("/") }),
  })
}

function uploadRequest(file: File | null, type?: string) {
  const form = new FormData()
  if (file) form.append("file", file)
  if (type) form.append("type", type)
  return new Request("http://localhost/api/upload", { method: "POST", body: form })
}

function jsonRequest(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.rateLimit.mockResolvedValue(true)
})

// ---------------------------------------------------------------------------
// GET /api/files/[...key]
// ---------------------------------------------------------------------------

describe("GET /api/files/[...key]", () => {
  it("responde 404 a una ruta con `..` sin leer el almacenamiento", async () => {
    const res = await fileRequest("receipts/../../etc/passwd")
    expect(res.status).toBe(404)
    expect(mocks.readStoredFile).not.toHaveBeenCalled()
  })

  it("los comprobantes de pago piden sesión (401)", async () => {
    sessionAs(null)
    const res = await fileRequest("receipts/123-abc.jpg")
    expect(res.status).toBe(401)
    expect(mocks.readStoredFile).not.toHaveBeenCalled()
  })

  it("con sesión devuelve el comprobante con caché privada", async () => {
    sessionAs(member)
    mocks.readStoredFile.mockResolvedValue({ body: PNG, contentType: "image/png" })
    const res = await fileRequest("receipts/123-abc.png")
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/png")
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=3600")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })

  it("las fotos de perfil son públicas y se guardan en caché", async () => {
    sessionAs(null)
    mocks.readStoredFile.mockResolvedValue({ body: PNG, contentType: "image/png" })
    const res = await fileRequest("profiles/123-abc.png")
    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toContain("public")
    expect(mockAuth).not.toHaveBeenCalled()
  })

  it("responde 404 si el archivo no existe", async () => {
    mocks.readStoredFile.mockResolvedValue(null)
    const res = await fileRequest("profiles/nada.png")
    expect(res.status).toBe(404)
  })

  it("responde 500 si falla la lectura", async () => {
    mocks.readStoredFile.mockRejectedValue(new Error("s3 caído"))
    const res = await fileRequest("profiles/123.png")
    expect(res.status).toBe(500)
    expect(mocks.logger.error).toHaveBeenCalled()
  })

  it.todo(
    "cualquier persona con sesión (de cualquier gimnasio y rol) puede abrir el comprobante de pago de otra si conoce la ruta; no se comprueba que el comprobante sea suyo o de su gimnasio"
  )
})

// ---------------------------------------------------------------------------
// POST /api/upload
// ---------------------------------------------------------------------------

describe("POST /api/upload", () => {
  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await upload(uploadRequest(new File([PNG], "a.png", { type: "image/png" })))
    expect(res.status).toBe(401)
  })

  it("responde 404 si el usuario de la sesión no existe", async () => {
    sessionAs(member)
    usersInDb()
    const res = await upload(uploadRequest(new File([PNG], "a.png", { type: "image/png" })))
    expect(res.status).toBe(404)
  })

  it("responde 429 si se pasa del límite de subidas", async () => {
    sessionAs(member)
    usersInDb(member)
    mocks.rateLimit.mockResolvedValue(false)
    const res = await upload(uploadRequest(new File([PNG], "a.png", { type: "image/png" })))
    expect(res.status).toBe(429)
    expect(mocks.rateLimit).toHaveBeenCalledWith("upload:member-1", 30, 60)
    expect(mocks.saveFile).not.toHaveBeenCalled()
  })

  it("responde 400 sin archivo, con un formato no permitido o si el contenido no es una imagen", async () => {
    sessionAs(member)
    usersInDb(member)
    expect((await upload(uploadRequest(null))).status).toBe(400)
    const pdf = new File([PNG], "a.pdf", { type: "application/pdf" })
    expect((await upload(uploadRequest(pdf))).status).toBe(400)
    const fake = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], "a.png", {
      type: "image/png",
    })
    const res = await upload(uploadRequest(fake))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("El archivo no es una imagen válida")
    expect(mocks.saveFile).not.toHaveBeenCalled()
  })

  it("responde 400 si pasa de 5 MB", async () => {
    sessionAs(member)
    usersInDb(member)
    const big = new Uint8Array(5 * 1024 * 1024 + 1)
    big.set(PNG)
    const res = await upload(uploadRequest(new File([big], "a.png", { type: "image/png" })))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain("5 MB")
  })

  it("sube una foto de perfil y la guarda solo en el usuario de la sesión", async () => {
    sessionAs(member)
    usersInDb(member)
    const res = await upload(
      uploadRequest(new File([PNG], "a.png", { type: "image/png" }), "profile")
    )
    expect(res.status).toBe(200)
    const { url } = await res.json()
    expect(url).toMatch(/^\/api\/files\/profiles\/\d+-[a-z0-9]+\.png$/)
    expect(mocks.saveFile).toHaveBeenCalledWith(url.replace("/api/files/", ""), PNG, "image/png")
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { image: url },
    })
  })

  it("un tipo desconocido va a la carpeta general y no toca el perfil; nunca a comprobantes", async () => {
    sessionAs(member)
    usersInDb(member)
    const res = await upload(
      uploadRequest(new File([PNG], "a.png", { type: "image/png" }), "receipts")
    )
    expect(res.status).toBe(200)
    expect((await res.json()).url).toMatch(/^\/api\/files\/general\//)
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it("responde 500 si falla el guardado", async () => {
    sessionAs(member)
    usersInDb(member)
    mocks.saveFile.mockRejectedValue(new Error("disco lleno"))
    const res = await upload(uploadRequest(new File([PNG], "a.png", { type: "image/png" })))
    expect(res.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// /api/progress-photos
// ---------------------------------------------------------------------------

describe("GET /api/progress-photos", () => {
  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await listPhotos(new Request("http://localhost/api/progress-photos"))
    expect(res.status).toBe(401)
  })

  it("responde 404 si el usuario no existe", async () => {
    sessionAs(member)
    usersInDb()
    const res = await listPhotos(new Request("http://localhost/api/progress-photos"))
    expect(res.status).toBe(404)
  })

  it("solo lista las fotos del usuario de la sesión, aunque pida las de otro", async () => {
    sessionAs(member)
    usersInDb(member, otherMember)
    mocks.photoFindMany.mockResolvedValue([])
    const res = await listPhotos(
      new Request("http://localhost/api/progress-photos?category=front&userId=member-2")
    )
    expect(res.status).toBe(200)
    expect(mocks.photoFindMany.mock.calls[0][0].where).toEqual({
      userId: "member-1",
      category: "front",
    })
  })
})

describe("POST /api/progress-photos", () => {
  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await createPhoto(jsonRequest("/api/progress-photos", { url: "https://x.y/a.png" }))
    expect(res.status).toBe(401)
  })

  it("responde 400 sin URL válida o con fecha mal escrita", async () => {
    sessionAs(member)
    usersInDb(member)
    expect((await createPhoto(jsonRequest("/api/progress-photos", {}))).status).toBe(400)
    expect(
      (
        await createPhoto(
          jsonRequest("/api/progress-photos", { url: "https://x.y/a.png", date: "ayer" })
        )
      ).status
    ).toBe(400)
    expect(mocks.photoCreate).not.toHaveBeenCalled()
  })

  it("crea la foto a nombre del usuario de la sesión, aunque el cuerpo diga otro", async () => {
    sessionAs(member)
    usersInDb(member)
    mocks.photoCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "p-1",
      ...data,
    }))
    const res = await createPhoto(
      jsonRequest("/api/progress-photos", {
        url: "http://localhost/api/files/general/1-a.png",
        userId: "member-2",
        category: "front",
      })
    )
    expect(res.status).toBe(201)
    expect(mocks.photoCreate.mock.calls[0][0].data).toMatchObject({
      userId: "member-1",
      category: "front",
    })
  })
})

describe("DELETE /api/progress-photos/[id]", () => {
  const del = (id: string) =>
    deletePhoto(new Request(`http://localhost/api/progress-photos/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    })

  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    expect((await del("p-1")).status).toBe(401)
  })

  it("responde 404 si la foto no existe", async () => {
    sessionAs(member)
    usersInDb(member)
    mocks.photoFindUnique.mockResolvedValue(null)
    expect((await del("p-1")).status).toBe(404)
  })

  it("responde 403 si la foto es de otra persona", async () => {
    sessionAs(member)
    usersInDb(member)
    mocks.photoFindUnique.mockResolvedValue({ id: "p-2", userId: "member-2" })
    expect((await del("p-2")).status).toBe(403)
    expect(mocks.photoDelete).not.toHaveBeenCalled()
  })

  it("borra su propia foto", async () => {
    sessionAs(member)
    usersInDb(member)
    mocks.photoFindUnique.mockResolvedValue({ id: "p-1", userId: "member-1" })
    const res = await del("p-1")
    expect(res.status).toBe(200)
    expect(mocks.photoDelete).toHaveBeenCalledWith({ where: { id: "p-1" } })
  })

  it.todo(
    "POST /api/progress-photos exige una URL absoluta: rechaza con 400 la URL relativa que devuelve /api/upload (`/api/files/...`) y en cambio acepta cualquier URL de otro sitio (hoy ninguna pantalla usa esta ruta)"
  )
})
