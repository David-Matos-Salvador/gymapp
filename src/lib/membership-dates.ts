export const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface RenewalSource {
  status: string
  startDate: Date
  endDate: Date
  paymentConfirmed: boolean
}

export interface RenewalPlan {
  durationDays: number
}

export interface RenewalResult {
  startDate: Date
  endDate: Date
  status: "ACTIVE"
  paymentConfirmed: boolean
}

/**
 * Validates a plan duration before using it to calculate a renewal.
 * A plan must extend the membership by at least one day.
 */
export function assertValidDurationDays(durationDays: number): void {
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new RangeError("La duración del plan debe ser de al menos 1 día")
  }
}

/**
 * Calculates a membership renewal on the server.
 *
 * - ACTIVE and not expired: keeps the original startDate, extends from the existing
 *   endDate and keeps the payment status.
 * - Any other status (or an expired ACTIVE membership): starts now, extends from
 *   max(now, existing.endDate), reactivates the membership and marks the payment
 *   as pending.
 *
 * The resulting endDate never shortens an existing future endDate.
 */
export function calculateRenewal(
  existing: RenewalSource,
  plan: RenewalPlan,
  now: Date = new Date()
): RenewalResult {
  assertValidDurationDays(plan.durationDays)

  const anchor = existing.endDate.getTime() > now.getTime() ? existing.endDate : now
  const isActiveAndCurrent =
    existing.status === "ACTIVE" && existing.endDate.getTime() > now.getTime()

  if (isActiveAndCurrent) {
    return {
      startDate: new Date(existing.startDate.getTime()),
      endDate: new Date(existing.endDate.getTime() + plan.durationDays * MS_PER_DAY),
      status: "ACTIVE",
      paymentConfirmed: existing.paymentConfirmed,
    }
  }

  return {
    startDate: new Date(now.getTime()),
    endDate: new Date(anchor.getTime() + plan.durationDays * MS_PER_DAY),
    status: "ACTIVE",
    paymentConfirmed: false,
  }
}
