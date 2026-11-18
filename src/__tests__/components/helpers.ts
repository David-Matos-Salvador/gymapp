import { vi } from "vitest"

/** Respuesta simulada de `fetch` con cuerpo JSON. */
export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

/** Reemplaza `fetch` por un simulacro que devuelve estas respuestas, en orden. */
export function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** `fetch` que falla como sin conexión: después de `ok` respuestas, rechaza la promesa. */
export function offlineFetch(...ok: Response[]) {
  const fetchMock = vi.fn()
  for (const response of ok) fetchMock.mockResolvedValueOnce(response)
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Cuerpo JSON que el componente envió en la llamada número `call` a `fetch`. */
export function sentJson(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string)
}
