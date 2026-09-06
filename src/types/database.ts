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

// Shape used when inserting — id and created_at are server-generated
export interface ApartmentInsert {
  id?: string;
  created_at?: string;
  url?: string | null;
  title: string;
  price: number;
  phone?: string | null;
  image_url?: string | null;
  status?: ApartmentStatus;
  notes?: string | null;
}

// Shape used when updating — every field is optional
export interface ApartmentUpdate {
  id?: string;
  created_at?: string;
  url?: string | null;
  title?: string;
  price?: number;
  phone?: string | null;
  image_url?: string | null;
  status?: ApartmentStatus;
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

// Filter status — "all" means show everything, others filter by status value
export type FilterStatus = ApartmentStatus;

export interface FilterTab {
  label: string;
  value: FilterStatus;
  emoji: string;
}

// Form data shape used inside ApartmentModal
// price is a string for controlled <input type="number">, parsed on submit
export interface ApartmentFormData {
  url: string;
  title: string;
  price: string;
  phone: string;
  image_url: string;
  notes: string;
  status: ApartmentStatus;
}
