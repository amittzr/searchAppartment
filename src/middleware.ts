import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase-middleware";

// Routes that are publicly accessible (no auth required)
const PUBLIC_PATHS = ["/login", "/signup", "/api/auth"];

// Routes that require auth but NOT a household
const AUTH_ONLY_PATHS = ["/onboarding"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals and static assets through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if path is public
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));

  // Create Supabase client and refresh session
  const { supabase, response, user } = await createMiddlewareSupabaseClient(request);

  // Public paths - allow through, but redirect to home if already authenticated
  if (isPublic) {
    if (user && (pathname === "/login" || pathname === "/signup")) {
      // Check if user has a household
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("household_id")
        .eq("id", user.id)
        .single() as { data: { household_id: string | null } | null };

      if (profile?.household_id) {
        // Has household - redirect to home
        return NextResponse.redirect(new URL("/", request.url));
      } else {
        // No household - redirect to onboarding
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    }
    return response;
  }

  // Not authenticated - redirect to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth-only paths (onboarding) - check if user already has household
  if (isAuthOnly) {
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("household_id")
      .eq("id", user.id)
      .single() as { data: { household_id: string | null } | null };

    if (profile?.household_id) {
      // Already has household - redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Protected paths - require both auth AND household
  const { data: profile } = await (supabase
    .from("profiles") as any)
    .select("household_id")
    .eq("id", user.id)
    .single() as { data: { household_id: string | null } | null };

  if (!profile?.household_id) {
    // No household - redirect to onboarding
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return response;
}

// Apply middleware to every route except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
