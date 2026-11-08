# JustPick — Project Specification

> A private, real-time collaborative decision-making app for couples.
> Track apartments, wedding venues, cars, or any category together.
> Built with Next.js 15, Supabase Auth, and Tailwind CSS. Deployed on Vercel.

---

## Status: ✅ Live in Production

- **Production URL:** https://search-appartment.vercel.app
- **Repository:** https://github.com/amittzr/searchAppartment
- **Database:** Supabase — project `khozzonoqctwbzsowulv` (ap-southeast-1, Singapore)
- **Current Version:** v3.3 — November 2026

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
│   ├── page.tsx                  ← Live dashboard wrapper (Supabase data → <Dashboard mode="live" />)
│   ├── demo/page.tsx             ← Public interactive playground (<DemoDashboard />, indexable)
│   ├── layout.tsx                ← Root layout, ThemeProvider, no-flash theme script
│   ├── globals.css               ← Tailwind base + custom animations + dark theme vars
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
│       │   ├── notify-new-item/route.ts  ← POST: broadcast push on new item
│       │   ├── notify-match/route.ts     ← POST: broadcast push when all members liked an item
│       │   └── notify-comment/route.ts   ← POST: broadcast push when a comment is added
│       └── cron/
│           └── check-reminders/route.ts  ← GET: daily reminder cron (Vercel Cron)
├── components/
│   ├── Dashboard.tsx             ← Shared dashboard UI; data injected via props (mode "live" | "demo")
│   ├── DemoDashboard.tsx         ← /demo shell: mock HouseholdContext + AuthGateProvider + mock data
│   ├── AuthGateModal.tsx         ← Signup/login conversion modal shown for gated demo actions
│   ├── DemoBanner.tsx            ← Strip above the navbar in the demo (Sign in / Create free account)
│   ├── Navbar.tsx                ← Sticky header: household info, user menu, add button, dark mode toggle (demoMode variant)
│   ├── FilterToolbar.tsx         ← Filters: search, room range, sort, reaction pills
│   ├── ApartmentCard.tsx         ← Card: image, price, reactions, NEW badge, comments trigger, highlight ring
│   ├── ApartmentModal.tsx        ← Add/Edit form: dynamic fields, notes thread, image upload
│   ├── CategoryFields.tsx        ← Dynamic form fields based on category type
│   ├── NotesThread.tsx           ← Chat-style threaded notes component (full, compact, compose-only)
│   ├── CommentsModal.tsx         ← Dedicated comments chat modal opened from the card
│   ├── WelcomeGuideModal.tsx     ← One-time 2-step guide: push notifications + add to home screen
│   ├── ActivityFeed.tsx          ← Activity drawer; entries jump to the related card
│   ├── ChecklistModal.tsx        ← Physical inspection checklist modal (Hebrew) + custom "אחר" items
│   ├── MapView.tsx               ← Interactive map — all categories
│   ├── HouseholdSettingsModal.tsx ← Household info, editable invite code, members
│   └── LoadingSkeleton.tsx       ← Shimmer placeholder grid
├── contexts/
│   ├── HouseholdContext.tsx      ← Auth state, profile, household, members (context also exported for the demo)
│   ├── AuthGateContext.tsx       ← requireAuth(reason) for the demo; harmless default outside it
│   └── ThemeContext.tsx          ← Light/dark theme state, localStorage persistence
├── hooks/
│   ├── useApartments.ts          ← CRUD + reactions + addComment + markAsViewed + push trigger + Realtime
│   ├── useDemoApartments.ts      ← In-memory twin of useApartments for /demo (no Supabase)
│   ├── useYad2AutoFill.ts        ← Auto-fill hook for yad2.co.il + yad-il.co.il
│   ├── usePWAInstall.ts          ← PWA install prompt detection (iOS/Android/desktop)
│   └── usePushNotifications.ts  ← Web Push subscribe/unsubscribe lifecycle
├── lib/
│   ├── supabase-client.ts        ← Browser Supabase client (singleton)
│   ├── supabase-server.ts        ← Server Components Supabase client
│   ├── supabase-middleware.ts    ← Middleware Supabase client (session refresh)
│   ├── upload-images.ts          ← Supabase Storage image upload + cleanup utility
│   ├── send-push.ts              ← Server-side Web Push broadcast helper (VAPID)
│   ├── geocode.ts                ← Nominatim geocoding utility
│   ├── demo-data.ts              ← Mock household, members, 2 apartments, activity for /demo
│   ├── pending-intent.ts         ← localStorage: item a demo visitor filled in + one-time demo AI flag
│   ├── consume-pending-intent.ts ← After signup: upload local photos, geocode, create the item
│   └── rate-limit.ts             ← In-memory per-IP limiter for anonymous demo API calls
public/demo/                      ← Placeholder SVG illustrations used by the mock apartments
├── types/
│   └── database.ts               ← All types: Item, Profile, Household, FilterState, etc.
└── middleware.ts                  ← Auth guard: unauthenticated "/" → /demo, other protected routes → /login
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
| `terms_accepted_at` | timestamptz | When the user agreed to Terms & Privacy (server time, set by the signup trigger). NULL for users who signed up before v3.2 |
| `has_completed_onboarding` | boolean NOT NULL | Default `false` for new users; existing users backfilled to `true`. Set to `true` when the welcome guide is finished or dismissed |
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
| `checklist_data` | jsonb | Physical inspection checklist state (Hebrew, 3 template categories + user-managed "אחר" category). Custom items use ids prefixed `custom-` |
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
| `/login`, `/signup`, `/join/*`, `/legal/*`, `/demo` | Public (signed-in users opening `/demo` are redirected to `/`) |
| `/api/scrape-yad2`, `/api/parse-screenshot` | Public at middleware level; anonymous callers are rate-limited per IP inside each route |
| `/onboarding` | Auth required, no household required |
| `/` | Auth + household required; unauthenticated visitors are redirected to `/demo` |
| All other routes | Auth + household required (unauthenticated → `/login?from=...`) |

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
| New comment | 💬 הערה מ-[sender] | Comment preview (80 chars) + item title |

