// ============================================================
// Image Upload Utility — Supabase Storage
// Uploads one or more image files to the 'item-images' bucket
// and returns their public URLs.
// ============================================================

import { getSupabaseClient } from "@/lib/supabase-client";

const BUCKET = "item-images";

// Max file size: 5 MB
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Accepted MIME types (must match bucket policy)
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export interface UploadResult {
  url:   string;  // Public URL of the uploaded image
  path:  string;  // Storage path (for deletion)
  error: null;
}

export interface UploadError {
  url:   null;
  path:  null;
  error: string;
}

export type SingleUploadResult = UploadResult | UploadError;

/**
 * Validates a single file before uploading.
 * Returns an error message string if invalid, null if valid.
 */
function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported image type (JPEG, PNG, WebP, GIF only).`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the 5 MB size limit.`;
  }
  return null;
}

/**
 * Generates a unique storage path for an uploaded file.
 * Format: {householdId}/{timestamp}-{randomHex}.{ext}
 */
function buildStoragePath(file: File, householdId: string): string {
  const ext       = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const timestamp = Date.now();
  const random    = Math.random().toString(16).slice(2, 8);
  return `${householdId}/${timestamp}-${random}.${ext}`;
}

/**
 * Uploads a single File to Supabase Storage.
 */
async function uploadSingleImage(
  file: File,
  householdId: string
): Promise<SingleUploadResult> {
  const validationError = validateFile(file);
  if (validationError) {
    return { url: null, path: null, error: validationError };
  }

  const supabase = getSupabaseClient();
  const path     = buildStoragePath(file, householdId);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { url: null, path: null, error: uploadError.message };
  }

  // Get the permanent public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: data.publicUrl, path, error: null };
}

/**
 * Uploads multiple files concurrently.
 * Returns an array of results — successes and failures independently.
 */
export async function uploadImages(
  files: File[],
  householdId: string
): Promise<{
  urls:   string[];       // Successfully uploaded public URLs
  errors: string[];       // Any per-file error messages
}> {
  if (files.length === 0) return { urls: [], errors: [] };

  const results = await Promise.all(
    files.map((file) => uploadSingleImage(file, householdId))
  );

  const urls:   string[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.error) {
      errors.push(result.error);
    } else if (result.url) {
      urls.push(result.url);
    }
  }

  return { urls, errors };
}

/**
 * Deletes a single image from storage by its path.
 * Used for cleanup if an item is deleted.
 */
export async function deleteImage(path: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return { error: error?.message ?? null };
}

// ── Storage path extraction ───────────────────────────────────────────────────

/**
 * The public URL prefix for our Supabase Storage bucket.
 * Any image URL starting with this prefix is an internally uploaded file.
 */
function getStorageUrlPrefix(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
}

/**
 * Extracts the relative storage path from a full Supabase Storage public URL.
 * Returns null if the URL is external (e.g. Yad2 CDN, Facebook, etc.)
 *
 * Example:
 *   Input:  "https://xyz.supabase.co/storage/v1/object/public/item-images/abc/file.jpg"
 *   Output: "abc/file.jpg"
 */
export function extractStoragePath(url: string): string | null {
  if (!url) return null;
  const prefix = getStorageUrlPrefix();
  if (!prefix || !url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}

/**
 * Extracts all internal Supabase Storage paths from an item's image fields.
 * Filters out external URLs (Yad2, Facebook, etc.) and returns only paths
 * that can be passed to `supabase.storage.from(BUCKET).remove(paths)`.
 *
 * @param imageUrl  - The hero image URL (may be null)
 * @param images    - The full images array (may be null/empty)
 */
export function extractStoragePathsFromItem(
  imageUrl: string | null | undefined,
  images:   string[] | null | undefined
): string[] {
  const allUrls = new Set<string>();

  if (imageUrl) allUrls.add(imageUrl);
  (images ?? []).forEach((u) => { if (u) allUrls.add(u); });

  const paths: string[] = [];
  for (const url of allUrls) {
    const path = extractStoragePath(url);
    if (path) paths.push(path);
  }

  return paths;
}

/**
 * Deletes all Supabase Storage files associated with an item.
 * Silently ignores external URLs and handles empty arrays gracefully.
 * Errors are logged but not thrown — storage cleanup is best-effort.
 */
export async function deleteItemImages(
  imageUrl: string | null | undefined,
  images:   string[] | null | undefined
): Promise<void> {
  const paths = extractStoragePathsFromItem(imageUrl, images);
  if (paths.length === 0) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(BUCKET).remove(paths);

  if (error) {
    // Non-fatal: log but do not block the DB deletion
    console.warn(`[upload-images] Storage cleanup failed for paths [${paths.join(", ")}]:`, error.message);
  } else {
    console.log(`[upload-images] Deleted ${paths.length} file(s) from storage.`);
  }
}
