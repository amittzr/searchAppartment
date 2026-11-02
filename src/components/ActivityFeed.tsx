"use client";

import { X, Activity, RefreshCw } from "lucide-react";
import type { ActivityLogEntry, ActivityEventType } from "@/types/database";

// ============================================================
// ActivityFeed
// Slide-in drawer showing the household's recent activity.
// Rendered inside the main dashboard when isOpen=true.
// ============================================================

interface ActivityFeedProps {
  entries: ActivityLogEntry[];
  loading: boolean;
  isOpen:  boolean;
  onClose: () => void;
  onRefetch: () => void;
  /** Called when a row pointing at a still-existing item is clicked. */
  onEntryClick?: (itemId: string) => void;
  /** Returns true if the item referenced by the entry still exists. */
  isItemAvailable?: (itemId: string) => boolean;
}

// ── Event display config ──────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  ActivityEventType,
  { icon: string; label: (e: ActivityLogEntry) => string }
> = {
  item_added: {
    icon:  "➕",
    label: (e) => `added "${e.item_title ?? "an item"}"`,
  },
  item_deleted: {
    icon:  "🗑️",
    label: (e) => `removed "${e.item_title ?? "an item"}"`,
  },
  reaction_set: {
    icon:  "👆",
    label: (e) => {
      const reaction = (e.metadata as any)?.reaction as string | undefined;
      const emoji    = reaction === "liked" ? "❤️" : reaction === "review" ? "🤔" : "❌";
      return `reacted ${emoji} to "${e.item_title ?? "an item"}"`;
    },
  },
  match: {
    icon:  "💕",
    label: (e) => `It's a match on "${e.item_title ?? "an item"}"! 🎉`,
  },
  note_added: {
    icon:  "💬",
    label: (e) => {
      const text = (e.metadata as any)?.preview as string | undefined;
      return text
        ? `commented on "${e.item_title ?? "an item"}": "${text}"`
        : `added a note on "${e.item_title ?? "an item"}"`;
    },
  },
  member_joined: {
    icon:  "👋",
    label: (e) => `joined the household`,
  },
};

// ── Relative time formatter ───────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days  = Math.floor(hours / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityFeed({
  entries,
  loading,
  isOpen,
  onClose,
  onRefetch,
  onEntryClick,
  isItemAvailable,
}: ActivityFeedProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — slides in from the right */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in-right"
        role="complementary"
        aria-label="Recent activity"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Activity</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefetch}
              aria-label="Refresh activity"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:hover:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close activity feed"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:hover:text-slate-200 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            // Shimmer skeleton
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                <Activity className="w-7 h-7 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No activity yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px]">
                Actions like adding items and reacting will appear here.
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-0" aria-label="Activity timeline">
              {entries.map((entry) => {
                const config = EVENT_CONFIG[entry.event_type] ?? {
                  icon:  "•",
                  label: () => entry.event_type,
                };
                const isMatch = entry.event_type === "match";

                // A row is clickable when it points at an item that still exists.
                const canJump =
                  !!entry.item_id &&
                  !!onEntryClick &&
                  (isItemAvailable ? isItemAvailable(entry.item_id) : true);

                const rowInner = (
                  <>
                    {/* Event icon bubble */}
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        text-sm flex-shrink-0
                        ${isMatch
                          ? "bg-green-100 dark:bg-green-900/40"
                          : "bg-violet-50 dark:bg-violet-900/30"
                        }
                      `}
                    >
                      {config.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {entry.user_name}
                        </span>
                        {" "}
                        {config.label(entry)}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {relativeTime(entry.created_at)}
                      </p>
                    </div>
                  </>
                );

                return (
                  <li
                    key={entry.id}
                    className="border-b border-slate-50 dark:border-slate-800/60 last:border-0"
                  >
                    {canJump ? (
                      <button
                        type="button"
                        onClick={() => onEntryClick!(entry.item_id!)}
                        className="w-full flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                        aria-label={`Go to ${entry.item_title ?? "item"}`}
                      >
                        {rowInner}
                      </button>
                    ) : (
                      <div className="flex items-start gap-3 py-3">
                        {rowInner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <p className="text-xs text-center text-slate-400 dark:text-slate-500">
            Showing last {entries.length} events · History kept for 30 days
          </p>
        </div>
      </aside>
    </>
  );
}
