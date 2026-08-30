import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/admin-auth/cookies";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login flow and the auth Route Handlers themselves must stay
  // reachable without an existing session -- that's the whole point of them.
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/api/auth")) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE) || request.cookies.has(REFRESH_TOKEN_COOKIE);
  if (!hasSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
