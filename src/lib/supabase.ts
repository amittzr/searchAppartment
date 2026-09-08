// ============================================================
// Legacy Supabase client export
// This file provides backward compatibility for existing hooks
// New code should use supabase-client.ts or supabase-server.ts
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local"
  );
}

// Legacy client for hooks that don't need auth
// For auth-aware operations, use supabase-client.ts or supabase-server.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Re-export client-side utilities only
// Server utilities should be imported directly from supabase-server.ts
export { getSupabaseClient, createClientSupabaseClient } from "./supabase-client";
