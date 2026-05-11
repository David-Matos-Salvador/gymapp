import { describe, it, expect, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { GET } from '@/app/api/health/route'

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      })
      Object.defineProperty(response, 'json', {
        value: async () => body,
      })
      return response
    }),
  },
}))

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const response = await GET()
    const body = await response.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('timestamp')
  })

  it('returns valid ISO timestamp', async () => {
    const response = await GET()
    const body = await response.json()
    const date = new Date(body.timestamp as string)
    expect(date.getTime()).not.toBeNaN()
  })
})
