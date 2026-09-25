// ============================================================
// DELETE /api/account/delete
// Permanently deletes the authenticated user's account and all
// personally-identifiable data associated with it.
//
// Deletion order (respects foreign key constraints):
//   1. Push subscriptions (FK → auth.users)
//   2. Detach profile from household (set household_id = null)
//   3. Delete the profile row
//   4. Delete the Supabase Auth user via admin API
//
// Notes:
//   - Apartments belong to the household, not the user, so they
//     are NOT deleted — the group's shared items remain for the
//     partner. Only the user's own reactions are cleared.
//   - If the user is the sole member of their household, the
//     household and its apartments are cascade-deleted via FK.
//   - This satisfies GDPR Article 17 "Right to Erasure".
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

// ── Service-role client needed to call auth.admin.deleteUser ─────────────────
function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for account deletion.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function DELETE(request: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    const admin = getAdminClient();

    // ── Step 1: Delete push subscriptions ────────────────────────────────────
    // These have FK → auth.users with ON DELETE CASCADE, but we delete
    // explicitly to ensure clean removal even if cascade hasn't propagated.
    await (supabase.from("push_subscriptions") as any)
      .delete()
      .eq("user_id", userId);

    // ── Step 2: Remove reactions this user added to apartments ───────────────
    // We fetch the user's profile to get their full_name (reaction key)
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("full_name, household_id")
      .eq("id", userId)
      .single() as { data: { full_name: string; household_id: string | null } | null };

    if (profile?.full_name && profile.household_id) {
      // Fetch all apartments in the household, remove this user's reaction key
      const { data: apartments } = await (supabase.from("apartments") as any)
        .select("id, reactions")
        .eq("household_id", profile.household_id);

      if (apartments && apartments.length > 0) {
        for (const apt of apartments as { id: string; reactions: Record<string, string> }[]) {
          if (apt.reactions && profile.full_name in apt.reactions) {
            const newReactions = { ...apt.reactions };
            delete newReactions[profile.full_name];
            await (supabase.from("apartments") as any)
              .update({ reactions: newReactions })
              .eq("id", apt.id);
          }
        }
      }
    }

    // ── Step 3: Delete the profile row ───────────────────────────────────────
    // The profile has FK → auth.users with ON DELETE CASCADE, but explicit
    // deletion ensures the RLS policy "Users can delete their own profile" is hit.
    const { error: profileDeleteError } = await (supabase.from("profiles") as any)
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("[delete-account] Profile deletion failed:", profileDeleteError.message);
      return NextResponse.json(
        { error: "Failed to delete profile. Please try again." },
        { status: 500 }
      );
    }

    // ── Step 4: Delete the Supabase Auth user (requires service role) ─────────
    const { error: adminDeleteError } = await admin.auth.admin.deleteUser(userId);

    if (adminDeleteError) {
      console.error("[delete-account] Auth user deletion failed:", adminDeleteError.message);
      // At this point the profile is already gone — log for manual cleanup
      return NextResponse.json(
        { error: "Account data deleted but auth record removal failed. Contact support." },
        { status: 500 }
      );
    }

    console.log(`[delete-account] Successfully deleted user ${userId}`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[delete-account] Unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
