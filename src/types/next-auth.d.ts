import type { UserRole, MembershipStatus } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role?: UserRole
    membershipStatus?: MembershipStatus
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    membershipStatus?: MembershipStatus
  }
}
