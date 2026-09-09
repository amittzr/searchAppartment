"use client";

import { useRef, useEffect } from "react";
import { Send, StickyNote } from "lucide-react";
import type { NoteEntry, NotesThread as NotesThreadType } from "@/types/database";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    const now  = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1)  return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

// ── Sub-component: single note bubble ────────────────────────────────────────

interface NoteBubbleProps {
  note:     NoteEntry;
  isMine:   boolean;
}

function NoteBubble({ note, isMine }: NoteBubbleProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
      {/* Author + timestamp */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-xs font-semibold text-slate-500">
          {isMine ? "You" : note.userName}
        </span>
        <span className="text-xs text-slate-400">{formatTimestamp(note.createdAt)}</span>
      </div>

      {/* Bubble */}
      <div
        className={`
          max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
          ${isMine
            ? "bg-brand-600 text-white rounded-br-sm"
            : "bg-slate-100 text-slate-800 rounded-bl-sm"
          }
        `}
      >
        {note.text}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface NotesThreadProps {
  thread:       NotesThreadType;
  newNote:      string;
  onNewNote:    (value: string) => void;
  onSend:       () => void;
  currentUserId: string;
  disabled?:    boolean;
  compact?:     boolean; // compact = card view (read-only, truncated)
}

export default function NotesThreadComponent({
  thread,
  newNote,
  onNewNote,
  onSend,
  currentUserId,
  disabled,
  compact,
}: NotesThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new notes arrive
  useEffect(() => {
    if (!compact) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread, compact]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (newNote.trim()) onSend();
    }
  };

  // ── Compact (read-only) view for the card ──────────────────────────────────
  if (compact) {
    if (!thread || thread.length === 0) return null;
    const last = thread[thread.length - 1];
    return (
      <div className="flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-2">
        <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" strokeWidth={2} />
        <p className="line-clamp-2 leading-relaxed">
          <span className="font-semibold text-slate-600">
            {last.userId === currentUserId ? "You" : last.userName}:
          </span>{" "}
          {last.text}
          {thread.length > 1 && (
            <span className="text-slate-400 ml-1">+{thread.length - 1} more</span>
          )}
        </p>
      </div>
    );
  }

  // ── Full (interactive) view for the expanded modal ─────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">
        <StickyNote className="w-3.5 h-3.5" />
        Notes
        {thread.length > 0 && (
          <span className="ml-auto font-normal text-slate-400 normal-case">
            {thread.length} {thread.length === 1 ? "note" : "notes"}
          </span>
        )}
      </div>

      {/* Thread scroll area */}
      <div className="flex flex-col gap-3 max-h-48 overflow-y-auto px-1 py-2 bg-amber-50 rounded-xl border border-amber-100">
        {thread.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">
            No notes yet — add the first one!
          </p>
        ) : (
          thread.map((note, idx) => (
            <NoteBubble
              key={`${note.userId}-${note.createdAt}-${idx}`}
              note={note}
              isMine={note.userId === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="flex items-end gap-2">
        <textarea
          value={newNote}
          onChange={(e) => onNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note… (Ctrl+Enter to send)"
          rows={2}
          disabled={disabled}
          className="
            flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900
            placeholder:text-slate-400 bg-white resize-none
            focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
            disabled:opacity-50
          "
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!newNote.trim() || disabled}
          aria-label="Send note"
          className="
            flex items-center justify-center w-10 h-10 rounded-xl
            bg-brand-600 text-white hover:bg-brand-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors active:scale-95
          "
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
