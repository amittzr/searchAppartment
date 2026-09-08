# GroupPick — Project Specification

> A private, real-time collaborative decision-making app for couples.
> Track apartments, wedding venues, cars, or any category together.
> Built with Next.js 15, Supabase Auth, and Tailwind CSS. Deployed on Vercel.

---

## Status: ✅ Live in Production

- **Production URL:** https://search-appartment.vercel.app *(update if domain changes)*
- **Repository:** https://github.com/amittzr/searchAppartment
- **Database:** Supabase — project `khozzonoqctwbzsowulv` (ap-southeast-1, Singapore)
- **Current Version:** v2.0 — September 2026

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.25 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^3.4.1 |
| Icons | lucide-react | ^0.460.0 |
| Database | Supabase (PostgreSQL) | ^2.45.4 |
| Authentication | Supabase Auth + @supabase/ssr | ^0.5.2 |
| Maps | Leaflet (CDN) | 1.9.4 |
| Geocoding | Nominatim (OpenStreetMap) | Free API |
| Deployment | Vercel | — |

---

## Architecture Overview

```
src/
├── app/
│   ├── page.tsx              ← Main dashboard (filter, grid, map, modals)
│   ├── layout.tsx            ← Root layout, HouseholdProvider wrapper
│   ├── globals.css           ← Tailwind base + custom animations
│   ├── login/
│   │   └── page.tsx          ← Supabase Auth login page
│   ├── signup/
│   │   └── page.tsx          ← Supabase Auth signup (with invite password gate)
│   ├── onboarding/
│   │   └── page.tsx          ← Create or join household flow
│   ├── setup/
│   │   └── page.tsx          ← Bookmarklet setup page
│   └── api/
│       └── scrape-yad2/route.ts  ← POST: Yad2 auto-fill scraper API
├── components/
│   ├── Navbar.tsx            ← Sticky header: household info, user menu, add button
│   ├── FilterToolbar.tsx     ← Advanced filters: search, rooms, sort, reactions
│   ├── ApartmentCard.tsx     ← Card: image, price, reactions, category badges
│   ├── ApartmentModal.tsx    ← Add/Edit form with dynamic category fields
│   ├── CategoryFields.tsx    ← Dynamic form fields based on category type
│   ├── MapView.tsx           ← Interactive map with apartment markers
│   ├── HouseholdSettingsModal.tsx ← Household info, editable invite code, members
│   └── LoadingSkeleton.tsx   ← Shimmer placeholder grid
├── contexts/
│   └── HouseholdContext.tsx  ← Auth state, profile, household, members (Supabase)
├── hooks/
│   ├── useApartments.ts      ← CRUD + reactions + household scoping + Realtime
│   └── useYad2AutoFill.ts    ← Auto-fill hook for Yad2 URLs
├── lib/
│   ├── supabase-client.ts    ← Browser Supabase client (singleton)
│   ├── supabase-server.ts    ← Server Components Supabase client
│   ├── supabase-middleware.ts ← Middleware Supabase client (session refresh)
│   └── geocode.ts            ← Nominatim geocoding utility
├── types/
│   └── database.ts           ← Types: Apartment, Profile, Household, CategoryConfig
└── middleware.ts              ← Auth guard: redirect unauthenticated to /login
```

---

## Database Schema (Supabase PostgreSQL)

### Table: `public.households`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `name` | text NOT NULL | Household display name (e.g., "Amit & Noa") |
| `category` | text NOT NULL | 'apartment' \| 'bride_venue' \| 'car' |
| `invite_code` | text UNIQUE | 8-char hex or custom code for joining |
| `created_by` | uuid | References auth.users(id) |
| `created_at` | timestamptz | Auto-set to now() |

### Table: `public.profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, references auth.users(id) |
| `email` | text | User's email |
| `full_name` | text NOT NULL | Display name for reactions |
| `avatar_url` | text | Optional profile image |
| `household_id` | uuid | References households(id), nullable until joined |
| `created_at` | timestamptz | Auto-set to now() |
| `updated_at` | timestamptz | Auto-updated |

