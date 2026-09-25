// ============================================================
// POST /api/push/subscribe
// Saves or removes a Web Push subscription tied to the
// authenticated user's current household group.
//
// Body (JSON):
//   { action: "subscribe",   subscription: PushSubscription }
//   { action: "unsubscribe", endpoint: string }
//
// Key isolation guarantee:
//   On every subscribe, we DELETE all previous subscriptions for this
//   user first, then insert the new one. This prevents orphaned rows
//   that still carry an old group_id from a previous household.
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

  // ── Get user's current household_id from their profile ───────────────────
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
        { error: "Invalid subscription object: missing endpoint." },
        { status: 400 }
      );
    }

    // Validate the subscription object has the required keys for web-push
    if (!subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription object: missing encryption keys." },
        { status: 400 }
      );
    }

    // ── CRITICAL: Delete ALL existing subscriptions for this user first ───
    // This eliminates orphaned rows from previous households.
    // If a user leaves group A and joins group B, their old group A
    // subscription is removed here, preventing cross-group notification leakage.
    const { error: deleteOldError } = await (supabase
      .from("push_subscriptions") as any)
      .delete()
      .eq("user_id", user.id);

    if (deleteOldError) {
      // Log but do not abort — the insert below will still work
      console.warn("[push/subscribe] Could not remove old subscriptions:", deleteOldError.message);
    } else {
      console.log(`[push/subscribe] Cleared old subscriptions for user ${user.id}`);
    }

    // ── Insert the fresh subscription with the current group_id ──────────
    const { error: insertError } = await (supabase
      .from("push_subscriptions") as any)
      .insert({
        user_id:      user.id,
        group_id:     groupId,  // ← always the user's CURRENT household
        subscription: subscription,
      });

    if (insertError) {
      console.error("[push/subscribe] Insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to save subscription." },
        { status: 500 }
      );
    }

    console.log(`[push/subscribe] Saved subscription for user ${user.id} in group ${groupId}`);
    return NextResponse.json({ success: true, groupId }, { status: 200 });
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

    // Delete by matching endpoint inside the JSONB field, scoped to this user
    const { error: deleteError } = await (supabase
      .from("push_subscriptions") as any)
      .delete()
      .eq("user_id", user.id)
      .filter("subscription->>endpoint", "eq", ep);

    if (deleteError) {
      console.error("[push/subscribe] Delete failed:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to remove subscription." },
        { status: 500 }
      );
    }

    console.log(`[push/subscribe] Removed subscription for user ${user.id}`);
    return NextResponse.json({ success: true }, { status: 200 });
  }

  return NextResponse.json(
    { error: `Unknown action: "${action}". Use "subscribe" or "unsubscribe".` },
    { status: 400 }
  );
}
