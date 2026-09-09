# GroupPick — Project Specification

> A private, real-time collaborative decision-making app for couples.
> Track apartments, wedding venues, cars, or any category together.
> Built with Next.js 15, Supabase Auth, and Tailwind CSS. Deployed on Vercel.

---

## Status: ✅ Live in Production

- **Production URL:** https://search-appartment.vercel.app
- **Repository:** https://github.com/amittzr/searchAppartment
- **Database:** Supabase — project `khozzonoqctwbzsowulv` (ap-southeast-1, Singapore)
- **Current Version:** v2.2 — September 2026

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
│   ├── page.tsx                  ← Main dashboard (filter, grid, map, modals)
│   ├── layout.tsx                ← Root layout, HouseholdProvider wrapper
│   ├── globals.css               ← Tailwind base + custom animations
│   ├── login/page.tsx            ← Supabase Auth login page
│   ├── signup/page.tsx           ← Supabase Auth signup (with invite password gate)
│   ├── onboarding/page.tsx       ← Create or join household flow
│   ├── setup/page.tsx            ← Bookmarklet setup page (dynamic APP_URL)
│   └── api/scrape-yad2/route.ts  ← POST: Yad2 + yad-il scraper API
├── components/
│   ├── Navbar.tsx                ← Sticky header: household info, user menu, add button
│   ├── FilterToolbar.tsx         ← Filters: search, room range, sort, reaction pills
│   ├── ApartmentCard.tsx         ← Card: image, price, reactions, NEW badge
│   ├── ApartmentModal.tsx        ← Add/Edit form: dynamic fields, notes thread, image upload
│   ├── CategoryFields.tsx        ← Dynamic form fields based on category type
│   ├── NotesThread.tsx           ← Chat-style threaded notes component
│   ├── MapView.tsx               ← Interactive map — all categories
│   ├── HouseholdSettingsModal.tsx ← Household info, editable invite code, members
│   └── LoadingSkeleton.tsx       ← Shimmer placeholder grid
├── contexts/
│   └── HouseholdContext.tsx      ← Auth state, profile, household, members
├── hooks/
│   ├── useApartments.ts          ← CRUD + reactions + markAsViewed + Realtime
│   └── useYad2AutoFill.ts        ← Auto-fill hook for yad2.co.il + yad-il.co.il
├── lib/
│   ├── supabase-client.ts        ← Browser Supabase client (singleton)
│   ├── supabase-server.ts        ← Server Components Supabase client
│   ├── supabase-middleware.ts    ← Middleware Supabase client (session refresh)
│   ├── upload-images.ts          ← Supabase Storage image upload utility
│   └── geocode.ts                ← Nominatim geocoding utility
├── types/
│   └── database.ts               ← All types: Item, Profile, Household, FilterState, etc.
└── middleware.ts                  ← Auth guard: redirect unauthenticated to /login
```

---

## Database Schema (Supabase PostgreSQL)

### `public.households`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text NOT NULL | e.g., "Amit & Noa" |
| `category` | text NOT NULL | `apartment` \| `bride_venue` \| `car` |
| `invite_code` | text UNIQUE | 8-char hex or custom |
| `created_by` | uuid | References auth.users(id) |
| `created_at` | timestamptz | Auto-set |

### `public.profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | References auth.users(id) |
| `email` | text | User email |
| `full_name` | text NOT NULL | Display name for reactions |
| `avatar_url` | text | Optional |
| `household_id` | uuid | References households(id) |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-updated |

