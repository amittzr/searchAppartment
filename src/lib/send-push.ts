// ============================================================
// Server-side Web Push helper
// Used by API routes to broadcast push notifications to group members.
//
// Strategy:
//  1. Fetch push_subscriptions WHERE group_id = target AND user_id != sender
//     (both filters applied at the database level, not in JavaScript)
//  2. Send push payload to each subscriber via web-push
//  3. On 410 Gone — subscription has expired, delete it from DB
//  4. Collect and return per-subscription results
// ============================================================

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// ── VAPID configuration (set once, used for all sends) ────────────────────────
const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT ?? "mailto:admin@justpick.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── Supabase service-role client (bypasses RLS for server-side reads/deletes) ─
function getServiceClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      "[send-push] SUPABASE_SERVICE_ROLE_KEY is required but not set. " +
      "Push notifications will not work without it."
    );
  }

  return createClient(url, serviceKey);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  icon?: string;
  tag?:  string; // deduplication key — same-tag notifications replace each other
}

interface SubscriptionRow {
  id:           string;
  user_id:      string;
  subscription: webpush.PushSubscription;
}

export interface SendPushResult {
  sent:          number;
  failed:        number;
  subscriberCount: number; // total subscribers targeted (before send)
  errors:        string[];
}

// ── Core broadcast function ───────────────────────────────────────────────────

/**
 * Sends a push notification to all subscribers in a specific group,
 * excluding the sender.
 *
 * Both the group filter AND the sender exclusion are applied at the
 * database query level — not in JavaScript — to guarantee no cross-group
 * leakage even if something unexpected happens in application code.
 *
 * @param groupId       - The household/group UUID to broadcast to
 * @param payload       - The notification content (title, body, url, icon)
 * @param excludeUserId - The user_id of the sender (excluded at DB level)
 */
export async function sendPushToGroup(
  groupId:        string,
  payload:        PushPayload,
  excludeUserId?: string
): Promise<SendPushResult> {
  const result: SendPushResult = { sent: 0, failed: 0, subscriberCount: 0, errors: [] };

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[send-push] VAPID keys not configured — skipping push");
    return result;
  }

  let supabase: ReturnType<typeof getServiceClient>;
  try {
    supabase = getServiceClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-push]", msg);
    result.errors.push(msg);
    return result;
  }

  // ── Build query: filter by group AND exclude sender at the database level ─
  // IMPORTANT: We apply BOTH filters in the SQL query, not in JavaScript.
  // This is the core isolation guarantee — only subscriptions belonging to
  // the target group_id are ever fetched. No other group's data touches
  // this function's memory.
  let query = supabase
    .from("push_subscriptions")
    .select("id, user_id, subscription")
    .eq("group_id", groupId); // ← strict group isolation

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId); // ← sender exclusion at DB level
  }

  const { data: rows, error: fetchError } = await query;

  // ── Debug logging — shows exactly who is being targeted ──────────────────
  console.log(`[send-push] Target group_id: ${groupId}`);
  console.log(`[send-push] Excluded user_id: ${excludeUserId ?? "none"}`);
  console.log(`[send-push] Subscribers fetched for this group: ${rows?.length ?? 0}`);

  if (fetchError) {
    console.error("[send-push] Failed to fetch subscriptions:", fetchError.message);
    result.errors.push(fetchError.message);
    return result;
  }

  if (!rows || rows.length === 0) {
    console.log(`[send-push] No subscribers found for group ${groupId} — nothing to send`);
    return result;
  }

  result.subscriberCount = rows.length;

  // ── Serialize payload ─────────────────────────────────────────────────────
  const serialized = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url  ?? "/",
    icon:  payload.icon ?? "/icons/icon-192x192.png",
    tag:   payload.tag  ?? "justpick",
  });

  // ── Send to each subscriber in parallel ──────────────────────────────────
  const sends = (rows as SubscriptionRow[]).map(async (row) => {
    console.log(`[send-push] Sending to user_id: ${row.user_id} (subscription id: ${row.id})`);
    try {
      await webpush.sendNotification(row.subscription, serialized);
      result.sent++;
    } catch (err: any) {
      // 410 Gone = subscription is expired/revoked — clean it up
      if (err.statusCode === 410) {
        console.log(`[send-push] Subscription ${row.id} expired (410) — deleting`);
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", row.id);
      } else {
        const msg = err.message ?? String(err);
        console.warn(`[send-push] Failed for subscription ${row.id} (user ${row.user_id}): ${msg}`);
        result.failed++;
        result.errors.push(msg);
      }
    }
  });

  await Promise.allSettled(sends);

  console.log(`[send-push] Done — sent: ${result.sent}, failed: ${result.failed}`);
  return result;
}
