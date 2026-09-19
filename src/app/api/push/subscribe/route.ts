// ============================================================
// POST /api/push/subscribe
// Saves or removes a Web Push subscription tied to the
// authenticated user's current household group.
//
// Body (JSON):
//   { action: "subscribe",   subscription: PushSubscription }
//   { action: "unsubscribe", endpoint: string }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // ── Auth guard ────────────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Get user's household_id from profile ─────────────────────────────────
  const { data: profile, error: profileError } = await (supabase
    .from("profiles") as any)
    .select("household_id")
    .eq("id", user.id)
    .single() as { data: { household_id: string | null } | null; error: any };

  if (profileError || !profile?.household_id) {
    return NextResponse.json(
      { error: "No household found for this user." },
      { status: 400 }
    );
  }

  const groupId = profile.household_id;

  // ── Parse request body ────────────────────────────────────────────────────
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action, subscription, endpoint } = body;

  // ── Subscribe ─────────────────────────────────────────────────────────────
  if (action === "subscribe") {
    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription object." },
        { status: 400 }
      );
    }

    // Upsert: if this browser already has a subscription, update it
    const { error: upsertError } = await (supabase
      .from("push_subscriptions") as any)
      .upsert(
        {
          user_id:      user.id,
          group_id:     groupId,
          subscription: subscription,
        },
        {
          onConflict: "user_id, subscription->>'endpoint'",
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      // Fall back to insert on upsert failure (index conflict handling varies)
      const { error: insertError } = await (supabase
        .from("push_subscriptions") as any)
        .insert({
          user_id:      user.id,
          group_id:     groupId,
          subscription: subscription,
        });

      if (insertError && !insertError.message.includes("duplicate")) {
        console.error("[push/subscribe] Insert failed:", insertError.message);
        return NextResponse.json(
          { error: "Failed to save subscription." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  }

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  if (action === "unsubscribe") {
    const ep = endpoint ?? subscription?.endpoint;
    if (!ep) {
      return NextResponse.json(
        { error: "Missing endpoint for unsubscribe." },
        { status: 400 }
      );
    }

    // Delete by matching the endpoint inside the JSONB field
    const { error: deleteError } = await (supabase
      .from("push_subscriptions") as any)
      .delete()
      .eq("user_id", user.id)
      .eq("subscription->>endpoint", ep);

    if (deleteError) {
      console.error("[push/subscribe] Delete failed:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to remove subscription." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  }

  return NextResponse.json(
    { error: `Unknown action: "${action}". Use "subscribe" or "unsubscribe".` },
    { status: 400 }
  );
}
