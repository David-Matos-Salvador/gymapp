import type { DefaultSession } from "next-auth"
import type { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role?: UserRole
    onboardingCompleted?: boolean
    onboardingCompletedAt?: string | null
    isGymOwner?: boolean
  }
  interface Session {
    user: {
      role?: UserRole
      onboardingCompleted?: boolean
      onboardingCompletedAt?: string
      isGymOwner?: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    onboardingCompleted?: boolean
    onboardingCompletedAt?: string
    isGymOwner?: boolean
  }
}
