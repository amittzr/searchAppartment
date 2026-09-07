# ApartmentTracker — Project Specification

> A private, real-time rental apartment tracking app for couples.
> Built with Next.js 15, Supabase, and Tailwind CSS. Deployed on Vercel.

---

## Status: ✅ Live in Production

- **Production URL:** https://search-appartment.vercel.app *(update if domain changes)*
- **Repository:** https://github.com/amittzr/searchAppartment
- **Database:** Supabase — project `khozzonoqctwbzsowulv` (ap-southeast-1, Singapore)
- **Last stable version:** v1.3 — September 2026

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.25 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^3.4.1 |
| Icons | lucide-react | ^0.460.0 |
| Database | Supabase (PostgreSQL) | ^2.45.4 |
| Maps | Leaflet (CDN) | 1.9.4 |
| Geocoding | Nominatim (OpenStreetMap) | Free API |
| Deployment | Vercel | — |

---

## Architecture Overview

```
src/
├── app/
│   ├── page.tsx              ← Main dashboard (filter, grid, map, modals)
│   ├── layout.tsx            ← Root layout, metadata, Inter font
│   ├── globals.css           ← Tailwind base + custom animations
│   ├── setup/
│   │   └── page.tsx          ← Bookmarklet setup page
│   ├── login/
│   │   └── page.tsx          ← Shared password login page
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts    ← POST: validate password, set cookie
│       │   └── logout/route.ts   ← POST: clear cookie, redirect to /login
│       └── scrape-yad2/route.ts  ← POST: Yad2 auto-fill scraper API
├── components/
│   ├── Navbar.tsx            ← Sticky header: logo, refresh, logout, add
│   ├── FilterToolbar.tsx     ← Advanced filters: search, rooms, sort, reactions
│   ├── ApartmentCard.tsx     ← Card: image, price, reactions, dual-user badges
│   ├── ApartmentModal.tsx    ← Add / Edit form modal with rooms field
│   ├── MapView.tsx           ← Interactive map with apartment markers
│   ├── HouseholdSettingsModal.tsx ← Configure household ID and partner names
│   └── LoadingSkeleton.tsx   ← Shimmer placeholder grid
├── contexts/
│   └── HouseholdContext.tsx  ← Multi-tenant household state (localStorage)
├── hooks/
│   ├── useApartments.ts      ← CRUD + reactions + household scoping + Realtime
│   └── useYad2AutoFill.ts    ← Auto-fill hook for Yad2 URLs
├── lib/
│   ├── supabase.ts           ← Singleton Supabase client
│   └── geocode.ts            ← Nominatim geocoding utility
├── types/
│   └── database.ts           ← Apartment, ReactionsMap, FilterState, HouseholdState types
└── middleware.ts              ← Edge middleware: cookie auth guard
```

---

## Database Schema (Supabase PostgreSQL)

**Table: `public.apartments`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `household_id` | text NOT NULL | Multi-tenant isolation key (default: 'default-family') |
| `url` | text | Link to original Yad2 / Facebook ad |
| `title` | text NOT NULL | Address or apartment title |
| `price` | integer NOT NULL | Monthly rent in ₪ |
| `rooms` | text | Number of rooms (e.g., "3", "3.5", "4+") |
| `phone` | text | Landlord / agent phone |
| `seller_name` | text | Contact name (auto-filled from Yad2) |
| `image_url` | text | Direct image link for card hero |
| `images` | jsonb | Array of all image URLs for gallery |
| `reactions` | jsonb | Per-user reactions: `{"Amit": "liked", "Noa": "review"}` |
| `status` | text NOT NULL | DEPRECATED — kept for backward compat |
| `notes` | text | Shared notes (visible to both) |
| `latitude` | double precision | Map coordinates (auto-geocoded) |
| `longitude` | double precision | Map coordinates (auto-geocoded) |
| `created_at` | timestamptz | Auto-set to `now()` |

**Indexes:** `household_id`, `created_at DESC`, `price ASC`, `rooms`
**RLS:** Enabled — open anon policy (access controlled by app-level password)
**Realtime:** Enabled on `supabase_realtime` publication

**Migration v1.2 (run if upgrading):**
```sql
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS household_id text NOT NULL DEFAULT 'default-family';
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS rooms text;
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}';
```

**Migration v1.3 (run if upgrading):**
```sql
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS longitude double precision;
```

---

## Authentication

- **Mechanism:** Shared password stored in `APP_PASSWORD` env variable
- **Flow:** POST `/api/auth/login` → validates password → sets `apt_session` httpOnly cookie (7-day expiry)
- **Guard:** `src/middleware.ts` (Vercel Edge Runtime) checks cookie on every request
- **Logout:** POST `/api/auth/logout` → expires cookie → redirects to `/login`
- **No Supabase Auth used** — intentional, keeps it simple for two users

---

## Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Supabase project base URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Supabase anon/public JWT |
| `APP_PASSWORD` | Vercel + `.env.local` | Shared login password |
| `YAD2_COOKIES` | `.env.local` only | Browser cookies for Yad2 auto-fill (refresh monthly) |

