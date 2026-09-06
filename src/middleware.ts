import { NextRequest, NextResponse } from "next/server";

// Routes that are always publicly accessible (no session required)
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and Next.js internals through without a check
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublic) {
    return NextResponse.next();
  }

  // Check for the session cookie set by the login API route
  const session = request.cookies.get("apt_session");

  if (!session || session.value !== "authenticated") {
    // Redirect unauthenticated users to the login page,
    // preserving the originally requested URL as a `from` param
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Apply middleware to every route except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
