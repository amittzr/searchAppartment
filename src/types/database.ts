// ============================================================
// Supabase Database type definitions
// Keep in sync with supabase/schema.sql
// ============================================================

export type ApartmentStatus = "all" | "liked" | "review" | "rejected";

// Full row as returned from the database
export interface Apartment {
  id: string;
  url: string | null;
  title: string;
  price: number;
  phone: string | null;
  image_url: string | null;
  status: ApartmentStatus;
  notes: string | null;
  created_at: string;
}

// Shape used when inserting a new apartment (id and created_at are auto-generated)
export type ApartmentInsert = Omit<Apartment, "id" | "created_at">;

// Shape used when updating — all fields optional except id
export type ApartmentUpdate = Partial<ApartmentInsert>;

// ============================================================
// Supabase typed database schema (used by the client)
// ============================================================
export interface Database {
  public: {
    Tables: {
      apartments: {
        Row: Apartment;
        Insert: ApartmentInsert & { id?: string; created_at?: string };
        Update: ApartmentUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ============================================================
// UI / component helper types
// ============================================================

// Filter tab options shown in the FilterTabs component
export type FilterStatus = ApartmentStatus;

export interface FilterTab {
  label: string;
  value: FilterStatus;
  emoji: string;
}

// Form data shape used inside ApartmentModal
export interface ApartmentFormData {
  url: string;
  title: string;
  price: string; // kept as string for controlled input, parsed to number on submit
  phone: string;
  image_url: string;
  notes: string;
  status: ApartmentStatus;
}
