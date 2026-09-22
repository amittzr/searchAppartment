// ============================================================
// Server-side Web Push helper
// Used by API routes to broadcast push notifications to group members.
//
// Strategy:
//  1. Fetch all push_subscriptions for the given group_id
//  2. Filter out the sender (by user_id) if provided
//  3. Send push payload to each subscriber via web-push
//  4. On 410 Gone — subscription has expired, delete it from DB
//  5. Collect and return per-subscription results
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Use SUPABASE_SERVICE_ROLE_KEY if available; fall back to anon key for dev
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
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
  sent:   number;
  failed: number;
  errors: string[];
}

// ── Core broadcast function ───────────────────────────────────────────────────

/**
 * Sends a push notification to all subscribers in a group,
 * optionally excluding the sender.
 *
 * @param groupId      - The household/group UUID to broadcast to
 * @param payload      - The notification content (title, body, url, icon)
 * @param excludeUserId - The user_id of the sender (will not receive the push)
 */
export async function sendPushToGroup(
  groupId:       string,
  payload:       PushPayload,
  excludeUserId?: string
): Promise<SendPushResult> {
  const supabase = getServiceClient();
  const result: SendPushResult = { sent: 0, failed: 0, errors: [] };

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[send-push] VAPID keys not configured — skipping push");
    return result;
  }

  // ── Fetch all subscriptions for this group ────────────────────────────────
  const { data: rows, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, subscription")
    .eq("group_id", groupId);

  if (fetchError) {
    console.error("[send-push] Failed to fetch subscriptions:", fetchError.message);
    return result;
  }

  if (!rows || rows.length === 0) return result;

  // ── Filter out the sender ─────────────────────────────────────────────────
  const targets: SubscriptionRow[] = excludeUserId
    ? rows.filter((r: SubscriptionRow) => r.user_id !== excludeUserId)
    : rows;

  if (targets.length === 0) return result;

  // ── Serialize payload ─────────────────────────────────────────────────────
  const serialized = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url  ?? "/",
    icon:  payload.icon ?? "/icons/icon-192x192.png",
    tag:   payload.tag  ?? "justpick",
  });

  // ── Send to each subscriber in parallel ──────────────────────────────────
  const sends = targets.map(async (row: SubscriptionRow) => {
    try {
      await webpush.sendNotification(row.subscription, serialized);
      result.sent++;
    } catch (err: any) {
      // 410 Gone = subscription is expired/revoked — remove from DB
      if (err.statusCode === 410) {
        console.log(`[send-push] Subscription ${row.id} expired (410) — deleting`);
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", row.id);
      } else {
        const msg = err.message ?? String(err);
        console.warn(`[send-push] Failed to send to subscription ${row.id}: ${msg}`);
        result.failed++;
        result.errors.push(msg);
      }
    }
  });

  await Promise.allSettled(sends);
  return result;
}
