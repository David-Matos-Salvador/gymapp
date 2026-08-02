// TODO: Integrate with Resend, SendGrid, or Nodemailer for production email sending
// 1. Choose provider and install SDK (e.g. npm install resend)
// 2. Set API key env vars (RESEND_API_KEY, SENDGRID_API_KEY, etc.)
// 3. Replace console.log calls with actual email-send logic
//
// Current implementation validates inputs and logs to console.
// All functions return a result object so callers can handle success/failure.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * Send a membership expiration reminder.
 */
export async function sendMembershipReminder(
  email: string,
  name: string,
  daysLeft: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!email || !name) {
      return { success: false, error: "email and name are required" }
    }
    if (!validateEmail(email)) {
      return { success: false, error: "Invalid email format" }
    }
    if (daysLeft < 0) {
      return { success: false, error: "daysLeft must be >= 0" }
    }

    console.log(`[Email] Sending membership reminder to ${email} (${name}): ${daysLeft} days left`)

    // TODO: Replace with Resend or SendGrid
    // await resend.emails.send({
    //   from: "GymApp <noreply@yourdomain.com>",
    //   to: email,
    //   subject: `Your membership expires in ${daysLeft} days`,
    //   html: `<h1>Hi ${name},</h1><p>Your membership expires in ${daysLeft} days...</p>`,
    // })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[Email] sendMembershipReminder failed:", message)
    return { success: false, error: message }
  }
}
