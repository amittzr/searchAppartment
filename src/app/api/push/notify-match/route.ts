// ============================================================
// POST /api/push/notify-match
// Called when all household members have reacted with "liked"
// to the same item — a "Match" has been detected.
//
// Unlike notify-new-item, this sends to ALL group members
// (including the person who completed the match) because it
// is a shared celebration moment for the entire group.
//
// Body:
//   { groupId: string, itemTitle: string, itemId: string }
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

  const { groupId, itemTitle, itemId } = body;

  if (!groupId || !itemTitle || !itemId) {
    return NextResponse.json(
      { error: "groupId, itemTitle, and itemId are required." },
      { status: 400 }
    );
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

  // ── Verify the item actually belongs to this group (prevent spoofing) ────
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

  // ── Send match notification to ALL group members (no exclusion) ──────────
  // A match is a shared milestone — everyone should celebrate together.
  const result = await sendPushToGroup(
    groupId,
    {
      title: "🎉 זה מאץ'!",
      body:  `שניכם אהבתם את "${itemTitle}"! הגיע הזמן להחליט 💕`,
      url:   `/`,
      tag:   `match-${itemId}`, // one match notification per item
    }
    // no excludeUserId — everyone receives this
  );

  console.log(
    `[notify-match] Group ${groupId}, item ${itemId}: sent=${result.sent} failed=${result.failed}`
  );

  return NextResponse.json(result, { status: 200 });
}
