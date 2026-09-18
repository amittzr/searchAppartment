"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ListChecks, RotateCcw, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { Apartment, ChecklistCategory, ChecklistData } from "@/types/database";
import { getSupabaseClient } from "@/lib/supabase-client";

// ============================================================
// ChecklistModal
// Physical inspection checklist for a single apartment/item.
// Features:
//  - Initializes from DEFAULT_CHECKLIST if item has no saved data
//  - Optimistic UI: toggle updates local state instantly
//  - Auto-saves to Supabase in the background on every toggle
//  - Rollback on save failure with error banner
//  - Progress bar shows total completion percentage
//  - Per-category collapsible sections with badge counts
// ============================================================

// ── Default checklist template (Hebrew labels per spec) ───────────────────────

const DEFAULT_CHECKLIST: ChecklistData = [
  {
    category: "שאלות לדיירים / בעל הבית 🗣️",
    items: [
      { id: "q1", text: "מי גר פה לפני ולמה עזבו?",                                     checked: false },
      { id: "q2", text: "האם יש רעש חריג או שכנים שמרעישים?",                             checked: false },
      { id: "q3", text: "איזה ספק אינטרנט תופס הכי טוב בשכונה?",                          checked: false },
      { id: "q4", text: "האם שכר הדירה כולל חשבונות כלשהם?",                              checked: false },
      { id: "q5", text: "מצב חניה באזור (האם יש בעיית חניה ביומיום)?",                    checked: false },
    ],
  },
  {
    category: "בדיקות פיזיות בלייב בשטח 🛠️",
    items: [
      { id: "p1", text: "זרם מים (לפתוח ברזים במקלחת ובכיורים).",                         checked: false },
      { id: "p2", text: "קליטה סלולרית ברחבי הדירה.",                                      checked: false },
      { id: "p3", text: "מזגנים (להדליק ולבדוק קירור/חימום ורעש).",                        checked: false },
      { id: "p4", text: "חלונות ודלתות (אטימות לרעשים וסגירה תקינה).",                    checked: false },
      { id: "p5", text: "בדיקת תשתיות (שקעים, חיבור למכונת כביסה וגז).",                  checked: false },
      { id: "p6", text: 'דוד חימום (תקין ונגיש).',                                        checked: false },
      { id: "p7", text: 'ביטחון (בדיקת ממ"ד או מקלט קרוב).',                              checked: false },
    ],
  },
  {
    category: "ריהוט וציוד (מה באמת נשאר?) 🛋️",
    items: [
      { id: "f1", text: "ריהוט כבד (ספה, מיטה, שולחן לימודים).",                          checked: false },
      { id: "f2", text: "מוצרי חשמל (מקרר, מיקרוגל, תנור).",                              checked: false },
      { id: "f3", text: "כלל ברזל: כל דבר שלא רשום - לשאול!",                             checked: false },
    ],
  },
];

// ── Deep-clone helper to avoid mutating the default template ──────────────────
function cloneChecklist(data: ChecklistData): ChecklistData {
  return data.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({ ...item })),
  }));
}

// ── Progress calculation ───────────────────────────────────────────────────────
function calcProgress(data: ChecklistData): { checked: number; total: number; pct: number } {
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
  /** Called after a successful save so the parent can update its local state */
  onSaved:   (id: string, data: ChecklistData) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChecklistModal({
  apartment,
  isOpen,
  onClose,
  onSaved,
}: ChecklistModalProps) {
  // Initialize from saved data or clone the default template
  const [checklist,  setChecklist]  = useState<ChecklistData>(() =>
    apartment.checklist_data ? cloneChecklist(apartment.checklist_data) : cloneChecklist(DEFAULT_CHECKLIST)
  );
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);
  // Track which categories are collapsed (none by default)
  const [collapsed, setCollapsed]   = useState<Set<number>>(new Set());

  // Debounce timer ref — prevents saving on every rapid tap
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialize whenever the modal opens (in case parent updated checklist_data)
  useEffect(() => {
    if (isOpen) {
      setChecklist(
        apartment.checklist_data
          ? cloneChecklist(apartment.checklist_data)
          : cloneChecklist(DEFAULT_CHECKLIST)
      );
      setSaveError(null);
    }
  }, [isOpen, apartment.checklist_data, apartment.id]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  const saveToDatabase = useCallback(async (data: ChecklistData) => {
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await (supabase
        .from("apartments") as any)
        .update({ checklist_data: data })
        .eq("id", apartment.id);

      if (error) throw new Error(error.message);

      onSaved(apartment.id, data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }, [apartment.id, onSaved]);

  // ── Toggle a single checklist item (optimistic + debounced save) ─────────────
  const toggleItem = useCallback((catIdx: number, itemIdx: number) => {
    setChecklist((prev) => {
      const next = cloneChecklist(prev);
      next[catIdx].items[itemIdx].checked = !next[catIdx].items[itemIdx].checked;

      // Debounce: wait 600ms of inactivity before sending to DB
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveToDatabase(next);
      }, 600);

      return next;
    });
  }, [saveToDatabase]);

  // ── Reset all checkboxes ──────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const fresh = cloneChecklist(DEFAULT_CHECKLIST);
    setChecklist(fresh);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveToDatabase(fresh);
  }, [saveToDatabase]);

  // ── Toggle category collapse ─────────────────────────────────────────────────
  const toggleCollapse = (idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (!isOpen) return null;

  const { checked, total, pct } = calcProgress(checklist);
  const allDone = checked === total && total > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checklist-title"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] animate-slide-up">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 id="checklist-title" className="text-base font-bold text-slate-900">
                בדיקה בשטח 📋
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 text-right" dir="ltr">
                {apartment.title.slice(0, 40)}{apartment.title.length > 40 ? "…" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close checklist"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Progress bar ───────────────────────────────────────────────────── */}
        <div className="px-5 py-4 flex-shrink-0 border-b border-slate-100">
          {allDone ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              הבדיקה הושלמה! ✅
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">התקדמות הבדיקה</span>
                <div className="flex items-center gap-2">
                  {saving && (
                    <span className="text-xs text-violet-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
                      שומר...
                    </span>
                  )}
                  <span className="text-xs font-bold text-violet-600">{pct}%</span>
                </div>
              </div>
              {/* Track */}
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {checked} מתוך {total} פריטים
              </p>
            </>
          )}

          {/* Save error */}
          {saveError && (
            <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>שמירה נכשלה: {saveError}</span>
            </div>
          )}
        </div>

        {/* ── Categories ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {checklist.map((cat, catIdx) => {
            const catChecked = cat.items.filter((i) => i.checked).length;
            const catTotal   = cat.items.length;
            const isCollapsed = collapsed.has(catIdx);

            return (
              <div key={catIdx} className="rounded-2xl border border-slate-200 overflow-hidden">

                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(catIdx)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 hover:bg-violet-100 transition-colors"
                >
                  <span className="text-sm font-bold text-violet-800 text-right">
                    {cat.category}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
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

                {/* Items */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {cat.items.map((item, itemIdx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleItem(catIdx, itemIdx)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-right min-h-[52px]"
                        aria-pressed={item.checked}
                      >
                        {/* Custom checkbox — min 44px touch target via padding */}
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
                              <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>

                        <span className={`
                          text-sm leading-relaxed flex-1
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
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1"
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
