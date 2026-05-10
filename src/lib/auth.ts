import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
          onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted
        token.onboardingCompletedAt = (user as { onboardingCompletedAt?: string | null }).onboardingCompletedAt ?? undefined
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
        const sessionUser = session.user as { role?: string; onboardingCompleted?: boolean; onboardingCompletedAt?: string }
        sessionUser.role = token.role as string
        sessionUser.onboardingCompleted = token.onboardingCompleted as boolean
        sessionUser.onboardingCompletedAt = token.onboardingCompletedAt as string | undefined
      }
      return session
    },
  },
})
