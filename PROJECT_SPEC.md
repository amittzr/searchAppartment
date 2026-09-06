# ApartmentTracker — Project Specification

> A private, real-time rental apartment tracking app for couples.
> Built with Next.js 15, Supabase, and Tailwind CSS. Deployed on Vercel.

---

## Status: ✅ Live in Production

- **Production URL:** https://search-appartment.vercel.app *(update if domain changes)*
- **Repository:** https://github.com/amittzr/searchAppartment
- **Database:** Supabase — project `khozzonoqctwbzsowulv` (ap-southeast-1, Singapore)
- **Last stable version:** v1.1 — September 2026

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.25 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^3.4.1 |
| Icons | lucide-react | ^0.460.0 |
| Database | Supabase (PostgreSQL) | ^2.45.4 |
| Deployment | Vercel | — |

---

## Architecture Overview

```
src/
├── app/
│   ├── page.tsx              ← Main dashboard (filter, grid, modals)
│   ├── layout.tsx            ← Root layout, metadata, Inter font
│   ├── globals.css           ← Tailwind base + custom animations
│   ├── login/
│   │   └── page.tsx          ← Shared password login page
│   └── api/auth/
│       ├── login/route.ts    ← POST: validate password, set cookie
│       └── logout/route.ts   ← POST: clear cookie, redirect to /login
├── components/
│   ├── Navbar.tsx            ← Sticky header: logo, refresh, logout, add
│   ├── FilterTabs.tsx        ← Tab bar: All / Liked / Review / Rejected
│   ├── ApartmentCard.tsx     ← Card: image, price, status, actions
│   ├── ApartmentModal.tsx    ← Add / Edit form modal
│   └── LoadingSkeleton.tsx   ← Shimmer placeholder grid
├── hooks/
│   └── useApartments.ts      ← All CRUD + Supabase Realtime subscription
├── lib/
│   └── supabase.ts           ← Singleton Supabase client
├── types/
│   └── database.ts           ← Apartment, ApartmentInsert, ApartmentUpdate,
│                                ApartmentFormData, FilterStatus types
└── middleware.ts              ← Edge middleware: cookie auth guard
```

---

## Database Schema (Supabase PostgreSQL)

**Table: `public.apartments`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `url` | text | Link to original Yad2 / Facebook ad |
| `title` | text NOT NULL | Address or apartment title |
| `price` | integer NOT NULL | Monthly rent in ₪ |
| `phone` | text | Landlord / agent phone |
| `seller_name` | text | Contact name (auto-filled from Yad2) |
| `image_url` | text | Direct image link for card hero |
| `images` | jsonb | Array of all image URLs for gallery |
| `status` | text NOT NULL | `'all'` \| `'liked'` \| `'review'` \| `'rejected'` |
| `notes` | text | Shared notes (visible to both) |
| `created_at` | timestamptz | Auto-set to `now()` |

**Indexes:** `status`, `created_at DESC`, `price ASC`
**RLS:** Enabled — open anon policy (access controlled by app-level password)
**Realtime:** Enabled on `supabase_realtime` publication

**Migration (run if upgrading from v1.0):**
```sql
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS seller_name text;
ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS images jsonb;
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

- [x] Add apartment (modal form with validation)
- [x] Edit apartment
- [x] Delete apartment (2-step confirm)
- [x] Status reactions: Liked ❤️ / Review 🤔 / Rejected ❌ (toggle — click active to reset)
- [x] Filter tabs with live counts (All / Liked / Review / Rejected)
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
- [x] Extracts: title/address, price, phone number, seller name, all images
- [x] Uses server-side scraping with cookie authentication
- [x] Bypasses Radware bot protection via session cookies
- [x] Customer API integration for phone number retrieval

### Expandable Card View (v1.1)
- [x] Click apartment image to expand into full-screen overlay
- [x] Photo gallery with left/right navigation arrows
- [x] Thumbnail strip for quick image selection (desktop)
- [x] Image counter (e.g., "2 / 4")
- [x] Contact section showing seller name + clickable phone
- [x] Full notes display
- [x] Status toggle buttons in expanded view
- [x] Edit/Delete/Open Original actions

---

## Upgrade Roadmap (Ideas for Future Versions)

### v1.2 — Quick wins
- [ ] Sort apartments by price (asc / desc toggle)
- [ ] Search / filter by title or address text
- [ ] Copy phone number to clipboard button
- [ ] Toast notifications instead of error banners
- [ ] Apartment count in page title / tab

### v1.3 — Content improvements
- [ ] Map view — embed Google Maps pin from address
- [ ] "Visited" checkbox to track which ones you toured
- [ ] Visit date / appointment scheduler per apartment
- [ ] Star rating (1–5) in addition to status

### v1.4 — Collaboration
- [ ] Comments thread per apartment (instead of single shared notes)
- [ ] "Added by" indicator (Partner A vs Partner B) using Supabase Auth
- [ ] Push notifications when partner adds a new apartment

### v2.0 — Power features
- [ ] Facebook Marketplace URL scraper
- [ ] Side-by-side comparison view (pick 2–3 apartments)
- [ ] Export list to PDF or Excel
- [ ] Custom tags / labels per apartment
- [ ] Price history tracking (if price changes on re-edit)

---

## Known Limitations

- No per-user auth — both partners share one password and see identical data
- Image URLs are user-supplied — broken links show a placeholder
- No rate limiting beyond a 500ms delay on wrong password
- Supabase free tier pauses after 1 week of inactivity

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
