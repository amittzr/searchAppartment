// ============================================================
// Supabase Database type definitions
// Keep in sync with supabase/schema.sql
// ============================================================

// Reaction status for individual users
export type ReactionStatus = "liked" | "review" | "rejected";

// Legacy status type (kept for backward compatibility in filters)
export type ApartmentStatus = "all" | "liked" | "review" | "rejected";

// Reactions object: maps username to their reaction
export type ReactionsMap = Record<string, ReactionStatus>;

// Full row as returned from the database
export interface Apartment {
  id: string;
  household_id: string;           // Multi-tenant household isolation
  url: string | null;
  title: string;
  price: number;
  rooms: string | null;           // Room count (e.g., "3" or "3.5")
  phone: string | null;
  seller_name: string | null;
  image_url: string | null;
  images: string[] | null;        // Array of all image URLs for gallery
  reactions: ReactionsMap;        // Per-user reactions { "Amit": "liked", "Noa": "review" }
  status: ApartmentStatus;        // Legacy field (deprecated, kept for migration)
  notes: string | null;
  created_at: string;
}

// Shape used when inserting — id and created_at are server-generated
export interface ApartmentInsert {
  id?: string;
  created_at?: string;
  household_id: string;           // Required for multi-tenant isolation
  url?: string | null;
  title: string;
  price: number;
  rooms?: string | null;
  phone?: string | null;
  seller_name?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  reactions?: ReactionsMap;
  status?: ApartmentStatus;       // Legacy field
  notes?: string | null;
}

// Shape used when updating — every field is optional
export interface ApartmentUpdate {
  id?: string;
  created_at?: string;
  household_id?: string;
  url?: string | null;
  title?: string;
  price?: number;
  rooms?: string | null;
  phone?: string | null;
  seller_name?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  reactions?: ReactionsMap;
  status?: ApartmentStatus;       // Legacy field
  notes?: string | null;
}

// ============================================================
// Supabase typed database schema
// Must match the exact shape expected by @supabase/supabase-js
// ============================================================
export interface Database {
  public: {
    Tables: {
      apartments: {
        Row: Apartment;
        Insert: ApartmentInsert;
        Update: ApartmentUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ============================================================
// UI / component helper types
// ============================================================

// Filter status — "all" means show everything, others filter by reaction status
export type FilterStatus = ApartmentStatus;

// Reaction filter options for advanced filtering
export type ReactionFilterType = 
  | "all"                    // Show all apartments
  | "liked-by-both"          // Both users liked
  | "liked-by-me"            // Current user liked
  | "liked-by-partner"       // Partner liked
  | "review"                 // Any user marked for review
  | "rejected-by-any"        // Any user rejected
  | "no-reaction";           // No reactions yet

export interface FilterTab {
  label: string;
  value: FilterStatus;
  emoji: string;
}

// Sort options for apartments list
export type SortOption = "newest" | "oldest" | "price-asc" | "price-desc";

// Advanced filter state
export interface FilterState {
  reactionFilter: ReactionFilterType;
  roomsFilter: string | null;      // null = all, "2", "3", "4+"
  priceSort: SortOption;
  searchQuery: string;
}

// Form data shape used inside ApartmentModal
// price is a string for controlled <input type="number">, parsed on submit
export interface ApartmentFormData {
  url: string;
  title: string;
  price: string;
  rooms: string;                   // Room count for the form
  phone: string;
  seller_name: string;
  image_url: string;
  images: string[];
  notes: string;
  status: ApartmentStatus;         // Legacy field, kept for backward compat
}

// Household context types
export interface HouseholdState {
  householdId: string;
  username: string;
  partnerName: string;
}
