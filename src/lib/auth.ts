import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { canSignIn } from "@/lib/user-lifecycle"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        if (!(await rateLimit(`login:${email.toLowerCase()}`, 15, 900))) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { ownedGym: { select: { id: true } } },
        })

        if (!user || !user.password || !canSignIn(user)) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.password)

        if (!isValid) {
          return null
        }

        if (user.role !== "SUPER_ADMIN" && user.gymId) {
          const gym = await prisma.gym.findUnique({
            where: { id: user.gymId },
            select: { active: true },
          })
          if (!gym?.active) return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
          onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
          isGymOwner: !!user.ownedGym,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true
      const found = await prisma.user.findUnique({
        where: { id: user.id },
        select: { deletedAt: true },
      })
      return !found || canSignIn(found)
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted
        token.onboardingCompletedAt =
          (user as { onboardingCompletedAt?: string | null }).onboardingCompletedAt ?? undefined
        token.isGymOwner = (user as { isGymOwner?: boolean }).isGymOwner
      }
      if (trigger === "update" && session) {
        const s = session as { onboardingCompleted?: boolean; onboardingCompletedAt?: string }
        if (s.onboardingCompleted !== undefined) {
          token.onboardingCompleted = s.onboardingCompleted
          token.onboardingCompletedAt = s.onboardingCompletedAt ?? new Date().toISOString()
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as {
          role?: string
          onboardingCompleted?: boolean
          onboardingCompletedAt?: string
          isGymOwner?: boolean
        }
        sessionUser.role = token.role as string
        sessionUser.onboardingCompleted = token.onboardingCompleted as boolean
        sessionUser.onboardingCompletedAt = token.onboardingCompletedAt as string | undefined
        sessionUser.isGymOwner = token.isGymOwner as boolean | undefined
      }
      return session
    },
  },
})