### v3.1 — Comments Chat, Custom Checklist Items, Activity Jump, Dark Mode

> No database migrations required. All changes use existing columns (`notes`, `checklist_data`, `activity_log.item_id`).

#### Independent Comments Chat
- [x] **Comments trigger on every card** — sits directly below the phone number: "💬 N comments" or "Add a comment"; the compact last-note preview is also clickable
- [x] **`CommentsModal`** — dedicated chat window, opens like the checklist (bottom sheet on mobile, centered on desktop); thread + compose box only, no edit form
- [x] **Send** with the button or Ctrl+Enter; failed sends restore the typed text and show an error
- [x] **`addComment(id, text)`** in `useApartments` — appends a `{userId, userName, text, createdAt}` entry to `notes`, optimistic update with rollback on failure, persists only the notes column
- [x] **Push on comment** — `addComment` fires `POST /api/push/notify-comment` (fire-and-forget, non-blocking) so other household members are notified
- [x] **`NotesThread` `composeOnly` mode** — renders just the compose box; the modal renders its own thread
- [x] Comments remain editable from the Add/Edit modal as before

#### Custom Checklist Items ("אחר")
- [x] **"אחר ➕" category** — always present (auto-added if missing) as the last checklist category
- [x] **Add your own items** — inline input + add button (Enter also adds); items persist to `checklist_data` via the existing debounced save and count toward progress
- [x] **Delete control on custom items only** — template items stay fixed; custom items are identified by the `custom-` id prefix
- [x] **Reset keeps custom items** — template is restored, custom items are kept but unchecked

#### Activity Feed → Jump to Item
- [x] **Clickable entries** — activity rows that point at a still-existing item become buttons; entries for deleted items or "member joined" stay plain
- [x] **Scroll + highlight** — click closes the drawer, centers the matching card (`id="apt-<id>"`), and shows a pulsing brand-color ring for ~2.6s
- [x] **Filter-aware** — if current filters hide the target item, filters are reset first so the card is visible
- [x] **`ActivityFeed` props** — `onEntryClick(itemId)` and `isItemAvailable(itemId)`

#### Dark Mode
- [x] **Class-based** — Tailwind `darkMode: "class"`; `dark` class toggled on `<html>`
- [x] **`ThemeContext` / `useTheme`** — light/dark state, persisted in `localStorage` (`justpick-theme`), defaults to OS preference on first visit
- [x] **No flash on load** — inline script in `layout.tsx` `<head>` applies the class before paint
- [x] **Navbar toggle** — Sun/Moon button
- [x] **Full coverage** — `dark:` variants across dashboard, Navbar, filters, cards, all modals (edit, checklist, comments, settings), notes, activity feed, map panels, loading/empty states, footer, and login/signup/onboarding/setup pages
- [x] **`globals.css`** — dark CSS variables, dark scrollbar, dark skeleton shimmer
- [x] Intentionally unchanged: Leaflet map tiles and the hover tooltip, image viewer stage, brand/accent colors

