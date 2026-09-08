// ============================================================
// Middleware Supabase client for Next.js
// Used in middleware.ts for session refresh
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Creates a Supabase client for middleware
 * Handles cookie reading/writing in the middleware context
 */
export async function createMiddlewareSupabaseClient(request: NextRequest) {
  // Create a response to modify cookies on
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // Set cookies on the request for downstream handlers
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          
          // Update the response with new cookies
          supabaseResponse = NextResponse.next({
            request,
          });
          
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  // This is critical for keeping the session alive
  const { data: { user } } = await supabase.auth.getUser();

  return { supabase, response: supabaseResponse, user };
}
