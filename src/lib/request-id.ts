/**
 * Request id helpers shared by the proxy and API route handlers.
 *
 * Incoming ids are reused when they are safe; otherwise a fresh id is
 * generated. Only a conservative character set is accepted to prevent log
 * injection and unbounded header values.
 */

export const REQUEST_ID_HEADER = "x-request-id"

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

export function isValidRequestId(value: string | null | undefined): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value)
}

export function generateRequestId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getRequestId(request: Pick<Request, "headers">): string {
  const headers = request?.headers
  const incoming =
    headers && typeof headers.get === "function" ? headers.get(REQUEST_ID_HEADER) : null
  return isValidRequestId(incoming) ? incoming : generateRequestId()
}

export function appendRequestId(headers: Headers, requestId: string): Headers {
  const next = new Headers(headers)
  next.set(REQUEST_ID_HEADER, requestId)
  return next
}
