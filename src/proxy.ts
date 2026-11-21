import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { REQUEST_ID_HEADER, appendRequestId, getRequestId } from "@/lib/request-id"

/**
 * Paths that are always public (no auth required).
 * Note: /_next/*, /favicon.ico, /icons, /manifest are already excluded
 * by the config.matcher below and never reach this function.
 */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/invite",
  "/gym/",
  "/forgot-password",
  "/reset-password",
]

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

function nextWithRequestId(request: NextRequest, requestId: string) {
  const response = NextResponse.next({
    request: { headers: appendRequestId(request.headers, requestId) },
  })
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

function redirectWithRequestId(url: URL, requestId: string) {
  const response = NextResponse.redirect(url)
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestId = getRequestId(request)

  // API routes authenticate themselves. Only propagate the request id so
  // route handlers and logs share the same correlation value.
  if (pathname.startsWith("/api")) {
    return nextWithRequestId(request, requestId)
  }

  // Comprobantes viejos guardados en public/: ya no se sirven a nadie (los nuevos van por
  // /api/files, que revisa quién puede verlos).
  if (pathname.startsWith("/uploads/receipts/")) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
  }

  // ----- Public routes (no auth required) -----
  // Sin sesión solo se ven la portada, la página pública de cada gimnasio y el acceso.
  if (pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return nextWithRequestId(request, requestId)
  }

  // ----- Auth check -----
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return redirectWithRequestId(loginUrl, requestId)
  }

  const role = (session.user as { role?: string }).role
  const onboardingCompleted = (
    session.user as {
      onboardingCompleted?: boolean
    }
  ).onboardingCompleted

  // ----- Onboarding gate (MEMBER only) -----
  // Members who haven't completed onboarding must go through /onboarding
  if (role === "MEMBER" && !onboardingCompleted && !pathname.startsWith("/onboarding")) {
    return redirectWithRequestId(new URL("/onboarding", request.url), requestId)
  }

  // Redirect away from /onboarding if already completed
  if (pathname.startsWith("/onboarding") && onboardingCompleted) {
    return redirectWithRequestId(new URL("/dashboard", request.url), requestId)
  }

  // ----- Optimistic role checks -----
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix) && !allowedRoles.includes(role ?? "")) {
      return redirectWithRequestId(new URL("/dashboard", request.url), requestId)
    }
  }

  return nextWithRequestId(request, requestId)
}

export const config = {
  matcher: ["/api/:path*", "/((?!api|_next/static|_next/image|favicon.ico|icons|manifest).*)"],
}
