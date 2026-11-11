export type MembershipTab = "pending" | "active" | "expired"

export interface MembershipTiming {
  status: string
  endDate: Date | string
  paymentConfirmed: boolean
}

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  PENDING_PAYMENT: "Pago pendiente",
  INACTIVE: "Inactiva",
  EXPIRED: "Vencida",
  SUSPENDED: "Suspendida",
  CANCELLED: "Cancelada",
}

export function getMembershipStatusLabel(status: string): string {
  return MEMBERSHIP_STATUS_LABELS[status] ?? status
}

function endTime(endDate: Date | string): number {
  return endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime()
}

/**
 * D-02: a membership is expired for the admin panel when it is not ACTIVE or its
 * endDate has already passed, regardless of the stored status.
 */
export function isMembershipExpired(membership: MembershipTiming, now: Date = new Date()): boolean {
  return membership.status !== "ACTIVE" || endTime(membership.endDate) < now.getTime()
}

/**
 * Classifies a membership into exactly one of the three mutually exclusive tabs.
 */
export function getMembershipTab(
  membership: MembershipTiming,
  now: Date = new Date()
): MembershipTab {
  if (isMembershipExpired(membership, now)) return "expired"
  return membership.paymentConfirmed ? "active" : "pending"
}

/**
 * Renewal is available for every membership shown in the Vencidas tab, including
 * INACTIVE, EXPIRED, SUSPENDED and CANCELLED memberships.
 */
export function canRenewMembership(membership: MembershipTiming, now: Date = new Date()): boolean {
  return isMembershipExpired(membership, now)
}
