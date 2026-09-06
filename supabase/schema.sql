-- ============================================================
-- Apartment Tracker — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable the UUID extension (already enabled on Supabase by default)
create extension if not exists "uuid-ossp";

-- ============================================================
-- Table: apartments
-- ============================================================
create table if not exists public.apartments (
  id          uuid primary key default uuid_generate_v4(),
  url         text,                          -- link to original ad (Yad2 / Facebook)
  title       text not null,                 -- apartment title or address
  price       integer not null default 0,    -- monthly rent in local currency (used for sorting)
  phone       text,                          -- landlord / agent phone number
  seller_name text,                          -- name of the seller/landlord
  image_url   text,                          -- hero image for the card
  images      jsonb,                         -- array of all image URLs for gallery view
  status      text not null default 'all'    -- reaction: 'all' | 'liked' | 'review' | 'rejected'
                check (status in ('all', 'liked', 'review', 'rejected')),
  notes       text,                          -- shared notes visible to both partners
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Migration: Add new columns if table already exists
-- Run these if upgrading an existing installation
-- ============================================================
-- ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS seller_name text;
-- ALTER TABLE public.apartments ADD COLUMN IF NOT EXISTS images jsonb;

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
create index if not exists idx_apartments_status     on public.apartments (status);
create index if not exists idx_apartments_created_at on public.apartments (created_at desc);
create index if not exists idx_apartments_price      on public.apartments (price asc);

-- ============================================================
-- Enable real-time replication for the apartments table
-- (required for Supabase Realtime subscriptions)
-- ============================================================
alter publication supabase_realtime add table public.apartments;