### v3.2 — Terms Consent & First-Time Welcome Guide

> **Requires migration:** run `supabase/migration-v3.2-onboarding-consent.sql` in the Supabase SQL Editor **before** deploying. Until it is applied the app keeps working, but the welcome guide stays hidden.

#### Mandatory Terms & Privacy Agreement
- [x] **Signup checkbox** — "I agree to the Terms of Service and Privacy Policy"; the two links open a **pop-up (`LegalModal`)** so the user stays on the signup page (form state preserved). The modal's "I Agree" ticks the checkbox. Real `/legal/*` hrefs are kept for Ctrl/Cmd/Shift-click
- [x] **Shared legal text** — `components/legal/TermsContent.tsx` and `PrivacyContent.tsx` are the single source for both the `/legal/*` pages and the pop-up; legal pages now support dark mode
- [x] **Create Account is disabled** until the box is checked; `validateForm` re-checks it
- [x] **Consent audit trail** — signup sends `terms_accepted: true` in user metadata; the `handle_new_user` trigger writes `profiles.terms_accepted_at = now()` (server time)
- [x] **`/legal` is a public path** in middleware so the links work before login
- [x] **Deep links preserved** — `/join/[code]` → `/signup?invite=` flow is unchanged: user sees the checkbox, signs up, joins, then sees the guide
- [ ] Known limitation: the checkbox is a client-side gate and `user_metadata` is client-supplied; strict enforcement would need a server-side signup route

#### One-Time Welcome Guide
- [x] **`has_completed_onboarding`** profile flag (default `false`; existing users backfilled `true`)
- [x] **`WelcomeGuideModal`** — fixed 2-step modal (bottom sheet on mobile, centered on desktop), 2-dot progress indicator, dark/light styling. The first step carries the "Welcome to JustPick 🎉" heading. The same two steps appear on every platform, always in this order
- [x] **Step 1 — Add to Home Screen 📱** ("Get the full app experience") — marketing copy plus three benefit rows (instant alerts, one-tap launch, full screen / own window). Install UI adapts to the device:
  - **Native button first** — when the browser offers a one-tap install (`beforeinstallprompt`), shows "Add to Home Screen" / "Install JustPick" with the manual steps tucked under "Prefer to do it manually?"
  - **Otherwise per-OS steps** — iPhone / iPad (Share → Add to Home Screen → Add), Android Chrome (⋮ menu → Install app / Add to Home screen), Samsung Internet (menu → Add page to → Home screen), desktop Chrome / Edge (address-bar install icon or menu → Install), desktop Safari (Share → Add to Dock)
  - **Already installed** — green confirmation badge
- [x] **Step 2 — Enable Notifications 🔔** ("Never miss a moment") — "Enable Notifications" triggers the native permission prompt via `usePushNotifications`; handles enabled / blocked / unsupported states
  - **iOS note** — on iPhone & iPad, an explicit blue note explains that notifications only work after the app is added to the Home Screen (Step 1): open the app from its Home Screen icon, then enable notifications from Settings
- [x] **`usePWAInstall` extended** (additive — Settings modal unchanged): `platform`, `browser`, `isIPad` (incl. iPadOS reporting as Mac). Detection is user-agent based and best-effort; menu wording varies by OS/browser version
- [x] **Triggered from the dashboard** by the profile flag, so it works for normal signup, email-confirmation signup and deep-link joins
- [x] **Never shows again** — "Get Started", "Skip", the close button and Escape all set `has_completed_onboarding = true`; a localStorage guard prevents a re-show on the same device if the DB write fails
- [x] Backdrop clicks do not dismiss the guide (avoids accidental permanent dismissal)

### v3.3 — Interactive Demo Playground (`/demo`)

> No database migrations required. Marketing links should point to `/demo`; logged-out visitors at `/` are redirected there.

