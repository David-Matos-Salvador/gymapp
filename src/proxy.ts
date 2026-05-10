import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/register", "/onboarding", "/api", "/_next", "/favicon.ico", "/manifest", "/icons"]

export async function proxy(request: Request) {
  const { pathname } = new URL(request.url)

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname === "/") {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|manifest).*)"],
}
