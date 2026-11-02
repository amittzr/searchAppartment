"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MessageCircle, AlertCircle } from "lucide-react";
import type { Apartment, NotesThread } from "@/types/database";
import { useHousehold } from "@/contexts/HouseholdContext";
import NotesThreadComponent from "./NotesThread";

// ============================================================
// CommentsModal
// A dedicated, chat-first comments window for a single item.
//
// Opened directly from the card (below the phone number) so adding
// a comment no longer requires opening the full edit form.
//
// Layout mirrors ChecklistModal:
//   - Mobile: bottom sheet, height = 90dvh
//   - Desktop: centered, height = 85vh, max-width = md
//   - header (flex-shrink-0) | body (flex-1 min-h-0 scroll) | footer (compose)
// ============================================================

interface CommentsModalProps {
  apartment: Apartment;
  isOpen:    boolean;
  onClose:   () => void;
  /** Persists a new comment. Returns an error string on failure. */
  onSend:    (id: string, text: string) => Promise<{ error: string | null }>;
}

export default function CommentsModal({
  apartment,
  isOpen,
  onClose,
  onSend,
}: CommentsModalProps) {
  const { profile } = useHousehold();

  const [newNote, setNewNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const thread: NotesThread = Array.isArray(apartment.notes) ? apartment.notes : [];

  // Reset compose box whenever the modal opens or switches items
  useEffect(() => {
    if (!isOpen) return;
    setNewNote("");
    setSendError(null);
  }, [isOpen, apartment.id]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const text = newNote.trim();
    if (!text || sending) return;

    setSending(true);
    setSendError(null);

    // Clear input optimistically — restore it if the send fails
    setNewNote("");

    const { error } = await onSend(apartment.id, text);

    if (error) {
      setSendError(error);
      setNewNote(text); // restore so the user doesn't lose their message
    }

    setSending(false);
  }, [newNote, sending, onSend, apartment.id]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="
        relative w-full sm:max-w-md bg-white dark:bg-slate-800
        rounded-t-3xl sm:rounded-2xl shadow-2xl
        flex flex-col
        h-[90dvh] sm:h-[85vh]
      ">
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 id="comments-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Comments 💬
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {apartment.title.length > 40
                    ? apartment.title.slice(0, 40) + "…"
                    : apartment.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close comments"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── BODY (scrollable thread) ────────────────────────────────────── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="px-5 py-4 flex flex-col gap-3">
            {thread.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-slate-400 dark:text-slate-500">
                <MessageCircle className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No comments yet</p>
                <p className="text-xs mt-1">Start the conversation below.</p>
              </div>
            ) : (
              thread.map((note, idx) => (
                <div
                  key={`${note.userId}-${note.createdAt}-${idx}`}
                  className={`flex flex-col gap-0.5 ${note.userId === (profile?.id ?? "") ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {note.userId === (profile?.id ?? "") ? "You" : note.userName}
                    </span>
                  </div>
                  <div
                    className={`
                      max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
                      ${note.userId === (profile?.id ?? "")
                        ? "bg-brand-600 text-white rounded-br-sm"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm"
                      }
                    `}
                  >
                    {note.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── FOOTER (compose) ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
          {sendError && (
            <div className="flex items-center gap-2 mb-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Couldn&apos;t send: {sendError}</span>
            </div>
          )}

          <NotesThreadComponent
            thread={[]}
            newNote={newNote}
            onNewNote={setNewNote}
            onSend={handleSend}
            currentUserId={profile?.id ?? ""}
            disabled={sending}
            composeOnly
          />
        </div>
      </div>
    </div>
  );
}
