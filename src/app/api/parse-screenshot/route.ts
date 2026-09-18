// ============================================================
// POST /api/parse-screenshot
// Accepts multipart FormData:
//   - file:     image file (JPEG/PNG/WebP)
//   - category: "apartment" | "bride_venue" | "car"
//
// Resilience strategy:
//   1. Try primary model (gemini-3.6-flash) with exponential backoff
//      on transient errors (503/429) — up to 3 retries.
//   2. If primary exhausts retries, fall back to gemini-1.5-flash once.
//   3. If both fail, return structured { success: false, error: "high_demand" }.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Model configuration ────────────────────────────────────────────────────────

const PRIMARY_MODEL  = "gemini-3.6-flash";   // fast primary model
const FALLBACK_MODEL = "gemini-2.5-flash";   // fallback if primary unavailable

// Retry delays in milliseconds: 1s → 2s → 4s (exponential backoff)
const RETRY_DELAYS_MS = [1000, 2000, 4000];

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ApartmentExtraction {
  title:       string;
  price:       number | null;
  rooms:       string;
  phone:       string;
  seller_name: string;
}

export interface CarExtraction {
  title:       string;
  price:       number | null;
  year:        string;
  mileage:     string;
  phone:       string;
  seller_name: string;
}

export interface VenueExtraction {
  title:       string;
  price:       number | null;
  rooms:       string;
  phone:       string;
  seller_name: string;
}

export type ScreenshotExtraction =
  | ApartmentExtraction
  | CarExtraction
  | VenueExtraction;

export interface ParseScreenshotSuccess extends Record<string, unknown> {
  success: true;
  data:    ScreenshotExtraction & { price: string };
  model:   string; // which model actually responded
}

export interface ParseScreenshotError {
  success: false;
  error:   "high_demand" | "parse_error" | "invalid_input" | "server_error";
  message: string;
}

export type ParseScreenshotResponse = ParseScreenshotSuccess | ParseScreenshotError;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns true for transient HTTP errors that are worth retrying. */
function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("503") || msg.includes("429") || msg.toLowerCase().includes("unavailable");
}

/** Returns true for permanent model-not-found errors — skip retries, use fallback. */
function isModelUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("no longer available") ||
    msg.toLowerCase().includes("deprecated")
  );
}

