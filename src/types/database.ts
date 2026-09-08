// ============================================================
// GroupPick v2.0 — Supabase Database Type Definitions
// Keep in sync with supabase/migration-v2.0-grouppick.sql
// ============================================================

// ── Category Types ───────────────────────────────────────────
export type CategoryType = "apartment" | "bride_venue" | "car";

// ── Reaction Types ───────────────────────────────────────────
export type ReactionStatus = "liked" | "review" | "rejected";
export type ReactionsMap = Record<string, ReactionStatus>;

// Legacy status type (kept for backward compatibility)
export type ApartmentStatus = "all" | "liked" | "review" | "rejected";

// ── Household Types ──────────────────────────────────────────
export interface Household {
  id: string;
  name: string;
  category: CategoryType;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export interface HouseholdInsert {
  id?: string;
  name: string;
  category: CategoryType;
  invite_code?: string;
  created_by?: string;
  created_at?: string;
}

// ── Profile Types ────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  household_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email?: string | null;
  full_name: string;
  avatar_url?: string | null;
  household_id?: string | null;
}

export interface ProfileUpdate {
  email?: string | null;
  full_name?: string;
  avatar_url?: string | null;
  household_id?: string | null;
  updated_at?: string;
}

// ── Category-Specific Metadata ───────────────────────────────
export interface ApartmentMetadata {
  floor?: number;
  parking?: boolean;
  balcony?: boolean;
  elevator?: boolean;
  furnished?: boolean;
  pet_friendly?: boolean;
}

export interface BrideVenueMetadata {
  distance_km?: number;
  suites?: number;
  max_guests?: number;
  catering?: boolean;
  spa?: boolean;
  pool?: boolean;
}

export interface CarMetadata {
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  owner_type?: string; // "private" | "dealer"
}

export type ItemMetadata = ApartmentMetadata | BrideVenueMetadata | CarMetadata;

// ── Item Types (Generalized Apartment) ───────────────────────
export interface Item {
  id: string;
  household_id: string;
  category: CategoryType;
  url: string | null;
  title: string;
  price: number;
  rooms: string | null;
  phone: string | null;
  seller_name: string | null;
  image_url: string | null;
  images: string[] | null;
  reactions: ReactionsMap;
  metadata: ItemMetadata;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ApartmentStatus;  // Legacy field
  created_at: string;
}

// Alias for backward compatibility
export type Apartment = Item;

export interface ItemInsert {
  id?: string;
  created_at?: string;
  household_id: string;
  category?: CategoryType;
  url?: string | null;
  title: string;
  price: number;
  rooms?: string | null;
  phone?: string | null;
  seller_name?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  reactions?: ReactionsMap;
  metadata?: ItemMetadata;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: ApartmentStatus;
}

export type ApartmentInsert = ItemInsert;

export interface ItemUpdate {
  id?: string;
  created_at?: string;
  household_id?: string;
  category?: CategoryType;
  url?: string | null;
  title?: string;
  price?: number;
  rooms?: string | null;
  phone?: string | null;
  seller_name?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  reactions?: ReactionsMap;
  metadata?: ItemMetadata;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: ApartmentStatus;
}

export type ApartmentUpdate = ItemUpdate;

// ── Database Schema ──────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      households: {
        Row: Household;
        Insert: HouseholdInsert;
        Update: Partial<HouseholdInsert>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      apartments: {
        Row: Item;
        Insert: ItemInsert;
        Update: ItemUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ── UI / Component Helper Types ──────────────────────────────

export type FilterStatus = ApartmentStatus;

export type ReactionFilterType = 
  | "all"
  | "liked-by-both"
  | "liked-by-me"
  | "liked-by-partner"
  | "review"
  | "rejected-by-any"
  | "no-reaction";

export interface FilterTab {
  label: string;
  value: FilterStatus;
  emoji: string;
}

export type SortOption = "newest" | "oldest" | "price-asc" | "price-desc";

export interface FilterState {
  reactionFilter: ReactionFilterType;
  roomsFilter: string | null;
  priceSort: SortOption;
  searchQuery: string;
}

// ── Form Data Types ──────────────────────────────────────────
export interface ApartmentFormData {
  url: string;
  title: string;
  price: string;
  rooms: string;
  phone: string;
  seller_name: string;
  image_url: string;
  images: string[];
  notes: string;
  status: ApartmentStatus;
  // Category-specific fields stored in metadata
  metadata: ItemMetadata;
}

// ── Auth & Household Context ─────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
}

export interface HouseholdMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface HouseholdContextState {
  user: AuthUser | null;
  profile: Profile | null;
  household: Household | null;
  members: HouseholdMember[];
  isLoading: boolean;
  isAuthenticated: boolean;
  hasHousehold: boolean;
}

// ── Category Configuration ───────────────────────────────────
export interface CategoryConfig {
  id: CategoryType;
  label: string;
  emoji: string;
  titleLabel: string;
  priceLabel: string;
  priceUnit: string;
  fields: CategoryFieldConfig[];
}

export interface CategoryFieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

// Category configurations
export const CATEGORY_CONFIGS: Record<CategoryType, CategoryConfig> = {
  apartment: {
    id: "apartment",
    label: "Apartments",
    emoji: "🏠",
    titleLabel: "Address",
    priceLabel: "Monthly Rent",
    priceUnit: "₪/month",
    fields: [
      { key: "floor", label: "Floor", type: "number" },
      { key: "parking", label: "Parking", type: "boolean" },
      { key: "balcony", label: "Balcony", type: "boolean" },
      { key: "elevator", label: "Elevator", type: "boolean" },
      { key: "furnished", label: "Furnished", type: "boolean" },
      { key: "pet_friendly", label: "Pet Friendly", type: "boolean" },
    ],
  },
  bride_venue: {
    id: "bride_venue",
    label: "Bride Venues",
    emoji: "👰",
    titleLabel: "Venue Name",
    priceLabel: "Price per Night",
    priceUnit: "₪/night",
    fields: [
      { key: "distance_km", label: "Distance (km)", type: "number" },
      { key: "suites", label: "Number of Suites", type: "number" },
      { key: "max_guests", label: "Max Guests", type: "number" },
      { key: "catering", label: "Catering", type: "boolean" },
      { key: "spa", label: "Spa", type: "boolean" },
      { key: "pool", label: "Pool", type: "boolean" },
    ],
  },
  car: {
    id: "car",
    label: "Cars",
    emoji: "🚗",
    titleLabel: "Car Title",
    priceLabel: "Price",
    priceUnit: "₪",
    fields: [
      { key: "make", label: "Make", type: "text", placeholder: "e.g., Toyota" },
      { key: "model", label: "Model", type: "text", placeholder: "e.g., Camry" },
      { key: "year", label: "Year", type: "number" },
      { key: "mileage", label: "Mileage (km)", type: "number" },
      { key: "fuel_type", label: "Fuel Type", type: "select", options: [
        { value: "gasoline", label: "Gasoline" },
        { value: "diesel", label: "Diesel" },
        { value: "hybrid", label: "Hybrid" },
        { value: "electric", label: "Electric" },
      ]},
      { key: "transmission", label: "Transmission", type: "select", options: [
        { value: "automatic", label: "Automatic" },
        { value: "manual", label: "Manual" },
      ]},
      { key: "owner_type", label: "Owner Type", type: "select", options: [
        { value: "private", label: "Private" },
        { value: "dealer", label: "Dealer" },
      ]},
    ],
  },
};
