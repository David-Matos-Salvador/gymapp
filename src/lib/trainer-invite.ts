// Estado de una invitación para el coach: las pendientes que ya pasaron su fecha están vencidas
// aunque en la base sigan como PENDING (solo se marcan EXPIRED cuando alguien abre el enlace).
export function inviteState(
  inv: { status: string; expiresAt: string },
  now: Date = new Date()
): "accepted" | "expired" | "pending" {
  if (inv.status === "COMPLETED") return "accepted"
  if (inv.status === "EXPIRED" || new Date(inv.expiresAt) < now) return "expired"
  return "pending"
}