---

## Features Implemented

### Core Features (v1.0)
- [x] Add apartment (modal form with validation)
- [x] Edit apartment
- [x] Delete apartment (2-step confirm)
- [x] Real-time sync via Supabase Realtime (instant updates for both users)
- [x] Source auto-detection: Yad2 / Facebook from URL
- [x] Direct link to original listing (opens in new tab)
- [x] Phone number click-to-call
- [x] Seller/contact name display
- [x] Shared notes per apartment
- [x] Responsive design (mobile-first)
- [x] Loading skeleton (shimmer cards)
- [x] Empty state (per filter + global)
- [x] Error handling with user-friendly banners
- [x] Shared password authentication
- [x] Logout button in navbar
- [x] `?from=` redirect after login
- [x] Production build on Vercel with CI/CD via GitHub

### Yad2 Auto-Fill (v1.1)
- [x] Paste Yad2 URL → Auto-Fill button extracts listing data
- [x] Extracts: title/address, price, phone number, seller name, all images, rooms
- [x] Uses server-side scraping with cookie authentication
- [x] Bypasses Radware bot protection via session cookies
- [x] Customer API integration for phone number retrieval
- [x] Bookmarklet for one-click save from Yad2 pages

### Expandable Card View (v1.1)
- [x] Click apartment image to expand into full-screen overlay
- [x] Photo gallery with left/right navigation arrows
- [x] Thumbnail strip for quick image selection (desktop)
- [x] Image counter (e.g., "2 / 4")
- [x] Contact section showing seller name + clickable phone
- [x] Full notes display
- [x] Edit/Delete/Open Original actions

### Multi-Household & Per-User Reactions (v1.2)
- [x] `household_id` field for multi-tenant isolation
- [x] HouseholdContext with localStorage persistence
- [x] HouseholdSettingsModal for configuring household ID and partner names
- [x] Per-user reactions: each partner can mark liked/review/rejected independently
- [x] Dual reaction badges on cards showing both partners' status
- [x] Match indicator when both partners like the same apartment
- [x] Reactions stored in JSONB field: `{"Partner1": "liked", "Partner2": "review"}`
- [x] `rooms` field extracted from Yad2 listings
- [x] Rooms badge displayed on apartment cards

### Advanced Filtering (v1.2)
- [x] FilterToolbar component replacing simple tabs
- [x] Search by title, notes, or seller name
- [x] Filter by number of rooms (1, 2, 3, 4, 4+)
- [x] Sort options: Newest, Oldest, Price Low→High, Price High→Low
- [x] Reaction filter pills with counts:
  - All apartments
  - Both liked (💕)
  - I liked (❤️)
  - Partner liked (💜)
  - To review (🤔)
  - Rejected (❌)
  - Unsorted (📋)

### Interactive Map View (v1.3)
- [x] Map button in header to open full-screen map
- [x] Leaflet map loaded from CDN (no npm dependency)
- [x] OpenStreetMap tiles (free, no API key required)
- [x] Auto-geocoding of addresses using Nominatim API
- [x] Coordinates stored in database (latitude/longitude)
- [x] Color-coded markers based on reactions:
  - Pink: Both partners liked
  - Red: Someone liked
  - Blue: No reaction yet
  - Gray: Rejected
- [x] Hover tooltips showing address and price
- [x] Click marker to show mini apartment card
- [x] Mini card with image, price, rooms, action buttons
- [x] Legend explaining marker colors
- [x] Click on map to dismiss mini card
- [x] "View details" button to open apartment for editing

---

## Upgrade Roadmap (Ideas for Future Versions)

### v1.4 — Content Improvements
- [ ] "Visited" checkbox to track which ones you toured
- [ ] Visit date / appointment scheduler per apartment
- [ ] Star rating (1–5) in addition to reactions
- [ ] Copy phone number to clipboard button
- [ ] Toast notifications instead of error banners

### v1.5 — Collaboration
- [ ] Comments thread per apartment (instead of single shared notes)
- [ ] Push notifications when partner adds a new apartment
- [ ] Activity log showing recent changes

### v2.0 — Power Features
- [ ] Facebook Marketplace URL scraper
- [ ] Side-by-side comparison view (pick 2–3 apartments)
- [ ] Export list to PDF or Excel
- [ ] Custom tags / labels per apartment
- [ ] Price history tracking (if price changes on re-edit)

---

## Known Limitations

- No per-user auth — household members share data via household_id in localStorage
- Image URLs are user-supplied — broken links show a placeholder
- No rate limiting beyond a 500ms delay on wrong password
- Supabase free tier pauses after 1 week of inactivity
- Geocoding rate limit: 1 request per second (Nominatim)
- Map requires coordinates — existing apartments need to be re-saved to geocode

---

## Development Commands

```bash
npm run dev       # Start local dev server at http://localhost:3000
npm run build     # Production build (TypeScript check + Next.js compile)
npm run start     # Run production build locally
npm run lint      # ESLint check
```

## Deployment

Push to `main` branch → Vercel auto-deploys.

Manual redeploy: Vercel Dashboard → Deployments → Redeploy.