### Table: `public.apartments` (Items)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `household_id` | uuid NOT NULL | References households(id) — **UUID type** |
| `category` | text | Inherited from household: apartment/bride_venue/car |
| `url` | text | Link to original listing |
| `title` | text NOT NULL | Address or item title |
| `price` | integer NOT NULL | Price in ₪ |
| `rooms` | text | Number of rooms (apartments/venues only) |
| `phone` | text | Contact phone |
| `seller_name` | text | Contact name |
| `image_url` | text | Hero image URL |
| `images` | jsonb | Array of all image URLs |
| `reactions` | jsonb | Per-user reactions: `{"Amit": "loved", "Noa": "liked"}` |
| `metadata` | jsonb | Category-specific fields (see below) |
| `notes` | text | Shared notes |
| `latitude` | double precision | Map coordinates |
| `longitude` | double precision | Map coordinates |
| `status` | text | DEPRECATED — kept for backward compat |
| `created_at` | timestamptz | Auto-set to now() |

### Category-Specific Metadata Fields

**Apartment (`category: 'apartment'`):**
```json
{
  "floor": "3",
  "parking": true,
  "elevator": true,
  "balcony": true,
  "pets_allowed": false,
  "air_conditioning": true
}
```

**Wedding Venue (`category: 'bride_venue'`):**
```json
{
  "capacity": "200",
  "venue_type": "hall",
  "catering_included": true,
  "outdoor_area": true,
  "distance_km": "15"
}
```

**Car (`category: 'car'`):**
```json
{
  "year": "2022",
  "mileage": "45000",
  "fuel_type": "hybrid",
  "transmission": "automatic",
  "color": "white"
}
```

---

## Authentication (v2.0)

### Overview
- **Provider:** Supabase Auth with email/password
- **Session:** Managed via `@supabase/ssr` with secure httpOnly cookies
- **Middleware:** `src/middleware.ts` refreshes session and guards protected routes

### Auth Flow
1. **Signup** (`/signup`)
   - Requires **invite password** (`NEXT_PUBLIC_APP_PASSWORD`) to prevent unauthorized signups
   - Creates user in `auth.users`
   - Trigger auto-creates profile in `public.profiles`
   - Redirects to `/onboarding`

2. **Onboarding** (`/onboarding`)
   - User chooses: **Create Household** or **Join Household**
   - Create: Pick category, name, optional custom invite code
   - Join: Enter partner's invite code
   - Sets `profiles.household_id`

3. **Login** (`/login`)
   - Email/password authentication
   - Redirects to `/onboarding` if no household, else `/`

4. **Session Refresh**
   - Middleware refreshes session on every request
   - Cookies managed by Supabase SSR helpers

### Route Protection
| Route | Access |
|---|---|
| `/login`, `/signup` | Public (redirects to app if authenticated) |
| `/onboarding` | Auth required, no household required |
| `/`, all other routes | Auth + household required |

---

## Row Level Security (RLS)

### Security Function
```sql
CREATE FUNCTION public.get_my_household_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT household_id FROM public.profiles WHERE id = auth.uid() $$;
```

### Policies

**Households:**
- SELECT: `id = get_my_household_id()`
- INSERT: `auth.uid() IS NOT NULL`
- UPDATE: `id = get_my_household_id()`

**Profiles:**
- SELECT own: `id = auth.uid()`
- SELECT members: `household_id = get_my_household_id()`
- INSERT: `id = auth.uid()`
- UPDATE: `id = auth.uid()`

**Apartments:**
- SELECT/INSERT/UPDATE/DELETE: `household_id = get_my_household_id()`

---

## Environment Variables

| Variable | Where Set | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Supabase anon JWT |
| `NEXT_PUBLIC_APP_PASSWORD` | Vercel + `.env.local` | Gate password for signup |
| `APP_PASSWORD` | Vercel + `.env.local` | Server-side reference (same value) |
| `YAD2_COOKIES` | `.env.local` only | Browser cookies for Yad2 scraping |

---

## Features by Version

### v1.0 — Core Features
- [x] Add/Edit/Delete apartments with modal forms
- [x] Real-time sync via Supabase Realtime
- [x] Source auto-detection: Yad2 / Facebook from URL
- [x] Phone click-to-call + seller name display
- [x] Shared notes per apartment
- [x] Responsive mobile-first design
- [x] Loading skeletons + empty states
- [x] Shared password authentication

