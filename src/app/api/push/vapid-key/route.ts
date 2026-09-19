// ============================================================
// GET /api/push/vapid-key
// Returns the VAPID public key to the client so it can
// subscribe the service worker to push notifications.
// ============================================================

import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID public key not configured." },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}
