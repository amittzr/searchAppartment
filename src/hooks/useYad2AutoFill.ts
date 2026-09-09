"use client";

import { useState, useCallback } from "react";
import type { ScrapeResult } from "@/app/api/scrape-yad2/route";

export type AutoFillStatus = "idle" | "loading" | "success" | "error" | "captcha";

interface UseYad2AutoFillReturn {
  status: AutoFillStatus;
  errorMessage: string | null;
  trigger: (url: string) => Promise<Partial<ScrapeResult> | null>;
  reset: () => void;
}

// ── Cookie collector ──────────────────────────────────────────────────────────

/**
 * Collects all cookies the browser currently holds for yad2.co.il
 * using the Cookie Store API (Chrome 87+) if available, otherwise
 * falls back to document.cookie (which only returns non-httpOnly cookies).
 *
 * These are forwarded to the server-side route so Yad2 sees the request
 * as coming from the user's authenticated session — bypassing CAPTCHA.
 */
async function collectYad2Cookies(): Promise<string> {
  try {
    // Cookie Store API — gives access to all same-site cookies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookieStore = (window as any).cookieStore;
    if (cookieStore?.getAll) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all: any[] = await cookieStore.getAll();
      const yad2 = all
        .filter((c) => c.domain?.includes("yad2") || c.domain?.includes("yad-il") || c.name?.startsWith("y2"))
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");
      if (yad2) return yad2;
    }
  } catch {
    // Cookie Store API not available — fall through
  }

  // Fallback: document.cookie (non-httpOnly cookies only)
  // Still useful since Yad2's bot-detection token is often non-httpOnly
  return document.cookie;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Handles Yad2 listing auto-fill with a two-step strategy:
 *
 * 1. Fetch via the server-side /api/scrape-yad2 route, forwarding the
 *    user's browser cookies so Yad2 treats the request as coming from
 *    a real verified session — this bypasses the CAPTCHA in most cases.
 *
 * 2. If CAPTCHA is still returned (e.g. no valid session cookies exist),
 *    surface a clear amber banner telling the user to fill in manually.
 */
export function useYad2AutoFill(): UseYad2AutoFillReturn {
  const [status, setStatus]             = useState<AutoFillStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const trigger = useCallback(
    async (url: string): Promise<Partial<ScrapeResult> | null> => {
      if (!url) {
        setStatus("error");
        setErrorMessage("Paste a Yad2 URL first.");
        return null;
      }

      if (!url.includes("yad2.co.il") && !url.includes("yad-il.co.il")) {
        setStatus("error");
        setErrorMessage("Auto-fill only works with Yad2 links (yad2.co.il).");
        return null;
      }

      setStatus("loading");
      setErrorMessage(null);

      // Collect cookies from the user's browser session to forward to the API
      const cookies = await collectYad2Cookies();

      try {
        const res = await fetch("/api/scrape-yad2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, cookies }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data?.captcha) {
            setStatus("captcha");
            setErrorMessage(
              "Yad2 blocked the auto-fill request. " +
              "Open the listing in your browser first (so Yad2 sets a session cookie), " +
              "then try Auto-Fill again — or fill in the details manually."
            );
          } else {
            setStatus("error");
            setErrorMessage(
              data?.error ?? "Auto-fill failed. Please fill in the details manually."
            );
          }
          return null;
        }

        const scraped = data as ScrapeResult;

        if (scraped.title || scraped.price) {
          setStatus("success");
          return scraped;
        }

        // API returned 200 but no useful data
        setStatus("error");
        setErrorMessage(
          "Could not extract data from this listing. Please fill in the details manually."
        );
        return null;
      } catch {
        setStatus("error");
        setErrorMessage("Network error during auto-fill. Please fill in the details manually.");
        return null;
      }
    },
    []
  );

  return { status, errorMessage, trigger, reset };
}
