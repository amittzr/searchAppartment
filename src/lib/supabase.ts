import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// These values are injected at build time from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local"
  );
}

// Singleton Supabase client typed against our Database schema
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      // Receive all change events (INSERT, UPDATE, DELETE) for real-time sync
      eventsPerSecond: 10,
    },
  },
});
