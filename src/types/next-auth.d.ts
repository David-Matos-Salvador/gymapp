import type { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role?: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
  }
}