### `public.apartments` (Items)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `household_id` | uuid NOT NULL | UUID — references households(id) |
| `category` | text | `apartment` \| `bride_venue` \| `car` |
| `url` | text | Original listing link |
| `title` | text NOT NULL | Address or item title |
| `price` | integer NOT NULL | Price in ₪ |
| `rooms` | text | Room count (apartments/venues) |
| `phone` | text | Contact phone |
| `seller_name` | text | Contact name |
| `image_url` | text | Hero image URL (external or Supabase Storage) |
| `images` | jsonb | Array of all image URLs (mixed external + uploaded) |
| `reactions` | jsonb | `{"Amit": "liked", "Noa": "loved"}` |
| `metadata` | jsonb | Category-specific fields |
| `notes` | jsonb | Threaded notes: `[{userId, userName, text, createdAt}]` |
| `viewed_by` | jsonb | Array of user IDs who have seen this item |
| `latitude` | double precision | Geocoded coordinates |
| `longitude` | double precision | Geocoded coordinates |
| `status` | text | DEPRECATED — kept for backward compat |
| `created_at` | timestamptz | Auto-set |

---

## Authentication (v2.0)

### Flow
1. **Signup** (`/signup`) — invite password gate → Supabase Auth → auto-create profile → `/onboarding`
2. **Onboarding** (`/onboarding`) — Create household (name, category, optional custom invite code) OR Join with invite code
3. **Login** (`/login`) — email/password → redirect to app or onboarding
4. **Middleware** — refreshes session every request, guards all protected routes

### Route Protection
| Route | Access |
|---|---|
| `/login`, `/signup` | Public |
| `/onboarding` | Auth required, no household required |
| `/` and all others | Auth + household required |

---

## Row Level Security (RLS)

```sql
CREATE FUNCTION public.get_my_household_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT household_id FROM public.profiles WHERE id = auth.uid() $$;
```

| Table | Policy |
|---|---|
| households | SELECT: `id = get_my_household_id()` · INSERT: `auth.uid() IS NOT NULL` · UPDATE: `id = get_my_household_id()` |
| profiles | SELECT own: `id = auth.uid()` · SELECT members: `household_id = get_my_household_id()` · INSERT/UPDATE own |
| apartments | SELECT/INSERT/UPDATE/DELETE: `household_id = get_my_household_id()` |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon JWT |
| `NEXT_PUBLIC_APP_PASSWORD` | Gate password for signup |
| `APP_PASSWORD` | Server-side reference |
| `YAD2_COOKIES` | Browser cookies for Yad2 scraping (`.env.local` only) |

---

## Features by Version

### v1.0 — Core
- [x] Add/Edit/Delete items with modal forms
- [x] Real-time sync via Supabase Realtime
- [x] Phone click-to-call + seller name
- [x] Shared notes, responsive design, loading skeletons

### v1.1 — Yad2 Auto-Fill
- [x] Paste Yad2 URL → Auto-Fill extracts all data
- [x] Server-side scraping with cookie auth
- [x] Bookmarklet for one-click save
- [x] Expandable card with photo gallery

### v1.2 — Reactions & Filtering
- [x] Per-user reactions: liked/review/rejected
- [x] Match indicator when both partners like same item
- [x] Dual reaction badges on cards
- [x] FilterToolbar: search, rooms, sort, reaction filters

### v1.3 — Interactive Map
- [x] Full-screen Leaflet map view
- [x] Auto-geocoding with Nominatim
- [x] Color-coded markers by reaction status
- [x] Click marker → mini card with actions

### v2.0 — GroupPick (Real Auth & Multi-Category)
- [x] **Supabase Auth** replaces shared password
- [x] **Signup** with invite password gate
- [x] **Onboarding** — create or join household
- [x] **households + profiles tables** with RLS
- [x] **apartments.household_id** converted TEXT → UUID
- [x] **Multi-category** — apartment, bride_venue, car
- [x] **Dynamic form fields** per category
- [x] **Invite codes** — auto-generated or custom, editable in settings
- [x] **4 reaction types** — ❤️ Loved, 👍 Liked, 👎 Disliked, ❌ Veto

### v2.1 — Scraper, Notes, Images, Read Receipts

