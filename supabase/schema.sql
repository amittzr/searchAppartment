-- ============================================================
-- Apartment Tracker — Supabase PostgreSQL Schema (v1.2)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable the UUID extension (already enabled on Supabase by default)
create extension if not exists "uuid-ossp";

-- ============================================================
-- Table: apartments
-- ============================================================
create table if not exists public.apartments (
  id           uuid primary key default uuid_generate_v4(),
  household_id text not null default 'default-family',  -- v1.2: multi-household isolation
  url          text,                          -- link to original ad (Yad2 / Facebook)
  title        text not null,                 -- apartment title or address
  price        integer not null default 0,    -- monthly rent in local currency (used for sorting)
  rooms        text,                          -- v1.2: number of rooms (e.g., "3", "3.5", "4+")
  phone        text,                          -- landlord / agent phone number
  seller_name  text,                          -- name of the seller/landlord
  image_url    text,                          -- hero image for the card
  images       jsonb,                         -- array of all image URLs for gallery view
  reactions    jsonb default '{}',            -- v1.2: per-user reactions {"username": "liked"|"review"|"rejected"}
  status       text not null default 'all'    -- DEPRECATED: kept for backward compat, use reactions instead
                 check (status in ('all', 'liked', 'review', 'rejected')),
  notes        text,                          -- shared notes visible to both partners
  latitude     double precision,              -- v1.3: map coordinates
  longitude    double precision,              -- v1.3: map coordinates
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Migration v1.2: Add new columns if table already exists
-- Run these ALTER statements if upgrading from v1.0/v1.1
-- ============================================================
-- ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS household_id text NOT NULL DEFAULT 'default-family';
-- ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS rooms text;
-- ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}';
-- ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS latitude double precision;
-- ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS longitude double precision;

-- ============================================================
-- Row Level Security (RLS)
-- The app uses a single shared anonymous key (no per-user auth),
-- so we allow full public access. Restrict via env secrets + 
-- the lightweight password middleware instead of Supabase Auth.
-- ============================================================
alter table public.apartments enable row level security;

-- Allow all operations for anyone using the anon key
create policy "Allow full public access"
  on public.apartments
  for all
  using (true)
  with check (true);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
create index if not exists idx_apartments_status       on public.apartments (status);
create index if not exists idx_apartments_created_at   on public.apartments (created_at desc);
create index if not exists idx_apartments_price        on public.apartments (price asc);
create index if not exists idx_apartments_household_id on public.apartments (household_id);   -- v1.2
create index if not exists idx_apartments_rooms        on public.apartments (rooms);          -- v1.2

-- ============================================================
-- Enable real-time replication for the apartments table
-- (required for Supabase Realtime subscriptions)
-- ============================================================
alter publication supabase_realtime add table public.apartments;
