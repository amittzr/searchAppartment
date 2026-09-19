"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ListChecks,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Apartment, ChecklistData } from "@/types/database";
import { getSupabaseClient } from "@/lib/supabase-client";

// ============================================================
// ChecklistModal
// Physical inspection checklist for a single apartment/item.
//
// Layout strategy (fixes scroll bug):
//   - Outer panel: fixed height h-[85vh] on desktop, h-[90dvh] on mobile
//   - Three zones: header (flex-shrink-0) | body (flex-1 min-h-0 overflow-y-auto) | footer (flex-shrink-0)
//   - Category cards use NO overflow-hidden so items are never clipped
// ============================================================

// ── Default checklist template (Hebrew labels) ────────────────────────────────

const DEFAULT_CHECKLIST: ChecklistData = [
  {
    category: "שאלות לדיירים / בעל הבית 🗣️",
    items: [
      { id: "q1", text: "מי גר פה לפני ולמה עזבו?",                              checked: false },
      { id: "q2", text: "האם יש רעש חריג או שכנים שמרעישים?",                    checked: false },
      { id: "q3", text: "איזה ספק אינטרנט תופס הכי טוב בשכונה?",                 checked: false },
      { id: "q4", text: "האם שכר הדירה כולל חשבונות כלשהם?",                     checked: false },
      { id: "q5", text: "מצב חניה באזור (האם יש בעיית חניה ביומיום)?",           checked: false },
    ],
  },
  {
    category: "בדיקות פיזיות בלייב בשטח 🛠️",
    items: [
      { id: "p1", text: "זרם מים (לפתוח ברזים במקלחת ובכיורים).",                checked: false },
      { id: "p2", text: "קליטה סלולרית ברחבי הדירה.",                             checked: false },
      { id: "p3", text: "מזגנים (להדליק ולבדוק קירור/חימום ורעש).",               checked: false },
      { id: "p4", text: "חלונות ודלתות (אטימות לרעשים וסגירה תקינה).",           checked: false },
      { id: "p5", text: "בדיקת תשתיות (שקעים, חיבור למכונת כביסה וגז).",         checked: false },
      { id: "p6", text: "דוד חימום (תקין ונגיש).",                                checked: false },
      { id: "p7", text: 'ביטחון (בדיקת ממ"ד או מקלט קרוב).',                     checked: false },
    ],
  },
  {
    category: "ריהוט וציוד (מה באמת נשאר?) 🛋️",
    items: [
      { id: "f1", text: "ריהוט כבד (ספה, מיטה, שולחן לימודים).",                 checked: false },
      { id: "f2", text: "מוצרי חשמל (מקרר, מיקרוגל, תנור).",                     checked: false },
      { id: "f3", text: "כלל ברזל: כל דבר שלא רשום - לשאול!",                    checked: false },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cloneChecklist(data: ChecklistData): ChecklistData {
  return data.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({ ...item })),
  }));
}