#### Yad2 Scraper Improvements
- [x] **yad-il.co.il support** — both `yad2.co.il` and `yad-il.co.il` domains accepted
- [x] **Multi-query scan** — scans all `dehydratedState.queries[]` (fixes yad-il data at index 1)
- [x] **Rooms fallback chain** — `infoBar[]`, `additional_info`, `details`, regex scan
- [x] **Multi-endpoint phone** — tries 3 customer API endpoints
- [x] **Referer fix** — always sends `yad2.co.il` as Referer to gateway

#### Bookmarklet
- [x] **yad-il.co.il support** — works on both domains
- [x] **Multi-query scan** — same fix as server
- [x] **Graceful fallback** — `autoscrape=true` when client-side parse fails; app auto-triggers scraper
- [x] **Dynamic APP_URL** — setup page generates bookmarklet pointing to current host

#### Threaded Notes
- [x] `notes` column converted `text` → `jsonb` array
- [x] Structure: `[{userId, userName, text, createdAt}]`
- [x] **NotesThread component** — chat bubbles, author, timestamps
- [x] Compact last-note preview on cards
- [x] Ctrl+Enter to send, search inside note text

#### Native Image Uploads
- [x] **Supabase Storage** `item-images` bucket — public read, auth write
- [x] **Hybrid** — external URLs (Yad2) + uploaded files in same `images[]` array
- [x] File validation: 5 MB max, JPEG/PNG/WebP/GIF
- [x] Preview strip with hero selector and remove button

#### Read Receipts
- [x] `viewed_by jsonb` column added to apartments
- [x] Creator auto-added to `viewed_by` on insert
- [x] **✨ NEW badge** — pulsing on unseen items
- [x] Marked on card open or reaction
- [x] GIN index for performance

### v2.2 — Room Filter & Global Map

#### Advanced Room Filter
- [x] **Half-room support** — options: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6+
- [x] **Range selection** — tap first value, tap second to set range (e.g., 2–4 rooms)
- [x] **Connected UI** — selected range shows orange pills with shared borders, no gaps
- [x] **Range filter logic** — float comparison, `6+` = ≥6
- [x] **Summary badge** — "2–4 Rooms" with inline clear button
- [x] **Mobile** — horizontally scrollable, tap hint text

#### Global Map View
- [x] Map button visible for **all categories** (apartments, venues, cars)
- [x] Header count and empty state use category label
- [x] Popup price unit per category (/month, /night, blank for cars)
- [x] Rooms badge shown only when data exists

---

## SQL Migrations

| File | Purpose |
|---|---|
| `supabase/migration-v2.0-grouppick.sql` | households, profiles tables; apartments household_id TEXT→UUID; RLS; trigger |
| `supabase/fix-rls-recursion.sql` | Fixes RLS circular recursion via SECURITY DEFINER function |
| `supabase/migration-v2.1-threaded-notes.sql` | Converts notes TEXT→JSONB array |
| `supabase/setup-storage.sql` | Creates item-images storage bucket with policies |
| `supabase/migration-v2.1-viewed-by.sql` | Adds viewed_by JSONB column with GIN index |

---

## Known Limitations

- RLS currently disabled for development (re-enable for production)
- Supabase free tier pauses after 1 week of inactivity
- Geocoding rate limit: 1 req/sec (Nominatim)
- Email rate limit: 4/hour per address (Supabase free tier)
- Single household per user

---

## Development Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # TypeScript check + Next.js production build
npm run start     # Run production build locally
npm run lint      # ESLint check
```

## Deployment

Push to `main` → Vercel auto-deploys.

**Required Vercel env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_PASSWORD`, `APP_PASSWORD`

---

## Roadmap

### v2.3
- [ ] Re-enable RLS with proper auth token flow
- [ ] Toast notifications for actions
- [ ] Leave household option

### v3.0
- [ ] Multiple households per user
- [ ] Push notifications for new items
- [ ] Facebook Marketplace scraper
- [ ] Side-by-side comparison view
- [ ] Export to PDF/Excel
