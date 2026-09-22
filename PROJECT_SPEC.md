# JustPick — Project Specification

> A private, real-time collaborative decision-making app for couples.
> Track apartments, wedding venues, cars, or any category together.
> Built with Next.js 15, Supabase Auth, and Tailwind CSS. Deployed on Vercel.

---

## Status: ✅ Live in Production

- **Production URL:** https://search-appartment.vercel.app
- **Repository:** https://github.com/amittzr/searchAppartment
- **Database:** Supabase — project `khozzonoqctwbzsowulv` (ap-southeast-1, Singapore)
- **Current Version:** v3.0 — September 2026

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
| AI Vision | Google Gemini (@google/generative-ai) | ^0.24.1 |
| Push Notifications | web-push (VAPID) | ^3.x |
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
│   └── api/
│       ├── scrape-yad2/route.ts          ← POST: Yad2 + yad-il scraper API
│       ├── parse-screenshot/route.ts     ← POST: Gemini Vision screenshot extraction
│       ├── push/
│       │   ├── vapid-key/route.ts        ← GET: returns public VAPID key to client
│       │   ├── subscribe/route.ts        ← POST: save/remove push subscription
│       │   └── notify-new-item/route.ts  ← POST: broadcast push on new item
│       └── cron/
│           └── check-reminders/route.ts  ← GET: daily reminder cron (Vercel Cron)
├── components/
│   ├── Navbar.tsx                ← Sticky header: household info, user menu, add button
│   ├── FilterToolbar.tsx         ← Filters: search, room range, sort, reaction pills
│   ├── ApartmentCard.tsx         ← Card: image, price, reactions, NEW badge
│   ├── ApartmentModal.tsx        ← Add/Edit form: dynamic fields, notes thread, image upload
│   ├── CategoryFields.tsx        ← Dynamic form fields based on category type
│   ├── NotesThread.tsx           ← Chat-style threaded notes component
│   ├── ChecklistModal.tsx        ← Physical inspection checklist modal (Hebrew)
│   ├── MapView.tsx               ← Interactive map — all categories
│   ├── HouseholdSettingsModal.tsx ← Household info, editable invite code, members
│   └── LoadingSkeleton.tsx       ← Shimmer placeholder grid
├── contexts/
│   └── HouseholdContext.tsx      ← Auth state, profile, household, members
├── hooks/
│   ├── useApartments.ts          ← CRUD + reactions + markAsViewed + push trigger + Realtime
│   ├── useYad2AutoFill.ts        ← Auto-fill hook for yad2.co.il + yad-il.co.il
│   ├── usePWAInstall.ts          ← PWA install prompt detection (iOS/Android/desktop)
│   └── usePushNotifications.ts  ← Web Push subscribe/unsubscribe lifecycle
├── lib/
│   ├── supabase-client.ts        ← Browser Supabase client (singleton)
│   ├── supabase-server.ts        ← Server Components Supabase client
│   ├── supabase-middleware.ts    ← Middleware Supabase client (session refresh)
│   ├── upload-images.ts          ← Supabase Storage image upload + cleanup utility
│   ├── send-push.ts              ← Server-side Web Push broadcast helper (VAPID)
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
| `checklist_data` | jsonb | Physical inspection checklist state (Hebrew, 3 categories) |
| `last_reminder_sent_at` | timestamptz | Tracks when last push reminder was sent (prevents spam) |
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

### `public.push_subscriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | References auth.users(id) |
| `group_id` | uuid | References households(id) — scopes push to household |
| `subscription` | jsonb | Full PushSubscription JSON (endpoint + keys) |
| `created_at` | timestamptz | Auto-set |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon JWT |
| `NEXT_PUBLIC_APP_PASSWORD` | Gate password for signup |
| `APP_PASSWORD` | Server-side reference |
| `GEMINI_API_KEY` | Gemini Vision API key (server-side only) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key — sent to browser for SW push subscription |
| `VAPID_PRIVATE_KEY` | VAPID private key — server-side only, never exposed to client |
| `VAPID_SUBJECT` | VAPID contact (`mailto:...`) required by web-push |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role — bypasses RLS for push broadcast reads |
| `CRON_SECRET` | Bearer token protecting `/api/cron/check-reminders` from public access |
| `YAD2_COOKIES` | Browser cookies for Yad2 scraping (`.env.local` only, refresh monthly) |

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

### v2.0 — JustPick (Real Auth & Multi-Category)
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

### v2.3 — AI Screenshot Extraction (Gemini Vision)

- [x] **`/api/parse-screenshot` route** — POST endpoint accepts `FormData` (image + category)
- [x] **Gemini Vision** (`gemini-3.6-flash`) — multimodal model reads screenshot and returns structured JSON
- [x] **Dynamic prompts** — category-specific prompt shapes: apartment/venue gets `{title, price, rooms, phone, seller_name}`, car gets `{title, price, year, mileage, phone, seller_name}`
- [x] **Robust JSON parsing** — strips markdown fences from Gemini response, graceful error handling
- [x] **Screenshot upload** — file simultaneously uploaded to Supabase Storage `item-images` bucket, becomes hero image
- [x] **Non-destructive merge** — extracted fields only fill empty form fields, never overwrite user-typed data
- [x] **Purple UI panel** — "AI Extract from Screenshot 🪄" section above URL field in modal
- [x] **Success/error banner** — dismissible inline feedback after extraction
- [x] **Car metadata** — year and mileage fields populated into `metadata` JSONB
- [x] **`GEMINI_API_KEY`** — server-side only env var, never exposed to client

