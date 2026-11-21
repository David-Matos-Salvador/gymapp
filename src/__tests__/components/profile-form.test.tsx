// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { jsonResponse, mockFetch, offlineFetch, sentJson } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))
const play = vi.hoisted(() => vi.fn())

vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play }) }))
vi.mock("framer-motion", () => {
  // Sin las props de animación, que el DOM no conoce.
  const MockDiv = (props: React.ComponentProps<"div"> & Record<string, unknown>) => {
    const domProps = { ...props }
    for (const key of ["initial", "animate", "transition"]) delete domProps[key]
    return <div {...domProps} />
  }
  return { motion: { div: MockDiv } }
})

import { ProfileForm } from "@/components/profile/profile-form"

type User = React.ComponentProps<typeof ProfileForm>["user"]

const member: User = {
  id: "u1",
  name: "Laura Pérez",
  email: "laura@example.com",
  phone: "+51 999 123 456",
  role: "MEMBER",
  sex: "FEMALE",
  birthDate: "1995-03-01T00:00:00.000Z",
  objective: "MUSCLE_GAIN",
  experienceLevel: "INTERMEDIATE",
  medicalNotes: null,
  emergencyContact: "Ana Pérez",
  emergencyPhone: "+51 988 777 666",
  height: 165,
  weight: 60,
  image: null,
  bio: null,
  createdAt: "2026-01-10T00:00:00.000Z",
}

const empty: User = {
  ...member,
  name: null,
  phone: null,
  sex: null,
  birthDate: null,
  objective: null,
  experienceLevel: null,
  emergencyContact: null,
  emergencyPhone: null,
  height: null,
  weight: null,
}

function renderForm(user: User = member) {
  return render(<ProfileForm user={user} />)
}

const saveButton = () => screen.getByRole("button", { name: /Guardar cambios|Guardando/ })

/** Abre un Select de Radix con el teclado y elige la opción con ese texto. */
async function choose(trigger: HTMLElement, option: string) {
  fireEvent.keyDown(trigger, { key: "Enter" })
  const item = await screen.findByRole("option", { name: option })
  fireEvent.keyDown(item, { key: "Enter" })
}

function cardOf(title: string) {
  // La tarjeta es el contenedor con data-slot="card" que lleva ese título.
  const card = screen.getByText(title).closest('[data-slot="card"]')
  if (!card) throw new Error(`No hay tarjeta para ${title}`)
  return within(card as HTMLElement)
}

function avatarInput(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error("No hay input de archivo")
  return input as HTMLInputElement
}

function pickFile(container: HTMLElement, file: File) {
  fireEvent.change(avatarInput(container), { target: { files: [file] } })
}

