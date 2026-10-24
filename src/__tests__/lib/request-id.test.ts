import { describe, expect, it } from "vitest"
import {
  REQUEST_ID_HEADER,
  appendRequestId,
  generateRequestId,
  getRequestId,
  isValidRequestId,
} from "@/lib/request-id"

const VALID_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

describe("request id helpers", () => {
  it("exposes the canonical header name", () => {
    expect(REQUEST_ID_HEADER).toBe("x-request-id")
  })

  it("reuses a valid incoming request id", () => {
    const request = new Request("http://localhost/api/health", {
      headers: { [REQUEST_ID_HEADER]: "req-abc-123" },
    })

    expect(getRequestId(request)).toBe("req-abc-123")
  })

  it("generates a safe id when the header is missing or invalid", () => {
    const missing = new Request("http://localhost/api/health")
    const invalid = new Request("http://localhost/api/health", {
      headers: { [REQUEST_ID_HEADER]: "bad id with spaces" },
    })

    const generated = getRequestId(missing)

    expect(isValidRequestId(generated)).toBe(true)
    expect(generated).toMatch(VALID_ID_PATTERN)
    expect(getRequestId(invalid)).not.toBe("bad id with spaces")
    expect(isValidRequestId(getRequestId(invalid))).toBe(true)
  })

  it("validates length and allowed characters", () => {
    expect(isValidRequestId("abc")).toBe(true)
    expect(isValidRequestId("a".repeat(128))).toBe(true)
    expect(isValidRequestId("a".repeat(129))).toBe(false)
    expect(isValidRequestId("bad id")).toBe(false)
    expect(isValidRequestId("bad\nid")).toBe(false)
    expect(isValidRequestId("")).toBe(false)
    expect(isValidRequestId(undefined)).toBe(false)
    expect(isValidRequestId(null)).toBe(false)
  })

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()))

    expect(ids.size).toBe(100)
    for (const id of ids) expect(id).toMatch(VALID_ID_PATTERN)
  })

  it("appends the header without mutating the original headers", () => {
    const original = new Headers({ "content-type": "application/json" })

    const updated = appendRequestId(original, "req-1")

    expect(updated.get(REQUEST_ID_HEADER)).toBe("req-1")
    expect(updated.get("content-type")).toBe("application/json")
    expect(original.has(REQUEST_ID_HEADER)).toBe(false)
  })
})