#### Architecture
- [x] **`Dashboard.tsx`** — the previous `page.tsx` dashboard extracted into a presentational component. Data layer is injected (`data`, `activity` props) with `mode: "live" | "demo"`; `/` passes Supabase-backed `useApartments` + `useActivityLog`, `/demo` passes in-memory mock data
- [x] **Mock context** — `DemoDashboard` provides a mock value through the exported `HouseholdContext`, so `ApartmentCard`, `ImageViewer`, `ChecklistModal`, `FilterToolbar`, `MapView`, etc. are reused unchanged and no Supabase session is needed
- [x] **Content** — 2 mock apartments (Tel Aviv 3-room, Ramat Gan 4-room) with images, checklist progress, comments and partner "Noa" reactions. Item 1 is already liked by Noa, so liking it as "You" triggers the match prompt. Images are placeholder SVGs in `public/demo/`
- [x] **No network/realtime in demo** — no Supabase channels, no writes; `useDemoApartments` rejects every write and only supports marking viewed and local checklist edits

#### Free exploration vs. gated actions
- [x] **Free:** browse cards, expand, swipe/zoom gallery, filters/search/sort, open/toggle checklist (local state), read comments, map, activity feed, dark mode
- [x] **Gated (signup modal via `requireAuth`):** add (on submit), like/review/reject (headline "Make it a match" when the partner already liked), send comment, edit, delete, Settings / "Invite partner"
- [x] **`AuthGateModal`** — copy: "Loved the experience? Start hunting together! Create your free account in 10 seconds to save your properties and invite your partner." Per-action headline; Create free account / I already have an account / Keep exploring; focus trap, Esc, `aria-modal`. Email + password only (Google sign-in not implemented)
- [x] **Navbar demo variant** — "Invite partner" (gated) and "Sign in" replace the invite code and user menu; `DemoBanner` strip above the navbar

#### Add flow & intent preservation
- [x] **Regular add form in demo** — Yad2 Auto-Fill and AI screenshot extraction work as in the live app. Demo photos/screenshots stay in the browser as compressed data URLs (no Storage upload); form validation accepts local `data:image/` hero images in demo only
- [x] **Add = signup prompt** — pressing Add stores the filled form in `localStorage` (`justpick_pending_item`, 24h expiry) and opens the signup modal. If storage is full, local photos are dropped and the text details are kept
- [x] **After signup** — `consumePendingIntent` runs once on the live dashboard when the household is an apartments household: uploads local photos to Storage, geocodes, inserts via `addApartment`, shows a confirmation notice. The intent is cleared only after a successful insert (kept for retry on failure); discarded for non-apartment households. No second scrape/AI call
- [x] **`localStorage`, not `sessionStorage`** — survives the email-confirmation round trip in another tab

#### Routing & signup
- [x] `/demo` is public and indexable (own title/description; root layout stays `noindex`); signed-in users are redirected to `/`
- [x] Logged-out visitors at `/` → `/demo`; other protected URLs still → `/login?from=...`. Note: a logged-out bookmarklet link (`/?autofill=...`) now lands on the demo
- [x] Signup/login links from the demo carry `?source=demo`; **signup skips the invite-password gate** for `source=demo` (the gate is a client-side check on a public env var, so this is a UX change, not a security boundary)

#### AI cost protection
- [x] **One free AI extraction per demo visitor** — after a successful screenshot extraction the button is disabled ("Free AI extraction used", hint "Create a free account to keep using it") via a `localStorage` flag; the extracted details are saved immediately as the pending item. Failed extractions do not use the allowance
- [x] **Server-side per-IP limits for anonymous callers** (`lib/rate-limit.ts`): `/api/parse-screenshot` 2/hour, `/api/scrape-yad2` 10/hour, then HTTP 429 "Demo limit reached…". Logged-in users are unrestricted
- [ ] Known limitation: the limiter is in-memory, so on Vercel each server instance counts separately (a cost guard, not a hard cap). Use a shared store (e.g. Upstash Redis) and a Google AI Studio spend cap for a hard ceiling. The browser flag can be cleared by the visitor
- [ ] Future: per-day AI limit for registered users

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
| `supabase/migration-v3.2-onboarding-consent.sql` | Adds `terms_accepted_at` + `has_completed_onboarding` (existing users backfilled `true`); updates `handle_new_user` to record consent time |

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

### v3.4
- [ ] Google sign-in (Supabase provider + `/auth/callback`)
- [ ] Real photos for the demo apartments (replace placeholder SVGs in `public/demo/`)
- [ ] Re-enable RLS with proper auth token flow
- [ ] Toast notifications for in-app actions
- [ ] Leave household option
- [ ] Multiple households per user
- [ ] Facebook Marketplace scraper
- [ ] Side-by-side comparison view
- [ ] Export to PDF/Excel
