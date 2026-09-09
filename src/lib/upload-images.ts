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
