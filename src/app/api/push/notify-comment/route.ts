// ============================================================
// POST /api/push/notify-comment
// Called when a user adds a note/comment to an item.
// Sends to all other group members, excluding the sender.
//
// Body:
//   {
//     groupId:       string,   // the household UUID
//     itemId:        string,   // the apartment UUID
//     itemTitle:     string,   // address/title of the item
//     commentText:   string,   // the note text (will be truncated)
//     senderName:    string,   // display name of the commenter
//     senderUserId:  string    // excluded from recipients
//   }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendPushToGroup } from "@/lib/send-push";

// Maximum characters of comment text shown in the push body
const MAX_PREVIEW_LENGTH = 80;

/** Truncates a string to a max length, adding ellipsis if needed. */
function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "…";
}

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

  const { groupId, itemId, itemTitle, commentText, senderName, senderUserId } = body;

  if (!groupId || !itemId || !itemTitle || !commentText || !senderName) {
    return NextResponse.json(
      { error: "groupId, itemId, itemTitle, commentText, and senderName are required." },
      { status: 400 }
    );
  }

  // ── Authorization: sender must be the authenticated user ─────────────────
  if (senderUserId && senderUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Authorization: confirm groupId matches the caller's actual household ──
  const { data: profile } = await (supabase
    .from("profiles") as any)
    .select("household_id")
    .eq("id", user.id)
    .single() as { data: { household_id: string | null } | null };

  if (!profile?.household_id || profile.household_id !== groupId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Verify the item belongs to this group (prevent spoofing) ─────────────
  const { data: item, error: itemError } = await (supabase
    .from("apartments") as any)
    .select("id, household_id")
    .eq("id", itemId)
    .eq("household_id", groupId)
    .single() as { data: { id: string; household_id: string } | null; error: any };

  if (itemError || !item) {
    return NextResponse.json(
      { error: "Item not found in this group." },
      { status: 404 }
    );
  }

  // ── Build payload ─────────────────────────────────────────────────────────
  const preview = truncate(commentText.trim(), MAX_PREVIEW_LENGTH);

  const result = await sendPushToGroup(
    groupId,
    {
      title: `💬 הערה מ-${senderName}`,
      body:  `"${preview}" על ${itemTitle}`,
      url:   `/`,
      tag:   `comment-${itemId}`, // one comment notification per item at a time
    },
    senderUserId ?? user.id // exclude the sender
  );

  console.log(
    `[notify-comment] Group ${groupId}, item ${itemId}: sent=${result.sent} failed=${result.failed}`
  );

  return NextResponse.json(result, { status: 200 });
}
