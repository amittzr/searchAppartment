// ============================================================
// Client-side Supabase client for Next.js App Router
// Uses @supabase/ssr for proper cookie handling in browser
// ============================================================

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client for Client Components
 * This client handles auth cookies automatically in the browser
 */
export function createClientSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton instance for client-side use
let clientInstance: ReturnType<typeof createClientSupabaseClient> | null = null;

/**
 * Gets or creates the singleton Supabase client for browser use
 * Use this for hooks and client components
 */
export function getSupabaseClient() {
  if (typeof window === "undefined") {
    // Server-side: always create new instance
    return createClientSupabaseClient();
  }
  
  // Client-side: use singleton
  if (!clientInstance) {
    clientInstance = createClientSupabaseClient();
  }
  
  return clientInstance;
}

// Re-export the typed client for backward compatibility
export const supabase = typeof window !== "undefined" 
  ? getSupabaseClient() 
  : null;
