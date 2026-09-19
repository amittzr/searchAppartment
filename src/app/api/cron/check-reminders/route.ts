// ============================================================
// GET /api/cron/check-reminders
// Triggered daily by Vercel Cron (or any HTTP scheduler).
//
// Logic:
//   1. Find items that are older than 48h with no reactions
//      and no reminder sent in the last 48h.
//   2. Send push notifications to all group members.
//   3. Update last_reminder_sent_at on each item.
//
// Security: requires Authorization: Bearer <CRON_SECRET> header.
//
// Vercel cron.json configuration:
//   { "crons": [{ "path": "/api/cron/check-reminders", "schedule": "0 9 * * *" }] }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToGroup } from "@/lib/send-push";

// ── Service-role Supabase client (bypasses RLS) ───────────────────────────────
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  // ── Auth guard: verify CRON_SECRET ────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token      = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase      = getServiceClient();
  const now           = new Date();
  const cutoff48h     = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const reminderCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  console.log(`[cron/check-reminders] Running at ${now.toISOString()}`);

  // ── Find stale items: older than 48h, no reactions, no recent reminder ────
  // "No reactions" = reactions JSONB is empty object {}
  const { data: staleItems, error: fetchError } = await (supabase
    .from("apartments") as any)
    .select("id, title, household_id, reactions, created_at, last_reminder_sent_at")
    .lt("created_at", cutoff48h)
    .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${reminderCutoff}`);

  if (fetchError) {
    console.error("[cron/check-reminders] Fetch error:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!staleItems || staleItems.length === 0) {
    console.log("[cron/check-reminders] No stale items found.");
    return NextResponse.json({ processed: 0 });
  }

  // ── Filter to only truly unreacted items ──────────────────────────────────
  const unreacted = staleItems.filter((item: any) => {
    const reactions = item.reactions ?? {};
    return Object.keys(reactions).length === 0;
  });

  console.log(
    `[cron/check-reminders] Found ${staleItems.length} stale items, ` +
    `${unreacted.length} with no reactions.`
  );

  let processed = 0;
  const errors: string[] = [];

  for (const item of unreacted) {
    try {
      // Build notification payload (Hebrew + English)
      const title = "⏳ פריט ממתין להחלטה";
      const body  = `הדירה "${item.title}" מחכה כבר יומיים בלי עדכון. כנסו להחליט!`;
      const url   = `/?item=${item.id}`;

      // Broadcast to all members of this group (no sender exclusion for reminders)
      const sendResult = await sendPushToGroup(
        item.household_id,
        { title, body, url, tag: `reminder-${item.id}` }
      );

      console.log(
        `[cron/check-reminders] Item ${item.id}: sent=${sendResult.sent} failed=${sendResult.failed}`
      );

      // Mark reminder as sent regardless of whether all pushes succeeded
      await (supabase.from("apartments") as any)
        .update({ last_reminder_sent_at: now.toISOString() })
        .eq("id", item.id);

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/check-reminders] Error processing item ${item.id}:`, msg);
      errors.push(msg);
    }
  }

  return NextResponse.json({ processed, errors }, { status: 200 });
}
