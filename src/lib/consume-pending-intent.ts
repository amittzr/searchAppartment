// ============================================================
// consumePendingIntent
//
// Turns the item a demo visitor filled in (stored by the /demo
// playground) into a real item in their new household. Runs once
// from the live dashboard after signup + onboarding.
//
// The form was already extracted/filled in the demo, so nothing is
// scraped or sent to the AI again here. We only upload any photos
// that were kept in the browser as data URLs, then insert the item.
// ============================================================

import { geocodeAddress, extractAddressFromTitle } from "@/lib/geocode";
import { uploadImages } from "@/lib/upload-images";
import {
  clearPendingIntent,
  dataUrlToFile,
  readPendingIntent,
  type PendingItemData,
} from "@/lib/pending-intent";
import type { CategoryType, ItemInsert, ItemMetadata } from "@/types/database";

type NewItemPayload = Omit<ItemInsert, "household_id" | "category">;

export interface ConsumeParams {
  householdId: string;
  category: CategoryType;
  addApartment: (data: NewItemPayload) => Promise<{ error: string | null }>;
}

export type ConsumeResult =
  | { status: "none" }
  | { status: "added"; title: string; photosFailed: boolean }
  | { status: "failed"; message: string };

// Guards against React strict mode / double mounts creating the item twice.
let consumeInFlight = false;

const isDataUrl = (value: string) => value.startsWith("data:");

/** Uploads data-URL photos to storage and returns the final public image list. */
async function resolveImages(
  data: PendingItemData,
  householdId: string
): Promise<{ images: string[]; imageUrl: string | null; photosFailed: boolean }> {
  const uploadedByDataUrl = new Map<string, string>();
  let photosFailed = false;

  const dataUrls = data.images.filter(isDataUrl);
  if (data.image_url && isDataUrl(data.image_url) && !dataUrls.includes(data.image_url)) {
    dataUrls.push(data.image_url);
  }

  for (const [index, dataUrl] of dataUrls.entries()) {
    try {
      const file = await dataUrlToFile(dataUrl, `demo-photo-${index + 1}.jpg`);
      const { urls } = await uploadImages([file], householdId);
      if (urls[0]) uploadedByDataUrl.set(dataUrl, urls[0]);
      else photosFailed = true;
    } catch {
      photosFailed = true;
    }
  }

  // Keep external URLs as-is, swap uploaded data URLs, drop photos that failed
  const images = data.images
    .map((src) => (isDataUrl(src) ? uploadedByDataUrl.get(src) : src))
    .filter((src): src is string => !!src);

  const hero = data.image_url
    ? isDataUrl(data.image_url)
      ? uploadedByDataUrl.get(data.image_url)
      : data.image_url
    : undefined;

  return { images, imageUrl: hero ?? images[0] ?? null, photosFailed };
}

async function geocodeTitle(title: string): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const result = await geocodeAddress(extractAddressFromTitle(title));
    if (result) return { latitude: result.latitude, longitude: result.longitude };
  } catch {
    // Geocoding is optional - the item is still saved without coordinates
  }
  return { latitude: null, longitude: null };
}

export async function consumePendingIntent(params: ConsumeParams): Promise<ConsumeResult> {
  const { householdId, category, addApartment } = params;

  if (consumeInFlight) return { status: "none" };
  const intent = readPendingIntent();
  if (!intent) return { status: "none" };

  // The demo only shows apartments. Adding one to a car/venue household would be wrong.
  if (category !== "apartment") {
    clearPendingIntent();
    return { status: "none" };
  }

  consumeInFlight = true;
  try {
    const { data } = intent;
    const { images, imageUrl, photosFailed } = await resolveImages(data, householdId);
    const title = data.title.trim();
    const coords = await geocodeTitle(title);

    const payload: NewItemPayload = {
      url: data.url.trim() || null,
      title,
      price: Number(data.price) || 0,
      rooms: data.rooms.trim() || null,
      phone: data.phone.trim() || null,
      seller_name: data.seller_name.trim() || null,
      image_url: imageUrl,
      images: images.length > 0 ? images : null,
      metadata: (data.metadata ?? {}) as ItemMetadata,
      ...coords,
    };

    const { error } = await addApartment(payload);
    if (error) {
      // Keep the intent so a later visit can retry
      return { status: "failed", message: error };
    }

    clearPendingIntent();
    return { status: "added", title, photosFailed };
  } catch (err) {
    return {
      status: "failed",
      message: err instanceof Error ? err.message : "Could not add your saved apartment.",
    };
  } finally {
    consumeInFlight = false;
  }
}
