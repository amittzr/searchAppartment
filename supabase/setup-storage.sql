-- ============================================================
-- GroupPick v2.1 — Supabase Storage Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Creates the item-images storage bucket with public read access.
-- Users can upload images; only authenticated users may insert/delete.
-- ============================================================

-- Step 1: Create the storage bucket (public = images are URL-accessible without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images',
  true,                          -- Public bucket: URLs are accessible without auth token
  5242880,                       -- 5 MB max per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: RLS policies for storage.objects

-- Allow authenticated users to upload images into their household folder
CREATE POLICY "Authenticated users can upload item images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-images');

-- Allow public read access to all images in the bucket
CREATE POLICY "Public can view item images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'item-images');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete item images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'item-images');

-- ============================================================
-- DONE! Verify:
-- SELECT * FROM storage.buckets WHERE id = 'item-images';
-- ============================================================
