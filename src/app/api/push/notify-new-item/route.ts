// ============================================================
// POST /api/push/notify-new-item
// Called by the client immediately after a new item is saved.
// Broadcasts a push notification to all other group members.
//
// Body:
//   { groupId: string, excludeUserId: string, title: string }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendPushToGroup } from "@/lib/send-push";

export async function POST(request: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { groupId, excludeUserId, title } = body;

  if (!groupId || !title) {
    return NextResponse.json(
      { error: "groupId and title are required." },
      { status: 400 }
    );
  }

  // Security: only allow the authenticated user to trigger pushes for their own group
  if (excludeUserId && excludeUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Send push to all other group members ─────────────────────────────────
  const result = await sendPushToGroup(
    groupId,
    {
      title: "✨ פריט חדש נוסף לקבוצה!",
      body:  title,
      url:   "/",
      tag:   `new-item-${groupId}`, // replaces the previous "new item" notification
    },
    excludeUserId ?? user.id
  );

  console.log(
    `[notify-new-item] Group ${groupId}: sent=${result.sent} failed=${result.failed}`
  );

  return NextResponse.json(result, { status: 200 });
}
