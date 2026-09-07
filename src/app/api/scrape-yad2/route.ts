import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrapeResult {
  title: string;
  price: string;
  rooms: string;
  phone: string;
  seller_name: string;
  image_url: string;
  images: string[];
}

interface ScrapeError {
  error: string;
  captcha?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 15000;

// Yad2's internal gateway API endpoints
const YAD2_API_REALESTATE = "https://gw.yad2.co.il/realestate-feed/item";
const YAD2_API_ITEM       = "https://gw.yad2.co.il/api/item";
const YAD2_API_CUSTOMER   = "https://gw.yad2.co.il/realestate-item/customer";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetches customer contact info (including phone and name) from Yad2's customer API.
 */
async function fetchCustomerInfo(
  token: string,
  cookieHeader: string
): Promise<{ phone: string | null; name: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Use exact headers that browser sends for XHR requests
    const response = await fetch(`${YAD2_API_CUSTOMER}/${token}`, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": `https://www.yad2.co.il/realestate/item/${token}`,
        "Origin": "https://www.yad2.co.il",
        "Sec-Ch-Ua": '"Chromium";v="125", "Not.A/Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    console.log(`[scrape-yad2] Customer API status: ${response.status}, content-type: ${contentType}`);

    if (response.ok && contentType.includes("application/json")) {
      const data = await response.json();
      const phone = data?.data?.phone ?? data?.phone ?? null;
      const name = data?.data?.name ?? data?.name ?? null;
      if (phone || name) {
        console.log(`[scrape-yad2] Customer API returned phone: ${phone}, name: ${name}`);
        return {
          phone: phone ? String(phone).trim() : null,
          name: name ? String(name).trim() : null,
        };
      }
    } else if (!contentType.includes("application/json")) {
      console.warn(`[scrape-yad2] Customer API returned HTML (blocked by Radware)`);
    } else {
      console.warn(`[scrape-yad2] Customer API returned ${response.status}`);
    }
  } catch (err) {
    console.warn(`[scrape-yad2] Customer API fetch failed: ${err instanceof Error ? err.message : err}`);
  }
  return { phone: null, name: null };
}

/**
 * Extracts the item token from a Yad2 listing URL.
 * Handles formats like:
 *   https://www.yad2.co.il/realestate/item/jerusalem-area/s317bknb
 *   https://www.yad2.co.il/item/s317bknb
 *   https://www.yad2.co.il/realestate/item/s317bknb?opened-from=feed
 */
function extractItemToken(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    // The token is always the last path segment (alphanumeric, 6-12 chars)
    const last = segments[segments.length - 1];
    if (last && /^[a-zA-Z0-9]{4,20}$/.test(last)) {
      return last;
    }
    // Fallback: look for any segment that looks like a token
    for (let i = segments.length - 1; i >= 0; i--) {
      if (/^[a-zA-Z0-9]{6,20}$/.test(segments[i])) {
        return segments[i];
      }
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/**
 * Parses a Yad2 response into our ScrapeResult shape.
 * Supports multiple data structures:
 * 1. pageProps.dehydratedState.queries[0].state.data (Next.js React Query)
 * 2. Direct item/listing object
 * 3. Gateway API response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseApiResponse(data: any): Partial<ScrapeResult> {
  const result: Partial<ScrapeResult> = {};

  // ── Find the actual listing data ───────────────────────────────────────
  // Path 1: dehydratedState (React Query pattern from Next.js SSR)
  let item =
    data?.dehydratedState?.queries?.[0]?.state?.data ??
    data?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data ??
    null;

  // Path 2: Direct item/listing object
  if (!item) {
    item =
      data?.data?.listing ??
      data?.data?.item    ??
      data?.listing       ??
      data?.item          ??
      data?.data          ??
      data                ??
      null;
  }

  if (!item) return result;

  console.log(`[scrape-yad2] Found item data with keys: ${Object.keys(item).join(", ")}`);

  // ── Price ──────────────────────────────────────────────────────────────
  const rawPrice =
    item.price        ??
    item.abovePrice   ??
    item.rent_price   ??
    null;
  if (rawPrice != null) {
    const numeric = String(rawPrice).replace(/[^\d]/g, "");
    if (numeric) result.price = numeric;
  }

  // ── Rooms ──────────────────────────────────────────────────────────────
  const rawRooms =
    item.additionalDetails?.roomsCount    ??
    item.additionalDetails?.rooms         ??
    item.rooms                            ??
    item.roomsCount                       ??
    null;
  if (rawRooms != null) {
    result.rooms = String(rawRooms);
    console.log(`[scrape-yad2] Extracted rooms: ${result.rooms}`);
  }

  // ── Address / title ────────────────────────────────────────────────────
  const street       = item.address?.street?.text       ?? "";
  const houseNum     = item.address?.house?.number      ?? "";
  const neighborhood = item.address?.neighborhood?.text ?? "";
  const city         = item.address?.city?.text         ?? "";

  const addrParts = [street, houseNum, neighborhood, city].filter(Boolean);
  if (addrParts.length > 0) {
    result.title = addrParts.join(" ").replace(/\s+/g, " ").trim();
  }

  // ── Contact name (customer.name) ───────────────────────────────────────
  const contactName = item.customer?.name ?? null;
  if (contactName) {
    result.seller_name = String(contactName).trim();
  }
  
  // ── Phone ──────────────────────────────────────────────────────────────
  // Note: Yad2 often uses virtual phone numbers (isVirtualPhoneNumber: true)
  // The actual phone requires a separate API call, but we try common paths
  const rawPhone =
    item.customer?.phone    ??
    item.contactInfo?.phone ??
    item.contact?.phone     ??
    item.phone              ??
    null;
  if (rawPhone) {
    result.phone = String(rawPhone).replace(/[^\d\-+() ]/g, "").trim();
  }

  // ── Images ─────────────────────────────────────────────────────────────
  // Yad2 schema: metaData.images (array of URLs) or metaData.coverImage
  const coverImage = item.metaData?.coverImage ?? null;
  const images: string[] = item.metaData?.images ?? [];

  if (coverImage) {
    result.image_url = coverImage;
  } else if (Array.isArray(images) && images.length > 0) {
    result.image_url = images[0];
  }

  // Store all images for gallery
  if (Array.isArray(images) && images.length > 0) {
    result.images = images;
  }

  // Log what we found
  console.log(`[scrape-yad2] Parsed: title="${result.title}", price=${result.price}, seller="${result.seller_name}", images=${images.length}, phone=${result.phone ?? "(virtual)"}`);

  return result;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ScrapeResult | ScrapeError>> {
  // Parse body
  let url: string;
  let forwardedCookies: string | undefined;
  try {
    const body = await request.json();
    url = body?.url?.trim();
    forwardedCookies = body?.cookies ?? undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "URL is required." }, { status: 400 });
  }

  if (
    !url.startsWith("https://www.yad2.co.il/") &&
    !url.startsWith("http://www.yad2.co.il/")
  ) {
    return NextResponse.json(
      { error: "Only Yad2 URLs are supported." },
      { status: 422 }
    );
  }

  // ── Extract item token ─────────────────────────────────────────────────
  const token = extractItemToken(url);
  if (!token) {
    return NextResponse.json(
      { error: "Could not extract a listing ID from this URL. Make sure it's a direct listing link." },
      { status: 422 }
    );
  }

  // Try realestate-specific endpoint first, then generic item endpoint
  const isRealEstate = url.includes("/realestate/");
  const primaryApiUrl   = isRealEstate
    ? `${YAD2_API_REALESTATE}/${token}`
    : `${YAD2_API_ITEM}/${token}`;
  const fallbackApiUrl  = isRealEstate
    ? `${YAD2_API_ITEM}/${token}`
    : `${YAD2_API_REALESTATE}/${token}`;

  const apiHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: url,
    Origin: "https://www.yad2.co.il",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
  };

  // Use server-side cookies from env first (most reliable),
  // then fall back to whatever the client forwarded from its browser session.
  const envCookies = process.env.YAD2_COOKIES ?? "";
  const cookieHeader = envCookies || forwardedCookies || "";

  if (cookieHeader) {
    apiHeaders["Cookie"] = cookieHeader;
  }

  try {
    // Try primary endpoint, then fallback if 404
    for (const apiUrl of [primaryApiUrl, fallbackApiUrl]) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const apiResponse = await fetch(apiUrl, {
        method: "GET",
        headers: apiHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        const result = parseApiResponse(data);

        if (result.title || result.price) {
          // Fetch phone and seller name from customer API if not already available
          let phone = result.phone ?? "";
          let sellerName = result.seller_name ?? "";
          if (!phone || !sellerName) {
            const customerInfo = await fetchCustomerInfo(token, cookieHeader);
            if (customerInfo.phone && !phone) phone = customerInfo.phone;
            if (customerInfo.name && !sellerName) sellerName = customerInfo.name;
          }

          return NextResponse.json(
            {
              title:       result.title       ?? "",
              price:       result.price       ?? "",
              rooms:       result.rooms       ?? "",
              phone:       phone,
              seller_name: sellerName,
              image_url:   result.image_url   ?? "",
              images:      result.images      ?? [],
            },
            { status: 200 }
          );
        }
      }
      console.warn(`[scrape-yad2] Gateway API ${apiUrl} returned ${apiResponse.status}`);
    }
  } catch (err) {
    console.warn(`[scrape-yad2] Gateway API fetch failed: ${err instanceof Error ? err.message : err}`);
    // Fall through to HTML strategy
  }

  // ── Strategy 2: HTML page + __NEXT_DATA__ extraction ──────────────────
  // Falls back to fetching the listing HTML page and parsing the embedded
  // Next.js data blob. Forwarding cookies maximises chances of bypassing CAPTCHA.
  const htmlHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://www.yad2.co.il/realestate/rent",
    DNT: "1",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
  };

  if (cookieHeader) {
    htmlHeaders["Cookie"] = cookieHeader;
  }

  let html: string;
  try {
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), FETCH_TIMEOUT_MS);

    const htmlResponse = await fetch(url, {
      method: "GET",
      headers: htmlHeaders,
      signal: controller2.signal,
      redirect: "follow",
    });

    clearTimeout(timeout2);

    if (!htmlResponse.ok) {
      return NextResponse.json(
        { error: `Yad2 returned HTTP ${htmlResponse.status}. The listing may have been removed.` },
        { status: 502 }
      );
    }

    html = await htmlResponse.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort") || message.includes("timeout")) {
      return NextResponse.json(
        { error: "Request timed out. Yad2 did not respond in time." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Could not reach Yad2. Check the URL and try again." },
      { status: 502 }
    );
  }

  // Debug: log HTML size and title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const pageTitle = titleMatch?.[1]?.trim() ?? "(no title)";
  console.log(`[scrape-yad2] HTML size: ${html.length}, title: "${pageTitle}"`);

  // CAPTCHA / Radware bot detection
  const lower = html.toLowerCase();
  // Radware returns HTTP 200 with a silent JS challenge — detect by known fingerprints
  const hasNextData = html.includes("__NEXT_DATA__");
  const isRadwarePage = 
    pageTitle.toLowerCase().includes("radware") ||
    lower.includes("radware bot manager") ||
    lower.includes("rbzid") ||
    html.includes("eEA10qI3gHv1") ||       // Radware SVG animation element ID
    html.includes("window.rbzns") ||        // Radware namespace
    html.includes("_rbs_") ||               // Radware beacon script
    (html.includes("<svg") && !hasNextData && html.length > 50000);  // Large SVG without content = Radware

  const isCaptcha =
    lower.includes("hcaptcha") ||
    lower.includes("captcha") ||
    lower.includes("shieldsquare") ||
    lower.includes("בדיקת אבטחה") ||
    lower.includes("are you a robot") ||
    isRadwarePage;

  if (isCaptcha || isRadwarePage) {
    console.warn(`[scrape-yad2] Bot protection detected for token: ${token} (Radware: ${isRadwarePage}, hasNextData: ${hasNextData})`);
    return NextResponse.json(
      {
        error:
          "Yad2's bot protection blocked this request. Server-side scraping cannot bypass Radware. " +
          "Please enter the listing details manually.",
        captcha: true,
      },
      { status: 403 }
    );
  }

  // Parse __NEXT_DATA__ from the HTML
  try {
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );
    if (match?.[1]) {
      console.log(`[scrape-yad2] Found __NEXT_DATA__, parsing...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nextData: any = JSON.parse(match[1]);
      const result = parseApiResponse(nextData?.props?.pageProps ?? nextData);

      if (result.title || result.price) {
        // Fetch phone and seller name from customer API if not already available
        let phone = result.phone ?? "";
        let sellerName = result.seller_name ?? "";
        if (!phone || !sellerName) {
          const customerInfo = await fetchCustomerInfo(token, cookieHeader);
          if (customerInfo.phone && !phone) phone = customerInfo.phone;
          if (customerInfo.name && !sellerName) sellerName = customerInfo.name;
        }

        return NextResponse.json(
          {
            title:       result.title       ?? "",
            price:       result.price       ?? "",
            rooms:       result.rooms       ?? "",
            phone:       phone,
            seller_name: sellerName,
            image_url:   result.image_url   ?? "",
            images:      result.images      ?? [],
          },
          { status: 200 }
        );
      }
    } else {
      console.log(`[scrape-yad2] No __NEXT_DATA__ found, trying alternative parsers...`);
    }
  } catch (err) {
    console.warn(`[scrape-yad2] __NEXT_DATA__ parse failed: ${err}`);
  }

  // ── Strategy 3: Direct HTML scraping as fallback ──────────────────────
  // Extract data from meta tags, JSON-LD, or visible HTML elements
  try {
    const scraped: Partial<ScrapeResult> = {};

    // Try JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch?.[1]) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ld: any = JSON.parse(jsonLdMatch[1]);
        if (ld.name) scraped.title = ld.name;
        if (ld.offers?.price) scraped.price = String(ld.offers.price).replace(/[^\d]/g, "");
        if (ld.image) scraped.image_url = Array.isArray(ld.image) ? ld.image[0] : ld.image;
      } catch { /* ignore */ }
    }

