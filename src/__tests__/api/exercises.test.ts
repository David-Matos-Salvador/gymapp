import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exercise: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

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
  NextRequest: class extends Request {
    constructor(input: string | URL, init?: RequestInit) {
      super(input, init)
    }
  },
}))

import { GET as getExercises } from '@/app/api/exercises/route'
import { GET as getExerciseById } from '@/app/api/exercises/[id]/route'

describe('GET /api/exercises', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an array of exercises', async () => {
    const mockExercises = [
      { id: '1', name: 'Bench Press', category: 'STRENGTH' },
      { id: '2', name: 'Squat', category: 'STRENGTH' },
    ]
    mockFindMany.mockResolvedValue(mockExercises)

    const response = await getExercises()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.exercises).toEqual(mockExercises)
    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      include: { creator: { select: { id: true, name: true, role: true } } },
    })
  })

  it('returns empty array when no exercises exist', async () => {
    mockFindMany.mockResolvedValue([])

    const response = await getExercises()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.exercises).toEqual([])
  })
})

describe('GET /api/exercises/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns exercise by known ID', async () => {
    const mockExercise = { id: 'ex-1', name: 'Bench Press', category: 'CHEST' }
    mockFindUnique.mockResolvedValue(mockExercise)

    const req = new Request('http://localhost:3000/api/exercises/ex-1')
    const response = await getExerciseById(req, { params: Promise.resolve({ id: 'ex-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(mockExercise)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'ex-1' },
      include: expect.anything(),
    })
  })

  it('returns 404 for unknown exercise ID', async () => {
    mockFindUnique.mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/exercises/nonexistent')
    const response = await getExerciseById(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Ejercicio no encontrado')
  })
})
