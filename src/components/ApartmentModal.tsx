"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  Link,
  MapPin,
  DollarSign,
  Phone,
  Image as ImageIcon,
  StickyNote,
  Wand2,
  CheckCircle2,
  User,
  BedDouble,
} from "lucide-react";
import type { Apartment, ApartmentFormData, ApartmentStatus } from "@/types/database";
import { useYad2AutoFill } from "@/hooks/useYad2AutoFill";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApartmentFormData) => Promise<void>;
  editingApartment: Apartment | null;
  initialData?: Partial<ApartmentFormData> | null;
  onInitialDataConsumed?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: ApartmentFormData = {
  url: "",
  title: "",
  price: "",
  rooms: "",
  phone: "",
  seller_name: "",
  image_url: "",
  images: [],
  notes: "",
  status: "all",
};

const STATUS_OPTIONS: { value: ApartmentStatus; label: string; emoji: string }[] = [
  { value: "all",      label: "Unsorted",     emoji: "🏠" },
  { value: "liked",    label: "Liked",        emoji: "❤️" },
  { value: "review",   label: "Review Later", emoji: "🤔" },
  { value: "rejected", label: "Rejected",     emoji: "❌" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApartmentModal({
  isOpen,
  onClose,
  onSubmit,
  editingApartment,
  initialData,
  onInitialDataConsumed,
}: ApartmentModalProps) {
  const [form, setForm]               = useState<ApartmentFormData>(EMPTY_FORM);
  const [errors, setErrors]           = useState<Partial<Record<keyof ApartmentFormData, string>>>({});
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-fill: iframe-first, server-side API fallback
  const autoFill = useYad2AutoFill();

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing; reset when adding; or use initialData from bookmarklet
  useEffect(() => {
    if (!isOpen) return; // Only run when modal is open
    
    if (editingApartment) {
      setForm({
        url:         editingApartment.url         ?? "",
        title:       editingApartment.title,
        price:       String(editingApartment.price),
        rooms:       editingApartment.rooms       ?? "",
        phone:       editingApartment.phone       ?? "",
        seller_name: editingApartment.seller_name ?? "",
        image_url:   editingApartment.image_url   ?? "",
        images:      editingApartment.images      ?? [],
        notes:       editingApartment.notes       ?? "",
        status:      editingApartment.status,
      });
    } else if (initialData && Object.keys(initialData).length > 0) {
      // Pre-fill from bookmarklet data
      setForm({
        ...EMPTY_FORM,
        url:         initialData.url         ?? "",
        title:       initialData.title       ?? "",
        price:       initialData.price       ?? "",
        rooms:       initialData.rooms       ?? "",
        phone:       initialData.phone       ?? "",
        seller_name: initialData.seller_name ?? "",
        image_url:   initialData.image_url   ?? "",
        images:      initialData.images      ?? [],
      });
      // Signal that we've consumed the initial data (after a tick to avoid re-render during render)
      setTimeout(() => onInitialDataConsumed?.(), 0);
    } else if (!editingApartment && !initialData) {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setSubmitError(null);
    autoFill.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingApartment, isOpen]);

  // Auto-focus URL field when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => firstInputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    },
    [onClose, submitting]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ── Field update helper ───────────────────────────────────────────────────
  const setField = <K extends keyof ApartmentFormData>(
    key: K,
    value: ApartmentFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    // Reset auto-fill feedback when the URL changes
    if (key === "url") autoFill.reset();
  };

  // ── Auto-Fill handler ─────────────────────────────────────────────────────
  const handleAutoFill = useCallback(async () => {
    const scraped = await autoFill.trigger(form.url.trim());
    if (!scraped) return;

    // Only overwrite fields that returned a non-empty value
    setForm((prev) => ({
      ...prev,
      title:       scraped.title       || prev.title,
      price:       scraped.price       || prev.price,
      rooms:       scraped.rooms       || prev.rooms,
      phone:       scraped.phone       || prev.phone,
      seller_name: scraped.seller_name || prev.seller_name,
      image_url:   scraped.image_url   || prev.image_url,
      images:      scraped.images?.length ? scraped.images : prev.images,
    }));

    // Clear field-level errors for any newly populated fields
    setErrors((prev) => ({
      ...prev,
      title: scraped.title ? undefined : prev.title,
      price: scraped.price ? undefined : prev.price,
    }));
  }, [form.url, autoFill]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ApartmentFormData, string>> = {};

    if (!form.title.trim()) {
      newErrors.title = "Title / address is required.";
    }
    const priceNum = Number(form.price);
    if (!form.price.trim()) {
      newErrors.price = "Price is required.";
    } else if (isNaN(priceNum) || priceNum < 0) {
      newErrors.price = "Price must be a positive number.";
    }
    if (form.url.trim() && !/^https?:\/\/.+/.test(form.url.trim())) {
      newErrors.url = "URL must start with http:// or https://";
    }
    if (form.image_url.trim() && !/^https?:\/\/.+/.test(form.image_url.trim())) {
      newErrors.image_url = "Image URL must start with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing   = Boolean(editingApartment);
  const isYad2Url   = form.url.trim().includes("yad2.co.il");
  const canAutoFill = isYad2Url && autoFill.status !== "loading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!submitting) onClose(); }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up max-h-[95dvh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">
              {isEditing ? "Edit Apartment" : "Add New Apartment"}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {isEditing
                ? "Update the details below."
                : "Paste a Yad2 URL and click Auto-Fill 🪄, or fill in manually."}
            </p>
          </div>
          <button
            onClick={() => { if (!submitting) onClose(); }}
            aria-label="Close modal"
            className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="overflow-y-auto custom-scroll flex-1 px-6 py-4">
          <form id="apartment-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            {/* Global submit error */}
            {submitError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* ── URL field + Auto-Fill button ──────────────────────────── */}
            <Field
              label="Listing URL"
              icon={<Link className="w-4 h-4" />}
              error={errors.url}
              hint="Paste a Yad2 link to auto-fill"
            >
              <div className="flex gap-2">
                <input
                  ref={firstInputRef}
                  type="url"
                  value={form.url}
                  onChange={(e) => setField("url", e.target.value)}
                  placeholder="https://www.yad2.co.il/item/..."
                  className={`${inputClass(!!errors.url)} flex-1 min-w-0`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!canAutoFill}
                  aria-label="Auto-fill from Yad2"
                  title={isYad2Url ? "Auto-fill from Yad2" : "Paste a Yad2 URL first"}
                  className={`
                    flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                    text-sm font-semibold border transition-all duration-150
                    ${
                      autoFill.status === "success"
                        ? "bg-green-50 border-green-300 text-green-700"
                        : canAutoFill
                        ? "bg-brand-600 border-brand-600 text-white hover:bg-brand-700 shadow-sm active:scale-95"
                        : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    }
                  `}
                >
                  {autoFill.status === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : autoFill.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {autoFill.status === "loading"
                      ? "Filling…"
                      : autoFill.status === "success"
                      ? "Filled!"
                      : "Auto-Fill"}
                  </span>
                </button>
              </div>
            </Field>

            {/* Auto-fill error / captcha banner */}
            {(autoFill.status === "error" || autoFill.status === "captcha") &&
              autoFill.errorMessage && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-xl text-sm border animate-fade-in ${
                    autoFill.status === "captcha"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{autoFill.errorMessage}</span>
                </div>
              )}

            {/* Auto-fill success confirmation */}
            {autoFill.status === "success" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Fields filled from Yad2. Review and adjust if needed.</span>
              </div>
            )}

            {/* ── Title / Address ──────────────────────────────────────── */}
            <Field
              label="Title / Address"
              icon={<MapPin className="w-4 h-4" />}
              error={errors.title}
              required
            >
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="3 rooms, Florentine, Tel Aviv"
                className={inputClass(!!errors.title)}
                autoComplete="off"
              />
            </Field>

            {/* ── Price ────────────────────────────────────────────────── */}
            <Field
              label="Monthly Price (₪)"
              icon={<DollarSign className="w-4 h-4" />}
              error={errors.price}
              required
            >
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="6500"
                className={inputClass(!!errors.price)}
              />
            </Field>

            {/* ── Rooms ────────────────────────────────────────────────── */}
            <Field
              label="Rooms"
              icon={<BedDouble className="w-4 h-4" />}
              error={errors.rooms}
              hint="e.g., 3 or 3.5"
            >
              <input
                type="text"
                value={form.rooms}
                onChange={(e) => setField("rooms", e.target.value)}
                placeholder="3"
                className={inputClass(!!errors.rooms)}
                autoComplete="off"
              />
            </Field>

            {/* ── Phone ────────────────────────────────────────────────── */}
            <Field
              label="Phone Number"
              icon={<Phone className="w-4 h-4" />}
              error={errors.phone}
            >
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="050-123-4567"
                className={inputClass(!!errors.phone)}
                autoComplete="tel"
              />
            </Field>

            {/* ── Seller Name ──────────────────────────────────────────── */}
            <Field
              label="Seller / Contact Name"
              icon={<User className="w-4 h-4" />}
              error={errors.seller_name}
            >
              <input
                type="text"
                value={form.seller_name}
                onChange={(e) => setField("seller_name", e.target.value)}
                placeholder="David, Sarah, etc."
                className={inputClass(!!errors.seller_name)}
                autoComplete="off"
              />
            </Field>

            {/* ── Image URL ────────────────────────────────────────────── */}
            <Field
              label="Image URL"
              icon={<ImageIcon className="w-4 h-4" />}
              error={errors.image_url}
              hint="Direct link to a photo"
            >
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setField("image_url", e.target.value)}
                placeholder="https://..."
                className={inputClass(!!errors.image_url)}
                autoComplete="off"
              />
            </Field>

            {/* ── Shared Notes ─────────────────────────────────────────── */}
            <Field
              label="Shared Notes"
              icon={<StickyNote className="w-4 h-4" />}
              error={errors.notes}
              hint="Visible to both of you"
            >
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Nice balcony, close to the train station..."
                rows={3}
                className={`${inputClass(!!errors.notes)} resize-none`}
              />
            </Field>

            {/* ── Status selector ──────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("status", opt.value)}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium
                      transition-all duration-150
                      ${
                        form.status === opt.value
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }
                    `}
                  >
                    <span role="img" aria-hidden="true">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

          </form>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={() => { if (!submitting) onClose(); }}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="apartment-form"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-800 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Saving…" : isEditing ? "Save Changes" : "Add Apartment"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function inputClass(hasError: boolean): string {
  return `
    w-full px-3 py-2.5 rounded-xl border text-sm text-slate-900 bg-white
    placeholder:text-slate-400 transition-colors duration-150
    focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
    ${hasError ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300"}
  `;
}

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, icon, error, hint, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <span className="text-slate-400">{icon}</span>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && !error && (
          <span className="text-slate-400 font-normal text-xs ml-1">— {hint}</span>
        )}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
