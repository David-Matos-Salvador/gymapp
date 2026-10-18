import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Paths that are always public (no auth required).
 * Note: /api, /_next/*, /favicon.ico, /icons, /manifest are already excluded
 * by the config.matcher below and never reach this function.
 */
const PUBLIC_PATHS = ["/login", "/register", "/invite"]

/**
 * Optimistic role-based route prefixes.
 * Full authorization is enforced within each route/page itself
 * (Proxy only provides an optimistic redirect layer).
 */
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN", "SUPER_ADMIN"],
  "/super-admin": ["SUPER_ADMIN"],
  "/coach": ["TRAINER", "ADMIN", "SUPER_ADMIN"],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ----- Public routes (no auth required) -----
  if (pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow unauthenticated access to onboarding (needed for first-time setup)
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.next()
  }

  // ----- Auth check -----
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = (session.user as { role?: string }).role
  const isGymOwner = (session.user as { isGymOwner?: boolean }).isGymOwner
  const onboardingCompleted = (
    session.user as {
      onboardingCompleted?: boolean
    }
  ).onboardingCompleted

  // ----- Onboarding gate (MEMBER only) -----
  // Members who haven't completed onboarding must go through /onboarding
  if (role === "MEMBER" && !onboardingCompleted && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  // Redirect away from /onboarding if already completed
  if (pathname.startsWith("/onboarding") && onboardingCompleted) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // ----- Optimistic role checks -----
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix) && !allowedRoles.includes(role ?? "")) {
      // Gym owners (any role) can reach /admin to manage their gym's equipment
      if (prefix === "/admin" && isGymOwner) continue
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|manifest).*)"],
}
