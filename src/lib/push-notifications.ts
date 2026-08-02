// TODO: Integrate with Firebase Cloud Messaging (FCM)
// 1. Create a Firebase project and enable Cloud Messaging
// 2. Add Firebase Admin SDK: npm install firebase-admin
// 3. Set FIREBASE_SERVICE_ACCOUNT env var (JSON path or inline)
// 4. Initialize admin SDK with service account credentials
// 5. Replace local Map-based storage with DB persistence
//
// NOTE: The Notification model in schema.prisma does not have a `deviceToken`
// field. To persist tokens properly, either:
//   - Add `deviceToken String?` to the User model
//   - Create a new `DeviceToken` model (userId, token, platform, createdAt)
//
// Currently using an in-memory Map (wiped on server restart).

const deviceTokens = new Map<string, string[]>()

/**
 * Send a push notification to a user's registered devices.
 * Currently logs to console — replace with FCM send logic.
 */
export async function sendPush(
  userId: string,
  notification: { title: string; body: string; data?: Record<string, string> }
): Promise<{ success: boolean; sent: number; error?: string }> {
  try {
    if (!userId || !notification.title || !notification.body) {
      return { success: false, sent: 0, error: "userId, title, and body are required" }
    }

    const tokens = deviceTokens.get(userId) ?? []

    console.log(`[Push] Sending to userId=${userId}: "${notification.title}" (${tokens.length} devices)`)

    if (tokens.length === 0) {
      return { success: true, sent: 0 }
    }

    // TODO: Replace with FCM send
    // const message: admin.messaging.Message = {
    //   notification: { title: notification.title, body: notification.body },
    //   data: notification.data ?? {},
    //   tokens,
    // }
    // const response = await admin.messaging().sendEachForMulticast(message)
    // return { success: response.failureCount === 0, sent: response.successCount }

    for (const token of tokens) {
      console.log(`[Push] Would send to token=${token.slice(0, 12)}...`)
    }

    return { success: true, sent: tokens.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[Push] sendPush failed:", message)
    return { success: false, sent: 0, error: message }
  }
}