    // Extract from meta tags
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1];
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
    if (ogTitle && !scraped.title) scraped.title = ogTitle.split("|")[0].trim();
    if (ogImage && !scraped.image_url) scraped.image_url = ogImage;

    // Extract price from common patterns (Hebrew: ₪ or שקל)
    const priceMatch = html.match(/(?:₪|ש"ח|שקל)\s*([\d,]+)/i) || 
                       html.match(/([\d,]+)\s*(?:₪|ש"ח|שקל)/i) ||
                       html.match(/"price"\s*:\s*"?([\d,]+)"?/i);
    if (priceMatch?.[1] && !scraped.price) {
      scraped.price = priceMatch[1].replace(/,/g, "");
    }

    // Extract phone from common patterns
    const phoneMatch = html.match(/(?:טלפון|phone|tel)[:\s]*([0-9\-+() ]{9,15})/i) ||
                       html.match(/"phone"\s*:\s*"([^"]+)"/i) ||
                       html.match(/href="tel:([^"]+)"/i);
    if (phoneMatch?.[1] && !scraped.phone) {
      scraped.phone = phoneMatch[1].replace(/[^\d\-+() ]/g, "").trim();
    }

    // Use page title as fallback for address
    if (!scraped.title && pageTitle && !pageTitle.toLowerCase().includes("yad2")) {
      scraped.title = pageTitle.split("|")[0].trim();
    }

    console.log(`[scrape-yad2] Scraped data:`, scraped);

    if (scraped.title || scraped.price) {
      return NextResponse.json(
        {
          title:       scraped.title       ?? "",
          price:       scraped.price       ?? "",
          rooms:       scraped.rooms       ?? "",
          phone:       scraped.phone       ?? "",
          seller_name: scraped.seller_name ?? "",
          image_url:   scraped.image_url   ?? "",
          images:      scraped.images      ?? [],
        },
        { status: 200 }
      );
    }
  } catch (err) {
    console.warn(`[scrape-yad2] HTML scraping failed: ${err}`);
  }

  return NextResponse.json(
    { error: "Could not extract listing data. Please fill in the details manually." },
    { status: 422 }
  );
}
