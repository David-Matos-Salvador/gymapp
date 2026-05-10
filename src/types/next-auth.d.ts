import type { DefaultSession } from "next-auth"
import type { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role?: UserRole
    onboardingCompleted?: boolean
    onboardingCompletedAt?: string | null
  }
  interface Session {
    user: {
      role?: UserRole
      onboardingCompleted?: boolean
      onboardingCompletedAt?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    onboardingCompleted?: boolean
    onboardingCompletedAt?: string
  }
}