### v1.1 — Yad2 Auto-Fill
- [x] Paste Yad2 URL → Auto-Fill extracts all data
- [x] Server-side scraping with cookie auth
- [x] Bookmarklet for one-click save
- [x] Expandable card with photo gallery

### v1.2 — Multi-Household & Reactions
- [x] `household_id` field for multi-tenant isolation
- [x] Per-user reactions: liked/review/rejected independently
- [x] Dual reaction badges showing both partners' status
- [x] Match indicator when both partners like same item
- [x] `rooms` field from Yad2
- [x] FilterToolbar: search, rooms, sort, reaction filters

### v1.3 — Interactive Map
- [x] Full-screen Leaflet map view
- [x] Auto-geocoding with Nominatim
- [x] Color-coded markers by reaction status
- [x] Click marker → mini card with actions

### v2.0 — GroupPick (Real Auth & Multi-Category)

#### Authentication Overhaul
- [x] **Supabase Auth** replaces shared password
- [x] **Signup page** with invite password gate
- [x] **Login page** with email/password
- [x] **Onboarding flow** — create or join household
- [x] **Session management** via @supabase/ssr cookies
- [x] **Middleware auth guard** with proper redirects
- [x] **Auto-create profile** trigger on signup

#### Database Restructure
- [x] **households table** — UUID primary key, category, invite_code
- [x] **profiles table** — links auth.users to household membership
- [x] **apartments.household_id** — converted from TEXT to UUID
- [x] **RLS policies** — proper row-level security with SECURITY DEFINER function
- [x] **Realtime** enabled on all tables

#### Household Management
- [x] **Create household** — pick name, category, optional custom invite code
- [x] **Join household** — enter partner's invite code
- [x] **Invite codes** — auto-generated (8-char hex) or custom (4+ alphanumeric)
- [x] **Edit invite code** — change anytime from settings modal
- [x] **Copy invite code** — one-click copy to clipboard
- [x] **View members** — see who's in your household

#### Multi-Category Support
- [x] **Category selection** — apartment, bride_venue, or car
- [x] **Dynamic form fields** — fields change based on category
- [x] **Category-specific metadata** — stored in JSONB column
- [x] **Dynamic labels** — "Add Apartment" vs "Add Venue" vs "Add Car"
- [x] **Category badges** — year/mileage for cars, distance for venues

#### Reaction System Upgrade
- [x] **4 reaction types:** ❤️ Loved, 👍 Liked, 👎 Disliked, ❌ Veto
- [x] **Match detection** — both partners ❤️ = Match! highlight
- [x] **Reaction counts** — see totals per item

---

## SQL Migrations

### v2.0 Migration (Full)
Located at: `supabase/migration-v2.0-grouppick.sql`

Key operations:
1. Create `households` table
2. Create `profiles` table
3. Convert `apartments.household_id` from TEXT to UUID
4. Add `category` and `metadata` columns to apartments
5. Create RLS policies
6. Create `handle_new_user()` trigger
7. Enable Realtime on new tables

### v2.0 RLS Fix
Located at: `supabase/fix-rls-recursion.sql`

Fixes infinite recursion in RLS policies by using SECURITY DEFINER function.

---

## Known Limitations

- RLS currently disabled for development (re-enable for production)
- Supabase free tier pauses after 1 week of inactivity
- Geocoding rate limit: 1 request per second (Nominatim)
- Email rate limit: 4 per hour per address (Supabase free tier)
- Single household per user (no multi-household switching yet)

---

## Development Commands

```bash
npm run dev       # Start local dev server at http://localhost:3000
npm run build     # Production build (TypeScript check + Next.js compile)
npm run start     # Run production build locally
npm run lint      # ESLint check
```

---

## Deployment

Push to `main` branch → Vercel auto-deploys.

**Required Vercel Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_PASSWORD`
- `APP_PASSWORD`

---

## Upgrade Roadmap

### v2.1 — Polish
- [ ] Re-enable RLS with proper auth token flow
- [ ] Toast notifications for actions
- [ ] "Visited" checkbox for apartments
- [ ] Leave household option

### v2.2 — Collaboration
- [ ] Comments thread per item
- [ ] Push notifications for new items
- [ ] Activity log

### v3.0 — Power Features
- [ ] Multiple households per user
- [ ] Facebook Marketplace scraper
- [ ] Side-by-side comparison view
- [ ] Export to PDF/Excel
