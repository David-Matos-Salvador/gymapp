import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function proxy(request: Request) {
  const session = await auth()

  const { pathname } = new URL(request.url)

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/coach")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register|$).*)"],
}