function calcProgress(data: ChecklistData) {
  let checked = 0;
  let total   = 0;
  for (const cat of data) {
    for (const item of cat.items) {
      total++;
      if (item.checked) checked++;
    }
  }
  return { checked, total, pct: total === 0 ? 0 : Math.round((checked / total) * 100) };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChecklistModalProps {
  apartment: Apartment;
  isOpen:    boolean;
  onClose:   () => void;
  onSaved:   (id: string, data: ChecklistData) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChecklistModal({
  apartment,
  isOpen,
  onClose,
  onSaved,
}: ChecklistModalProps) {
  const [checklist, setChecklist] = useState<ChecklistData>(() =>
    apartment.checklist_data
      ? cloneChecklist(apartment.checklist_data)
      : cloneChecklist(DEFAULT_CHECKLIST)
  );
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialize whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setChecklist(
      apartment.checklist_data
        ? cloneChecklist(apartment.checklist_data)
        : cloneChecklist(DEFAULT_CHECKLIST)
    );
    setSaveError(null);
    setCollapsed(new Set()); // expand all categories on open
  }, [isOpen, apartment.checklist_data, apartment.id]);

  // Escape key to close
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

  // ── Save ────────────────────────────────────────────────────────────────────
  const saveToDatabase = useCallback(async (data: ChecklistData) => {
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await (supabase.from("apartments") as any)
        .update({ checklist_data: data })
        .eq("id", apartment.id);
      if (error) throw new Error(error.message);
      onSaved(apartment.id, data);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [apartment.id, onSaved]);

  // ── Toggle item — optimistic + debounced save ────────────────────────────────
  const toggleItem = useCallback((catIdx: number, itemIdx: number) => {
    setChecklist((prev) => {
      const next = cloneChecklist(prev);
      next[catIdx].items[itemIdx].checked = !next[catIdx].items[itemIdx].checked;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveToDatabase(next), 600);
      return next;
    });
  }, [saveToDatabase]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const fresh = cloneChecklist(DEFAULT_CHECKLIST);
    setChecklist(fresh);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveToDatabase(fresh);
  }, [saveToDatabase]);

  const toggleCollapse = (idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  if (!isOpen) return null;

  const { checked, total, pct } = calcProgress(checklist);
  const allDone = checked === total && total > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checklist-title"
      dir="rtl"
    >
      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Panel ────────────────────────────────────────────────────────────────
           KEY LAYOUT RULE:
           - On mobile: sits at bottom, height = 90dvh
           - On desktop: centered, height = 85vh, max-width = md
           - Uses flex-col so header + footer are fixed and body scrolls
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="
        relative w-full sm:max-w-md bg-white
        rounded-t-3xl sm:rounded-2xl shadow-2xl
        flex flex-col
        h-[90dvh] sm:h-[85vh]
      ">

        {/* ── HEADER (fixed, never scrolls) ────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <ListChecks className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 id="checklist-title" className="text-base font-bold text-slate-900">
                  בדיקה בשטח 📋
                </h2>
                <p className="text-xs text-slate-400 mt-0.5" dir="ltr">
                  {apartment.title.length > 40
                    ? apartment.title.slice(0, 40) + "…"
                    : apartment.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close checklist"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress section */}
          <div className="mt-4">
            {allDone ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                הבדיקה הושלמה! ✅
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500 font-medium">
                    {checked} מתוך {total} פריטים
                  </span>
                  <div className="flex items-center gap-2">
                    {saving && (
                      <span className="flex items-center gap-1 text-xs text-violet-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        שומר...
                      </span>
                    )}
                    <span className="text-xs font-bold text-violet-600">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            )}

            {saveError && (
              <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>שמירה נכשלה: {saveError}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── BODY (scrollable — the only scrolling zone) ───────────────────────
             CRITICAL: flex-1 + min-h-0 + overflow-y-auto is the correct trio.
             Without min-h-0, flex-1 doesn't constrain height in a flex column
             and overflow never activates, causing content to overflow visually.
        ─────────────────────────────────────────────────────────────────────── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="px-5 py-4 flex flex-col gap-3">
            {checklist.map((cat, catIdx) => {
              const catChecked  = cat.items.filter((i) => i.checked).length;
              const catTotal    = cat.items.length;
              const isCollapsed = collapsed.has(catIdx);

              return (
                // No overflow-hidden here — it would clip item content
                <div key={catIdx} className="rounded-2xl border border-slate-200">

                  {/* Category header button */}
                  <button
                    type="button"
                    onClick={() => toggleCollapse(catIdx)}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-violet-50 hover:bg-violet-100 rounded-2xl transition-colors"
                    style={{ borderRadius: isCollapsed ? "1rem" : "1rem 1rem 0 0" }}
                  >
                    <span className="text-sm font-bold text-violet-800 text-right leading-snug">
                      {cat.category}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                      <span className={`
                        text-xs font-semibold px-2 py-0.5 rounded-full
                        ${catChecked === catTotal
                          ? "bg-green-100 text-green-700"
                          : "bg-violet-200 text-violet-700"
                        }
                      `}>
                        {catChecked}/{catTotal}
                      </span>
                      {isCollapsed
                        ? <ChevronDown className="w-4 h-4 text-violet-500" />
                        : <ChevronUp   className="w-4 h-4 text-violet-500" />
                      }
                    </div>
                  </button>

                  {/* Items list — no max-h, no overflow, just natural height */}
                  {!isCollapsed && (
                    <div className="border-t border-slate-100">
                      {cat.items.map((item, itemIdx) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItem(catIdx, itemIdx)}
                          // min-h-[52px] ensures 44px+ touch target on mobile
                          className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[52px] hover:bg-slate-50 active:bg-slate-100 transition-colors text-right border-b border-slate-100 last:border-b-0 last:rounded-b-2xl"
                          aria-pressed={item.checked}
                        >
                          {/* Custom checkbox */}
                          <div className={`
                            w-6 h-6 rounded-lg border-2 flex-shrink-0
                            flex items-center justify-center transition-all duration-150
                            ${item.checked
                              ? "bg-violet-600 border-violet-600"
                              : "bg-white border-slate-300"
                            }
                          `}>
                            {item.checked && (
                              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                <path
                                  d="M1 5L4.5 8.5L11 1"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>

                          <span className={`
                            text-sm leading-relaxed flex-1 text-right
                            ${item.checked ? "line-through text-slate-400" : "text-slate-700"}
                          `}>
                            {item.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Bottom padding so last item isn't flush against the footer */}
            <div className="h-2" />
          </div>
        </div>

        {/* ── FOOTER (fixed, never scrolls) ────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1 px-2 rounded-lg hover:bg-slate-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            איפוס רשימה
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:scale-95 transition-all"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
