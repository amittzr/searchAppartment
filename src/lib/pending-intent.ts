// ============================================================
// Pending intent — preserves what a demo visitor tried to add
// until they finish signing up.
//
// Stored in localStorage (not sessionStorage) so it survives the
// email-confirmation round trip, which often happens in a new tab.
// Entries expire after 24 hours.
// ============================================================

const STORAGE_KEY = "justpick_pending_item";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Screenshots are downscaled before storing to stay within the localStorage quota.
const MAX_SCREENSHOT_EDGE_PX = 1600;
const SCREENSHOT_JPEG_QUALITY = 0.8;

/**
 * The add-form values a demo visitor filled in (typed, auto-filled from Yad2
 * or extracted from a screenshot). Image entries may be data URLs that still
 * need uploading to storage after signup.
 */
export interface PendingItemData {
  url: string;
  title: string;
  price: string;
  rooms: string;
  phone: string;
  seller_name: string;
  image_url: string;
  images: string[];
  metadata: Record<string, unknown>;
}

export interface PendingIntent {
  type: "item";
  data: PendingItemData;
  createdAt: number;
}

/** Input accepted by savePendingIntent (createdAt is added automatically). */
export type PendingIntentInput = Pick<PendingIntent, "type" | "data">;

/** Returns true when the intent was stored, false when storage is unavailable or full. */
export function savePendingIntent(input: PendingIntentInput): boolean {
  if (typeof window === "undefined") return false;
  try {
    const intent: PendingIntent = { ...input, createdAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
    return true;
  } catch {
    return false;
  }
}

/** Reads the pending intent, discarding it when it is malformed or expired. */
export function readPendingIntent(): PendingIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingIntent> | null;
    const isFresh =
      !!parsed &&
      typeof parsed.createdAt === "number" &&
      Date.now() - parsed.createdAt < MAX_AGE_MS;
    const data = (parsed as { data?: Partial<PendingItemData> } | null)?.data;
    const isValid =
      parsed?.type === "item" &&
      !!data &&
      typeof data.title === "string" &&
      Array.isArray(data.images);

    if (!isFresh || !isValid) {
      clearPendingIntent();
      return null;
    }
    return parsed as PendingIntent;
  } catch {
    clearPendingIntent();
    return null;
  }
}

export function clearPendingIntent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable - nothing to clear
  }
}

/**
 * Downscales an image file and returns it as a JPEG data URL.
 * Returns null when the file cannot be decoded as an image.
 */
export function fileToCompressedDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, MAX_SCREENSHOT_EDGE_PX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", SCREENSHOT_JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}

// ── Demo AI allowance ────────────────────────────────────────────────────────
// Demo visitors get ONE successful AI screenshot extraction. This browser flag
// is a UX guard; the server-side per-IP rate limit is the real cost control.
const DEMO_AI_USED_KEY = "justpick_demo_ai_used";

export function hasUsedDemoAi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_AI_USED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDemoAiUsed(): void {
  try {
    window.localStorage.setItem(DEMO_AI_USED_KEY, "1");
  } catch {
    // Storage unavailable - the server-side limit still applies
  }
}

/** Converts a data URL back into a File so it can be uploaded and parsed. */
export async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}