/** Async delay using a plain Promise — no extra packages needed. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Prompt builders ────────────────────────────────────────────────────────────

function buildPrompt(category: string): string {
  const base = `You are a data extraction assistant. Analyze this screenshot of a real estate or product listing.
Extract the relevant information and return ONLY a valid JSON object — no markdown, no explanation, no code fences.
If a field is not visible, return an empty string "" for strings or null for numbers.
All text values should be in their original language (Hebrew is fine).`;

  if (category === "apartment" || category === "bride_venue") {
    return `${base}

Return this exact JSON shape:
{
  "title": "full address or venue name",
  "price": 5500,
  "rooms": "3",
  "phone": "050-1234567",
  "seller_name": "contact name"
}

Rules:
- title: full address (street, number, neighborhood, city) or venue name
- price: numeric only, no currency symbols. Monthly rent or price per night.
- rooms: number as string (e.g., "3" or "3.5")
- phone: Israeli phone number if visible, else ""
- seller_name: name of the landlord/agent/venue contact`;
  }

  if (category === "car") {
    return `${base}

Return this exact JSON shape:
{
  "title": "make model trim",
  "price": 85000,
  "year": "2020",
  "mileage": "45000",
  "phone": "050-1234567",
  "seller_name": "seller name"
}

Rules:
- title: car make, model, and trim (e.g., "Toyota Corolla Cross")
- price: numeric only, no currency symbols
- year: 4-digit year as string
- mileage: km number as string, digits only (e.g., "45000")
- phone: Israeli phone number if visible, else ""
- seller_name: name of the seller if visible`;
  }

  return `${base}

Return this exact JSON shape:
{
  "title": "listing title",
  "price": 0,
  "phone": "",
  "seller_name": ""
}`;
}

// ── Core Gemini call (single attempt) ─────────────────────────────────────────

async function callGemini(
  genAI:    GoogleGenerativeAI,
  model:    string,
  base64Data: string,
  mimeType:   string,
  prompt:     string
): Promise<string> {
  const geminiModel = genAI.getGenerativeModel({ model });
  const result = await geminiModel.generateContent([
    { inlineData: { data: base64Data, mimeType: mimeType as any } },
    prompt,
  ]);
  return result.response.text().trim();
}

// ── Resilient Gemini call (retries + fallback) ────────────────────────────────

interface GeminiResult {
  rawText: string;
  usedModel: string;
}

async function callGeminiResilient(
  genAI:      GoogleGenerativeAI,
  base64Data: string,
  mimeType:   string,
  prompt:     string
): Promise<GeminiResult> {

  let lastError: unknown = null;

  // ── Primary model with exponential backoff ─────────────────────────────────
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const rawText = await callGemini(genAI, PRIMARY_MODEL, base64Data, mimeType, prompt);
      if (attempt > 0) {
        console.log(`[parse-screenshot] Primary model succeeded on attempt ${attempt + 1}`);
      }
      return { rawText, usedModel: PRIMARY_MODEL };
    } catch (err) {
      lastError = err;

      if (isModelUnavailableError(err)) {
        // Model is deprecated/gone — no point retrying, go straight to fallback
        console.warn(`[parse-screenshot] Primary model unavailable, switching to fallback. Error: ${err}`);
        break;
      }

      if (isTransientError(err) && attempt < RETRY_DELAYS_MS.length) {
        const waitMs = RETRY_DELAYS_MS[attempt];
        console.warn(`[parse-screenshot] Primary model transient error (attempt ${attempt + 1}). Retrying in ${waitMs}ms...`);
        await delay(waitMs);
        continue;
      }

      // Non-transient, non-model error — fail immediately
      console.error(`[parse-screenshot] Primary model unrecoverable error:`, err);
      break;
    }
  }

  // ── Fallback model (single attempt) ───────────────────────────────────────
  console.warn(`[parse-screenshot] Falling back to ${FALLBACK_MODEL}...`);
  try {
    const rawText = await callGemini(genAI, FALLBACK_MODEL, base64Data, mimeType, prompt);
    console.log(`[parse-screenshot] Fallback model succeeded.`);
    return { rawText, usedModel: FALLBACK_MODEL };
  } catch (fallbackErr) {
    console.error(`[parse-screenshot] Fallback model also failed:`, fallbackErr);
    // Throw the original primary error to preserve meaningful context
    throw lastError ?? fallbackErr;
  }
}

// ── JSON parser ────────────────────────────────────────────────────────────────

function parseGeminiJson(rawText: string): ScreenshotExtraction {
  // Strip markdown code fences that Gemini occasionally adds
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Validate API key ───────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ParseScreenshotError>(
      { success: false, error: "server_error", message: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  // ── Parse multipart form data ──────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json<ParseScreenshotError>(
      { success: false, error: "invalid_input", message: "Invalid request: expected multipart/form-data." },
      { status: 400 }
    );
  }

  const file     = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "apartment";

  if (!file || file.size === 0) {
    return NextResponse.json<ParseScreenshotError>(
      { success: false, error: "invalid_input", message: "No image file provided." },
      { status: 400 }
    );
  }

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json<ParseScreenshotError>(
      { success: false, error: "invalid_input", message: "Unsupported file type. Please upload a JPEG, PNG, or WebP image." },
      { status: 422 }
    );
  }

  // ── Prepare image data ─────────────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const base64Data  = Buffer.from(arrayBuffer).toString("base64");
  const mimeType    = file.type;
  const prompt      = buildPrompt(category);
  const genAI       = new GoogleGenerativeAI(apiKey);

  // ── Call Gemini with retry + fallback ──────────────────────────────────────
  let rawText: string;
  let usedModel: string;

  try {
    const result = await callGeminiResilient(genAI, base64Data, mimeType, prompt);
    rawText   = result.rawText;
    usedModel = result.usedModel;
    console.log(`[parse-screenshot] Response from ${usedModel}: ${rawText.slice(0, 300)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isHighDemand = isTransientError(err);

    console.error("[parse-screenshot] All models failed:", msg);

    return NextResponse.json<ParseScreenshotError>(
      {
        success: false,
        error:   isHighDemand ? "high_demand" : "server_error",
        message: isHighDemand
          ? "The AI service is currently experiencing high demand. Please wait a moment and try again."
          : `AI extraction failed: ${msg}`,
      },
      { status: isHighDemand ? 503 : 500 }
    );
  }

  // ── Parse JSON response ────────────────────────────────────────────────────
  let parsed: ScreenshotExtraction;
  try {
    parsed = parseGeminiJson(rawText);
  } catch {
    console.error("[parse-screenshot] JSON parse failed. Raw:", rawText.slice(0, 300));
    return NextResponse.json<ParseScreenshotError>(
      {
        success: false,
        error:   "parse_error",
        message: "AI returned an unreadable response. Try uploading a clearer screenshot.",
      },
      { status: 422 }
    );
  }

  // ── Normalise and return ───────────────────────────────────────────────────
  return NextResponse.json<ParseScreenshotSuccess>(
    {
      success: true,
      model:   usedModel,
      data: {
        ...(parsed as unknown as Record<string, unknown>),
        price: parsed.price != null ? String(parsed.price) : "",
      } as ParseScreenshotSuccess["data"],
    },
    { status: 200 }
  );
}