describe("ProfileForm", () => {
  beforeAll(() => {
    // jsdom no implementa lo que usa el Select de Radix ni las URL de vista previa.
    Element.prototype.scrollIntoView ??= vi.fn()
    Element.prototype.hasPointerCapture ??= vi.fn(() => false)
    Element.prototype.releasePointerCapture ??= vi.fn()
    URL.createObjectURL = vi.fn(() => "blob:vista-previa")
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("lo que muestra", () => {
    it("tiene las tres tarjetas con sus títulos y descripciones", () => {
      renderForm()

      expect(screen.getByText("Información personal")).toBeTruthy()
      expect(screen.getByText("Datos básicos de tu cuenta")).toBeTruthy()
      expect(screen.getByText("Perfil de gimnasio")).toBeTruthy()
      expect(screen.getByText("Tu configuración de entrenamiento")).toBeTruthy()
      expect(screen.getByText("Editar información")).toBeTruthy()
      expect(screen.getByText("Actualiza tus datos personales y de contacto")).toBeTruthy()
    })

    it("muestra los datos guardados en español: rol, sexo, objetivo, nivel, altura y peso", () => {
      renderForm()

      const personal = cardOf("Información personal")
      expect(personal.getByText("laura@example.com")).toBeTruthy()
      expect(personal.getByText("Miembro")).toBeTruthy()
      expect(personal.getByText("Femenino")).toBeTruthy()
      const gym = cardOf("Perfil de gimnasio")
      expect(gym.getByText("Ganancia muscular")).toBeTruthy()
      expect(gym.getByText("Intermedio")).toBeTruthy()
      expect(gym.getByText("165 cm")).toBeTruthy()
      expect(gym.getByText("60 kg")).toBeTruthy()
      expect(gym.getByText("Ana Pérez")).toBeTruthy()
      expect(gym.getByText("+51 988 777 666")).toBeTruthy()
    })

    it("la fecha de nacimiento se lee en español y no se corre un día en Perú", () => {
      renderForm()

      expect(screen.getByText(/1 de marzo de 1995/)).toBeTruthy()
    })

    it("sin datos dice «No especificado» en cada campo vacío", () => {
      renderForm(empty)

      // Sexo, nacimiento, edad, objetivo, altura, peso, nivel y los dos de emergencia.
      expect(screen.getAllByText("No especificado")).toHaveLength(9)
    })

    it("las notas médicas solo aparecen si hay", () => {
      const { unmount } = renderForm()
      expect(screen.queryByText("Notas médicas")).toBeNull()
      unmount()

      renderForm({ ...member, medicalNotes: "Lesión en la rodilla derecha" })
      expect(screen.getByText("Notas médicas")).toBeTruthy()
      expect(screen.getByText("Lesión en la rodilla derecha")).toBeTruthy()
    })

    it("sin foto muestra la inicial del nombre (o del correo si no hay nombre)", () => {
      const { unmount } = renderForm()
      expect(screen.getByText("L")).toBeTruthy()
      unmount()

      renderForm({ ...empty, email: "zoe@example.com" })
      expect(screen.getByText("Z")).toBeTruthy()
    })

    it("con foto la muestra en vez de la inicial", () => {
      renderForm({ ...member, image: "https://cdn.example.com/laura.webp" })

      expect(screen.getByRole("img").getAttribute("src")).toBe("https://cdn.example.com/laura.webp")
    })

    it("explica qué formatos y tamaño acepta la foto", () => {
      renderForm()

      expect(screen.getByText("Foto de perfil")).toBeTruthy()
      expect(screen.getByText("JPEG, PNG, WebP o GIF (máx. 5 MB)")).toBeTruthy()
    })

    it("el miembro no ve «Sobre ti»", () => {
      renderForm()

      expect(screen.queryByLabelText("Sobre ti")).toBeNull()
    })

    it("el coach ve y edita «Sobre ti» con su ayuda y un máximo de 500 caracteres", () => {
      renderForm({ ...member, role: "TRAINER", bio: "Entreno fuerza" })

      expect(screen.getByText("Coach")).toBeTruthy()
      const bio = screen.getByLabelText("Sobre ti") as HTMLTextAreaElement
      expect(bio.value).toBe("Entreno fuerza")
      expect(bio.getAttribute("maxLength")).toBe("500")
      expect(bio.getAttribute("placeholder")).toBe(
        "Cuéntales a tus clientes en qué te especializas"
      )
      expect(
        screen.getByText("Una descripción corta que ven tus clientes. Máximo 500 caracteres.")
      ).toBeTruthy()
    })
  })

  describe("campos del formulario", () => {
    it("cada campo tiene su etiqueta y empieza con el dato guardado", () => {
      renderForm()

      expect((screen.getByLabelText("Nombre completo") as HTMLInputElement).value).toBe(
        "Laura Pérez"
      )
      expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("+51 999 123 456")
      expect((screen.getByLabelText("Fecha de nacimiento") as HTMLInputElement).value).toBe(
        "1995-03-01"
      )
      expect((screen.getByLabelText("Contacto de emergencia") as HTMLInputElement).value).toBe(
        "Ana Pérez"
      )
      expect((screen.getByLabelText("Teléfono de emergencia") as HTMLInputElement).value).toBe(
        "+51 988 777 666"
      )
      expect(screen.getByRole("combobox", { name: "Sexo" }).textContent).toContain("Femenino")
      expect(screen.getByRole("combobox", { name: "Objetivo" }).textContent).toContain(
        "Ganancia muscular"
      )
      expect(screen.getByRole("combobox", { name: "Nivel de experiencia" }).textContent).toContain(
        "Intermedio"
      )
    })

    it("sin datos, los selectores invitan a elegir con tuteo", () => {
      renderForm(empty)

      expect(screen.getByText("Elige una opción")).toBeTruthy()
      expect(screen.getByText("Elige tu objetivo")).toBeTruthy()
      expect(screen.getByText("Elige tu nivel")).toBeTruthy()
      expect(screen.getByPlaceholderText("Tu nombre")).toBeTruthy()
      expect(screen.getAllByPlaceholderText("+51 999 123 456")).toHaveLength(2)
    })

    it("no deja elegir una fecha de nacimiento futura", () => {
      renderForm()

      const max = screen.getByLabelText("Fecha de nacimiento").getAttribute("max")
      expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("sin cambios dice «No hay cambios pendientes» y no deja guardar", () => {
      renderForm()

      expect(screen.getByText("No hay cambios pendientes")).toBeTruthy()
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    })

    it("al cambiar algo avisa «Tienes cambios sin guardar» y deja guardar", () => {
      renderForm()

      fireEvent.change(screen.getByLabelText("Nombre completo"), {
        target: { value: "Laura Pérez Ruiz" },
      })

      expect(screen.getByText("Tienes cambios sin guardar")).toBeTruthy()
      expect((saveButton() as HTMLButtonElement).disabled).toBe(false)
    })

    it("volver al valor original quita el aviso de cambios", () => {
      renderForm()
      const name = screen.getByLabelText("Nombre completo")

      fireEvent.change(name, { target: { value: "Otra" } })
      fireEvent.change(name, { target: { value: "Laura Pérez" } })

      expect(screen.getByText("No hay cambios pendientes")).toBeTruthy()
    })
  })

  describe("validaciones", () => {
    it("el nombre vacío muestra un error accesible y no deja guardar", () => {
      renderForm()
      const name = screen.getByLabelText("Nombre completo")

      fireEvent.change(name, { target: { value: "" } })

      expect(screen.getByRole("alert").textContent).toBe("El nombre no puede estar vacío")
      expect(name.getAttribute("aria-invalid")).toBe("true")
      expect(name.getAttribute("aria-describedby")).toBe("nameError")
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    })

    it("sin nombre guardado no muestra el error hasta que tocas el campo", () => {
      renderForm(empty)
      const name = screen.getByLabelText("Nombre completo")

      expect(screen.queryByRole("alert")).toBeNull()
      fireEvent.blur(name)
      expect(screen.getByRole("alert").textContent).toBe("El nombre no puede estar vacío")
    })

    it("un teléfono inválido muestra cómo escribirlo y no deja guardar", () => {
      renderForm()
      const phone = screen.getByLabelText("Teléfono")

      fireEvent.change(phone, { target: { value: "abc" } })

      expect(screen.getByRole("alert").textContent).toBe(
        "Escribe un teléfono válido, por ejemplo +51 999 123 456"
      )
      expect(phone.getAttribute("aria-invalid")).toBe("true")
      expect(phone.getAttribute("aria-describedby")).toBe("phoneError")
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    })

    it("un teléfono de emergencia inválido también se marca", () => {
      renderForm()
      const phone = screen.getByLabelText("Teléfono de emergencia")

      fireEvent.change(phone, { target: { value: "12" } })

      expect(screen.getByRole("alert").textContent).toBe(
        "Escribe un teléfono válido, por ejemplo +51 999 123 456"
      )
      expect(phone.getAttribute("aria-describedby")).toBe("emergencyPhoneError")
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    })

    it("una fecha de nacimiento de hace más de 120 años se rechaza", () => {
      renderForm()
      const date = screen.getByLabelText("Fecha de nacimiento")

      fireEvent.change(date, { target: { value: "1800-01-01" } })

      expect(screen.getByRole("alert").textContent).toBe("Escribe una fecha de nacimiento válida")
      expect(date.getAttribute("aria-invalid")).toBe("true")
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    })

    it("vaciar el teléfono es válido", () => {
      renderForm()

      fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "" } })

      expect(screen.queryByRole("alert")).toBeNull()
      expect((saveButton() as HTMLButtonElement).disabled).toBe(false)
    })

    it.todo(
      "un nombre de solo espacios debería marcarse como vacío en el formulario: hoy deja guardar y la API responde «El nombre no puede estar vacío» en un aviso"
    )
  })

  describe("guardar", () => {
    it("envía nombre y teléfono siempre, y del resto solo lo que cambió", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      renderForm()

      fireEvent.change(screen.getByLabelText("Contacto de emergencia"), {
        target: { value: "Carlos Pérez" },
      })
      fireEvent.click(saveButton())

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(fetchMock.mock.calls[0][0]).toBe("/api/profile")
      expect(fetchMock.mock.calls[0][1].method).toBe("POST")
      expect(sentJson(fetchMock)).toEqual({
        name: "Laura Pérez",
        phone: "+51 999 123 456",
        emergencyContact: "Carlos Pérez",
      })
    })

    it("los selectores mandan el valor interno, no la etiqueta", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      renderForm()

      await choose(screen.getByRole("combobox", { name: "Objetivo" }), "Fuerza")
      await choose(screen.getByRole("combobox", { name: "Nivel de experiencia" }), "Avanzado")
      await choose(screen.getByRole("combobox", { name: "Sexo" }), "Otro")
      fireEvent.click(saveButton())

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(sentJson(fetchMock)).toMatchObject({
        objective: "STRENGTH",
        experienceLevel: "ADVANCED",
        sex: "OTHER",
      })
    })

    it("la fecha de nacimiento se manda como AAAA-MM-DD", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      renderForm()

      fireEvent.change(screen.getByLabelText("Fecha de nacimiento"), {
        target: { value: "1996-07-15" },
      })
      fireEvent.click(saveButton())

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(sentJson(fetchMock).birthDate).toBe("1996-07-15")
    })

    it("un teléfono vacío se manda como null", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      renderForm()

      fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "" } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(sentJson(fetchMock).phone).toBeNull()
    })

    it("el miembro no manda «bio»; el coach sí cuando la cambia", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }))
      renderForm({ ...member, role: "TRAINER", bio: "" })

      fireEvent.change(screen.getByLabelText("Sobre ti"), {
        target: { value: "Coach de fuerza y movilidad" },
      })
      fireEvent.click(saveButton())

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(sentJson(fetchMock).bio).toBe("Coach de fuerza y movilidad")
    })

    it("mientras guarda dice «Guardando...» y el botón queda desactivado", async () => {
      let resolve: (r: Response) => void = () => {}
      const fetchMock = vi.fn(() => new Promise<Response>((r) => (resolve = r)))
      vi.stubGlobal("fetch", fetchMock)
      renderForm()

      fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Laura" } })
      fireEvent.click(saveButton())

      expect(saveButton().textContent).toContain("Guardando...")
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true)

      resolve(jsonResponse({ ok: true }))
      await waitFor(() => expect(saveButton().textContent).toBe("Guardar cambios"))
    })

    it("dos toques seguidos en «Guardar cambios» envían una sola vez", async () => {
      const fetchMock = mockFetch(jsonResponse({ ok: true }), jsonResponse({ ok: true }))
      renderForm()

      fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Laura" } })
      fireEvent.click(saveButton())
      fireEvent.click(saveButton())

      await waitFor(() => expect(toast.success).toHaveBeenCalled())
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("al guardar bien avisa «Perfil actualizado», suena y refresca la página", async () => {
      mockFetch(jsonResponse({ ok: true }))
      renderForm()

      fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Laura" } })
      fireEvent.click(saveButton())

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Perfil actualizado", {
          description: "Los cambios se guardaron correctamente.",
        })
      )
      expect(play).toHaveBeenCalledWith("success")
      expect(router.refresh).toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
    })

    it("si la API rechaza, muestra su mensaje y no refresca", async () => {
      mockFetch(jsonResponse({ error: "El nombre no puede tener más de 100 caracteres" }, 400))
      renderForm()

      fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Laura" } })
      fireEvent.click(saveButton())

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Error al actualizar", {
          description: "El nombre no puede tener más de 100 caracteres",
        })
      )
      expect(router.refresh).not.toHaveBeenCalled()
      expect(saveButton().textContent).toBe("Guardar cambios")
      // Lo escrito no se pierde para poder corregirlo.
      expect((screen.getByLabelText("Nombre completo") as HTMLInputElement).value).toBe("Laura")
    })

    it("si la API falla sin mensaje, usa uno genérico", async () => {
      mockFetch({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError("Unexpected token <")
        },
      } as unknown as Response)
      renderForm()

      fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Laura" } })
      fireEvent.click(saveButton())

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Error al actualizar", {
          description: "Hubo un problema al guardar los cambios.",
        })
      )
    })

    it.todo(
      "sin conexión debería avisar «Error de conexión» y volver a «Guardar cambios»: handleSave no tiene try/catch, el botón se queda en «Guardando...» para siempre y no sale ningún aviso (#184)"
    )
  })

  describe("foto de perfil", () => {
    it("rechaza un formato que no es imagen sin subir nada", () => {
      const fetchMock = mockFetch()
      const { container } = renderForm()

      pickFile(container, new File(["%PDF"], "cv.pdf", { type: "application/pdf" }))

      expect(toast.error).toHaveBeenCalledWith("Formato no permitido. Usa JPEG, PNG, WebP o GIF")
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("rechaza una imagen de más de 5 MB sin subir nada", () => {
      const fetchMock = mockFetch()
      const { container } = renderForm()
      const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.jpg", {
        type: "image/jpeg",
      })

      pickFile(container, big)

      expect(toast.error).toHaveBeenCalledWith("Archivo muy grande. Máximo 5 MB")
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("sube la foto como «profile», avisa y muestra la nueva", async () => {
      const fetchMock = mockFetch(jsonResponse({ url: "https://cdn.example.com/nueva.webp" }))
      const { container } = renderForm()

      pickFile(container, new File(["img"], "yo.webp", { type: "image/webp" }))

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Foto de perfil actualizada"))
      expect(fetchMock.mock.calls[0][0]).toBe("/api/upload")
      const body = fetchMock.mock.calls[0][1].body as FormData
      expect(body.get("type")).toBe("profile")
      expect((body.get("file") as File).name).toBe("yo.webp")
      expect(screen.getByRole("img").getAttribute("src")).toBe("https://cdn.example.com/nueva.webp")
      expect(router.refresh).toHaveBeenCalled()
      // Se puede volver a elegir el mismo archivo.
      expect(avatarInput(container).value).toBe("")
    })

    it("si la subida falla, muestra el error y vuelve a la foto anterior", async () => {
      mockFetch(jsonResponse({ error: "No se pudo guardar la imagen" }, 500))
      const { container } = renderForm({ ...member, image: "https://cdn.example.com/vieja.webp" })

      pickFile(container, new File(["img"], "yo.png", { type: "image/png" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No se pudo guardar la imagen"))
      expect(screen.getByRole("img").getAttribute("src")).toBe("https://cdn.example.com/vieja.webp")
      expect(router.refresh).not.toHaveBeenCalled()
    })

    it("sin conexión dice «Error de conexión» y vuelve a la inicial", async () => {
      offlineFetch()
      const { container } = renderForm()

      pickFile(container, new File(["img"], "yo.png", { type: "image/png" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error de conexión"))
      expect(screen.queryByRole("img")).toBeNull()
      expect(screen.getByText("L")).toBeTruthy()
    })

    it("el botón de la foto abre el selector de archivos", () => {
      const { container } = renderForm()
      const click = vi.spyOn(avatarInput(container), "click")

      fireEvent.click(cardOf("Editar información").getAllByRole("button")[0])

      expect(click).toHaveBeenCalled()
    })

    it.todo(
      "el botón de la foto debería llamarse «Cambiar foto de perfil»: hoy un lector de pantalla lo anuncia como «Avatar» o solo con la inicial («L»)"
    )

    it.todo(
      "si el servidor responde algo que no es JSON (por ejemplo un 413 del proxy), dice «Error de conexión» en vez de «Error al subir la imagen»"
    )
  })
})
