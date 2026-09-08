// ============================================================
// Server-side Supabase client for Next.js App Router
// Uses @supabase/ssr for proper cookie handling
// ============================================================

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client for Server Components and Server Actions
 * This client reads cookies for session management
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Gets the current authenticated user from the server
 * Returns null if not authenticated
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Gets the current user's profile with household data
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getServerProfile() {
  const supabase = await createServerSupabaseClient();
  const user = await getServerUser();
  
  if (!user) {
    return null;
  }
  
  const { data: profile, error } = await (supabase
    .from("profiles") as any)
    .select("*, households(*)")
    .eq("id", user.id)
    .single();
  
  if (error || !profile) {
    return null;
  }
  
  return profile;
}

/**
 * Gets the current session from the server
 * Returns null if not authenticated
 */
export async function getServerSession() {
  const supabase = await createServerSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session;
}
