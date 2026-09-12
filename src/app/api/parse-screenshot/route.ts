// ============================================================
// POST /api/parse-screenshot
// Accepts a multipart FormData with:
//   - file: the screenshot image
//   - category: "apartment" | "bride_venue" | "car"
//
// Sends the image to Google Gemini Vision (gemini-1.5-flash)
// with a dynamic category-specific prompt and returns structured JSON.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  // Generic fallback
  return `${base}

Return this exact JSON shape:
{
  "title": "listing title",
  "price": 0,
  "phone": "",
  "seller_name": ""
}`;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Validate API key ───────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  // ── Parse multipart form data ──────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request: expected multipart/form-data." },
      { status: 400 }
    );
  }

  const file     = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "apartment";

  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: "No image file provided." },
      { status: 400 }
    );
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPEG, PNG, or WebP image." },
      { status: 422 }
    );
  }

  // ── Convert file to base64 for Gemini inline data ──────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const base64Data  = Buffer.from(arrayBuffer).toString("base64");
  const mimeType    = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  // ── Call Gemini Vision ─────────────────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = buildPrompt(category);

    const result = await model.generateContent([
      {
        inlineData: {
          data:     base64Data,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const rawText = result.response.text().trim();
    console.log(`[parse-screenshot] Gemini raw response: ${rawText.slice(0, 500)}`);

    // ── Parse JSON from response ─────────────────────────────────────────────
    // Gemini sometimes wraps in markdown fences despite instructions — strip them
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: ScreenshotExtraction;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[parse-screenshot] Failed to parse JSON:", cleaned);
      return NextResponse.json(
        {
          error: "Gemini returned an unreadable response. Try a clearer screenshot.",
          raw: rawText.slice(0, 300),
        },
        { status: 422 }
      );
    }

    // Normalise: ensure price is a string for the form (it stores price as string)
    const normalised = {
      ...parsed,
      price: parsed.price != null ? String(parsed.price) : "",
    };

    return NextResponse.json(normalised, { status: 200 });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Gemini error";
    console.error("[parse-screenshot] Gemini API error:", message);
    return NextResponse.json(
      { error: `AI extraction failed: ${message}` },
      { status: 500 }
    );
  }
}
