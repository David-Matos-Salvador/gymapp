"use client"

import { useSession } from "next-auth/react"
import type { UserRole } from "@prisma/client"

interface AuthUser {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: UserRole
  onboardingCompleted?: boolean
  onboardingCompletedAt?: string
  isGymOwner?: boolean
}

export function useAuth() {
  const { data: session, status, update } = useSession()

  return {
    user: (session?.user as AuthUser) ?? null,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    isAdmin: (session?.user as AuthUser)?.role === "ADMIN",
    isSuperAdmin: (session?.user as AuthUser)?.role === "SUPER_ADMIN",
    isTrainer: (session?.user as AuthUser)?.role === "TRAINER",
    isMember: (session?.user as AuthUser)?.role === "MEMBER",
    isGymOwner: (session?.user as AuthUser)?.isGymOwner === true,
    update,
  }
}
