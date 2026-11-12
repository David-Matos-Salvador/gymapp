import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { decryptSecret, encryptSecret } from "@/lib/calendar-crypto"
import { BOOKING_WINDOW_DAYS } from "@/lib/coach-schedule"
import {
  getGoogleCalendarConfig,
  GoogleAuthRevokedError,
  queryGoogleFreeBusy,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from "@/lib/google-calendar"

/** Cuánto vale la caché de horas ocupadas antes de volver a preguntarle a Google. */
export const CALENDAR_CACHE_TTL_MS = 5 * 60_000
const DAY_MS = 86_400_000

export type SyncResult = "synced" | "needs_reconnect" | "failed" | "not_connected" | "disabled"

/** Guarda (o reemplaza) la conexión del coach con el refresh token cifrado. */
export async function saveCalendarConnection(trainerId: string, refreshToken: string) {
  const encryptedRefreshToken = encryptSecret(refreshToken)
  return prisma.coachCalendarConnection.upsert({
    where: { trainerId },
    create: { trainerId, provider: "GOOGLE", encryptedRefreshToken },
    update: { encryptedRefreshToken, status: "ACTIVE", lastSyncAt: null },
  })
}

/**
 * Lee free/busy de Google y reemplaza la caché del coach. No lanza errores: una
 * falla del proveedor no debe tumbar la agenda, que sigue con la caché anterior.
 */
export async function syncCalendar(trainerId: string, now: Date = new Date()): Promise<SyncResult> {
  const config = getGoogleCalendarConfig()
  if (!config) return "disabled"

  const connection = await prisma.coachCalendarConnection.findUnique({ where: { trainerId } })
  if (!connection) return "not_connected"

  try {
    const refreshToken = decryptSecret(connection.encryptedRefreshToken)
    const accessToken = await refreshGoogleAccessToken(config, refreshToken)
    const busy = await queryGoogleFreeBusy({
      accessToken,
      calendarId: connection.calendarId,
      // Un día antes: un evento que ya empezó todavía puede cruzarse con la próxima hora libre.
      timeMin: new Date(now.getTime() - DAY_MS),
      // Un día de margen sobre la ventana de reserva, por la diferencia de zona horaria.
      timeMax: new Date(now.getTime() + (BOOKING_WINDOW_DAYS + 1) * DAY_MS),
    })

    await prisma.$transaction([
      prisma.calendarBusyBlock.deleteMany({ where: { connectionId: connection.id } }),
      prisma.calendarBusyBlock.createMany({
        data: busy.map((item) => ({
          connectionId: connection.id,
          startsAt: item.start,
          endsAt: item.end,
        })),
      }),
      prisma.coachCalendarConnection.update({
        where: { id: connection.id },
        data: { status: "ACTIVE", lastSyncAt: now },
      }),
    ])
    return "synced"
  } catch (error) {
    if (error instanceof GoogleAuthRevokedError) {
      await prisma.coachCalendarConnection.update({
        where: { id: connection.id },
        data: { status: "NEEDS_RECONNECT" },
      })
      return "needs_reconnect"
    }
    // Solo el nombre y el mensaje propios: nunca el token ni la respuesta de Google.
    logger.warn("Calendar sync failed", {
      context: { trainerId, reason: error instanceof Error ? error.name : "unknown" },
    })
    return "failed"
  }
}

/**
 * Antes de calcular horas libres: si la caché del coach está vencida, la renueva.
 * Se llama fuera de transacciones porque habla con Google.
 */
export async function refreshCalendarCacheIfStale(
  trainerId: string,
  now: Date = new Date()
): Promise<void> {
  if (!getGoogleCalendarConfig()) return
  const connection = await prisma.coachCalendarConnection.findUnique({
    where: { trainerId },
    select: { status: true, lastSyncAt: true },
  })
  if (!connection || connection.status !== "ACTIVE") return
  if (
    connection.lastSyncAt &&
    now.getTime() - connection.lastSyncAt.getTime() < CALENDAR_CACHE_TTL_MS
  ) {
    return
  }
  await syncCalendar(trainerId, now)
}

/** Revoca el acceso en Google (si se puede) y borra la credencial y la caché. */
export async function disconnectCalendar(trainerId: string): Promise<boolean> {
  const connection = await prisma.coachCalendarConnection.findUnique({ where: { trainerId } })
  if (!connection) return false

  try {
    await revokeGoogleToken(decryptSecret(connection.encryptedRefreshToken))
  } catch {
    // Si no se puede descifrar o revocar, igual se borra la credencial local.
  }
  await prisma.coachCalendarConnection.delete({ where: { id: connection.id } })
  return true
}