### v2.4 — Physical Inspection Checklist

- [x] **`checklist_data` column** — JSONB added to apartments table, default NULL
- [x] **Default template** — 3 Hebrew categories: שאלות לדיירים 🗣️ (5 items), בדיקות פיזיות 🛠️ (7 items), ריהוט וציוד 🛋️ (3 items)
- [x] **`ListChecks` icon** on every card action bar — opens dedicated checklist modal
- [x] **Mini progress bar** under the icon — violet while in progress, green when 100%
- [x] **ChecklistModal** — RTL layout, fixed header/footer, scrollable body (`flex-1 min-h-0`)
- [x] **Optimistic toggle** — checkbox updates instantly, debounced 600ms save to Supabase
- [x] **Per-category collapse** — accordion with item count badge (X/Y)
- [x] **Progress bar** in modal header — shows % and item counts
- [x] **Reset button** — clears all checkboxes back to defaults
- [x] **Expanded view button** — "Checklist" button with inline progress bar in expanded card

### v2.5 — PWA (Progressive Web App)

- [x] **`manifest.ts`** — Next.js 15 native manifest: name, icons, display: standalone, theme_color
- [x] **iOS metadata** — `appleWebApp` in layout.tsx for Add to Home Screen support
- [x] **Service worker** — `public/sw.js`: network-first caching, auto-cache cleanup on version bump
- [x] **`usePWAInstall` hook** — detects installed/iOS/Android states, deferred install prompt
- [x] **Settings install section** — Install App UI in HouseholdSettingsModal:
  - Android: native "Install App" button when `beforeinstallprompt` fires
  - Android fallback: manual "⋮ menu → Add to Home Screen" instructions
  - iOS: Safari Share → Add to Home Screen step-by-step guide
  - Installed: green "App is installed ✅" badge
- [x] **Auto-update** — old caches deleted on SW activate, `clients.claim()` forces update

### v3.0 — Web Push Notifications

#### Infrastructure
- [x] **`push_subscriptions` table** — `user_id`, `group_id`, `subscription` JSONB, unique index on endpoint per user
- [x] **VAPID keys** — `web-push` library with `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`
- [x] **`send-push.ts`** helper — fetches group subscriptions, filters sender, broadcasts, auto-deletes 410 Gone

#### API Routes
- [x] **`GET /api/push/vapid-key`** — returns public VAPID key to browser
- [x] **`POST /api/push/subscribe`** — saves or removes push subscription tied to `group_id`
- [x] **`POST /api/push/notify-new-item`** — broadcasts push when new item added (excludes sender)
- [x] **`GET /api/cron/check-reminders`** — daily cron: finds items 48h+ old with no reactions, sends reminder push to all group members, updates `last_reminder_sent_at`

#### Client
- [x] **`usePushNotifications` hook** — full subscribe/unsubscribe lifecycle with permission handling
- [x] **Notifications section** in HouseholdSettingsModal — 3 states:
  - "Enable Notifications 🔔" button → requests permission → subscribes SW → saves to DB
  - "Notifications enabled" green badge + "Turn off" link
  - "Blocked" amber warning with browser settings instructions
- [x] **SW push handler** — `push` event: parses JSON payload, shows notification with vibration
- [x] **SW click handler** — `notificationclick`: focuses existing tab or opens new window
- [x] **Cron schedule** — `vercel.json` runs check-reminders daily at 09:00 UTC
- [x] **Security** — `CRON_SECRET` bearer token protects cron endpoint; `SUPABASE_SERVICE_ROLE_KEY` used server-side only

#### Push notification content
| Event | Title | Body |
|---|---|---|
| New item added | ✨ פריט חדש נוסף לקבוצה! | Item title |
| 48h no reaction | ⏳ פריט ממתין להחלטה | "הדירה [title] מחכה כבר יומיים..." |

---

## SQL Migrations

| File | Purpose |
|---|---|
| `supabase/migration-v2.0-grouppick.sql` | households, profiles tables; apartments household_id TEXT→UUID; RLS; trigger |
| `supabase/fix-rls-recursion.sql` | Fixes RLS circular recursion via SECURITY DEFINER function |
| `supabase/migration-v2.1-threaded-notes.sql` | Converts notes TEXT→JSONB array |
| `supabase/setup-storage.sql` | Creates item-images storage bucket with policies |
| `supabase/migration-v2.1-viewed-by.sql` | Adds viewed_by JSONB column with GIN index |
| `supabase/migration-v2.3-checklist.sql` | Adds checklist_data JSONB + last_reminder_sent_at columns |
| `supabase/migration-push-subscriptions.sql` | Creates push_subscriptions table with RLS |

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

**Required Vercel env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_PASSWORD`, `APP_PASSWORD`, `GEMINI_API_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`

---

## Roadmap

### v3.1
- [ ] Re-enable RLS with proper auth token flow
- [ ] Toast notifications for in-app actions
- [ ] Leave household option
- [ ] Multiple households per user
- [ ] Facebook Marketplace scraper
- [ ] Side-by-side comparison view
- [ ] Export to PDF/Excel
