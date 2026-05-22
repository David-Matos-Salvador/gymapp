import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  routineSplit: {
    findMany: vi.fn(),
  },
  workoutLog: {
    findFirst: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('react', () => ({
  cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

import {
  getNextPropuestoSplit,
  getWeeklyProgress,
  getWeeklyStreak,
  getWorkoutsThisWeek,
  getUser,
  getBestStreak,
} from '@/lib/weekly-progress'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getNextPropuestoSplit', () => {
  it('returns null when there are no splits', async () => {
    prismaMock.routineSplit.findMany.mockResolvedValue([])
    prismaMock.workoutLog.findFirst.mockResolvedValue(null)

    const result = await getNextPropuestoSplit('user-1', 'plan-1')
    expect(result).toBeNull()
  })

  it('returns the first split when there is no previous log', async () => {
    prismaMock.routineSplit.findMany.mockResolvedValue([
      { id: 'split-1', order: 1 },
      { id: 'split-2', order: 2 },
    ])
    prismaMock.workoutLog.findFirst.mockResolvedValue(null)

    const result = await getNextPropuestoSplit('user-1', 'plan-1')
    expect(result).toBe('split-1')
  })

  it('returns the next split in order after the last logged one', async () => {
    prismaMock.routineSplit.findMany.mockResolvedValue([
      { id: 'split-1', order: 1 },
      { id: 'split-2', order: 2 },
      { id: 'split-3', order: 3 },
    ])
    prismaMock.workoutLog.findFirst.mockResolvedValue({
      split: { order: 1 },
    })

    const result = await getNextPropuestoSplit('user-1', 'plan-1')
    expect(result).toBe('split-2')
  })

  it('wraps around to the first split after the last one', async () => {
    prismaMock.routineSplit.findMany.mockResolvedValue([
      { id: 'split-A', order: 1 },
      { id: 'split-B', order: 2 },
    ])
    prismaMock.workoutLog.findFirst.mockResolvedValue({
      split: { order: 2 },
    })

    const result = await getNextPropuestoSplit('user-1', 'plan-1')
    expect(result).toBe('split-A')
  })
})

describe('getWeeklyProgress', () => {
  it('returns completed count and percent for the current week', async () => {
    prismaMock.workoutLog.count.mockResolvedValue(2)

    const result = await getWeeklyProgress('user-1', 4)
    expect(result.completed).toBe(2)
    expect(result.target).toBe(4)
    expect(result.percent).toBe(50)
  })

  it('returns 0 percent when no workouts logged', async () => {
    prismaMock.workoutLog.count.mockResolvedValue(0)

    const result = await getWeeklyProgress('user-1', 3)
    expect(result.completed).toBe(0)
    expect(result.target).toBe(3)
    expect(result.percent).toBe(0)
  })

  it('caps percent at 100 when exceeding target', async () => {
    prismaMock.workoutLog.count.mockResolvedValue(6)

    const result = await getWeeklyProgress('user-1', 3)
    expect(result.completed).toBe(6)
    expect(result.target).toBe(3)
    expect(result.percent).toBe(200)
  })
})

describe('getWeeklyStreak', () => {
  it('returns zero streak when no logs exist', async () => {
    prismaMock.workoutLog.findMany.mockResolvedValue([])

    const result = await getWeeklyStreak('user-1', 3)
    expect(result.streak).toBe(0)
    expect(result.bestStreak).toBe(0)
  })

  it('counts streak from consecutive weeks meeting the frequency target', async () => {
    const baseDate = new Date('2026-05-11T10:00:00Z')
    const week1 = new Date('2026-05-11T10:00:00Z')
    const week2 = new Date('2026-05-04T10:00:00Z')
    const week3 = new Date('2026-04-27T10:00:00Z')

    vi.setSystemTime(baseDate)

    prismaMock.workoutLog.findMany.mockResolvedValue([
      { date: week1 }, { date: week1 }, { date: week1 },
      { date: week2 }, { date: week2 }, { date: week2 },
      { date: week3 }, { date: week3 }, { date: week3 },
    ])

    const result = await getWeeklyStreak('user-1', 3)
    expect(result.streak).toBe(3)
    expect(result.bestStreak).toBe(3)
  })

  it('breaks streak when a week does not meet the frequency', async () => {
    const baseDate = new Date('2026-05-11T10:00:00Z')
    const week1 = new Date('2026-05-11T10:00:00Z')
    const week2 = new Date('2026-04-27T10:00:00Z')

    vi.setSystemTime(baseDate)

    prismaMock.workoutLog.findMany.mockResolvedValue([
      { date: week1 }, { date: week1 }, { date: week1 },
      { date: week2 }, { date: week2 },
    ])

    const result = await getWeeklyStreak('user-1', 3)
    expect(result.streak).toBe(1)
    expect(result.bestStreak).toBe(1)
  })

  it('tracks bestStreak separately from current streak', async () => {
    const baseDate = new Date('2026-05-11T10:00:00Z')
    const currentWeek = new Date('2026-05-11T10:00:00Z')
    const gapWeek = new Date('2026-05-04T10:00:00Z')
    const pastWeek1 = new Date('2026-04-27T10:00:00Z')
    const pastWeek2 = new Date('2026-04-20T10:00:00Z')

    vi.setSystemTime(baseDate)

    prismaMock.workoutLog.findMany.mockResolvedValue([
      { date: currentWeek }, { date: currentWeek }, { date: currentWeek },
      { date: gapWeek }, { date: gapWeek },
      { date: pastWeek1 }, { date: pastWeek1 }, { date: pastWeek1 },
      { date: pastWeek2 }, { date: pastWeek2 }, { date: pastWeek2 },
    ])

    const result = await getWeeklyStreak('user-1', 3)
    expect(result.streak).toBe(1)
    expect(result.bestStreak).toBe(2)
  })
})

describe('getWorkoutsThisWeek', () => {
  it('returns empty array when no workouts this week', async () => {
    prismaMock.workoutLog.findMany.mockResolvedValue([])

    const result = await getWorkoutsThisWeek('user-1')
    expect(result).toEqual([])
  })

  it('returns dates of workouts within the current week', async () => {
    const dates = [new Date('2026-05-13T10:00:00Z'), new Date('2026-05-15T14:00:00Z')]
    prismaMock.workoutLog.findMany.mockResolvedValue([
      { date: dates[0] },
      { date: dates[1] },
    ])

    const result = await getWorkoutsThisWeek('user-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(dates[0])
    expect(result[1]).toEqual(dates[1])
  })
})

describe('getUser', () => {
  it('returns user data for a valid email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'MEMBER',
      name: 'Test User',
      onboardingCompleted: true,
    })

    const result = await getUser('test@example.com')
    expect(result).toEqual({
      id: 'user-1',
      role: 'MEMBER',
      name: 'Test User',
      onboardingCompleted: true,
    })
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: { id: true, role: true, name: true, onboardingCompleted: true },
    })
  })

  it('returns null for unknown email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const result = await getUser('unknown@example.com')
    expect(result).toBeNull()
  })
})

describe('getBestStreak', () => {
  it('returns the bestStreak from getWeeklyStreak', async () => {
    prismaMock.workoutLog.findMany.mockResolvedValue([])

    const result = await getBestStreak('user-1', 3)
    expect(result).toBe(0)
  })
})

describe('date edge cases', () => {
  it('getWeeklyStreak handles frequency of 1 (any log counts)', async () => {
    const baseDate = new Date('2026-05-11T10:00:00Z')
    vi.setSystemTime(baseDate)

    prismaMock.workoutLog.findMany.mockResolvedValue([
      { date: new Date('2026-05-11T10:00:00Z') },
      { date: new Date('2026-05-04T10:00:00Z') },
    ])

    const result = await getWeeklyStreak('user-1', 1)
    expect(result.streak).toBe(2)
    expect(result.bestStreak).toBe(2)
  })

  it('getWeeklyProgress uses monday as week start', async () => {
    const tuesday = new Date('2026-05-12T10:00:00Z')
    vi.setSystemTime(tuesday)

    prismaMock.workoutLog.count.mockResolvedValue(1)

    const result = await getWeeklyProgress('user-1', 3)
    expect(result.completed).toBe(1)
  })
})
