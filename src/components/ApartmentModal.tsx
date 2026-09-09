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
  Wand2,
  CheckCircle2,
  User,
  BedDouble,
  Upload,
  Trash2,
} from "lucide-react";
import type { Apartment, ApartmentFormData, ApartmentStatus, ItemMetadata, NotesThread } from "@/types/database";
import { useYad2AutoFill } from "@/hooks/useYad2AutoFill";
import { useHousehold } from "@/contexts/HouseholdContext";
import CategoryFields from "./CategoryFields";
import NotesThreadComponent from "./NotesThread";
import { uploadImages } from "@/lib/upload-images";

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
  notes: [],
  newNote: "",
  status: "all",
  metadata: {},
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
  const { categoryConfig, category, profile, household } = useHousehold();
  const [form, setForm]               = useState<ApartmentFormData>(EMPTY_FORM);
  const [errors, setErrors]           = useState<Partial<Record<keyof ApartmentFormData, string>>>({});
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Image upload state
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadErrors, setUploadErrors]       = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill: iframe-first, server-side API fallback
  const autoFill = useYad2AutoFill();

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing; reset when adding; or use initialData from bookmarklet.
  // NOTE: intentionally NOT including initialData in deps — it is consumed once on open
  // and then nulled out; re-running on null would wipe the form.
  useEffect(() => {
    if (!isOpen) return;

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
        notes:       Array.isArray(editingApartment.notes) ? editingApartment.notes : [],
        newNote:     "",
        status:      editingApartment.status,
        metadata:    editingApartment.metadata    ?? {},
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
      // If bookmarklet fell back to URL-only (autoscrape=true), fire the scraper
      if (initialData.url && !initialData.title && !initialData.price) {
        setTimeout(async () => {
          const scraped = await autoFill.trigger(initialData.url!);
          if (!scraped) return;
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
        }, 300);
      }
      // Mark initial data as consumed AFTER populating form
      setTimeout(() => onInitialDataConsumed?.(), 50);
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

  // ── Image file upload handler ──────────────────────────────────────────
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (!household?.id) {
      setUploadErrors(["No household found. Please refresh and try again."]);
      return;
    }

    setUploadingImages(true);
    setUploadErrors([]);

    const { urls, errors: uploadErrs } = await uploadImages(files, household.id);

    if (urls.length > 0) {
      setForm((prev) => ({
        ...prev,
        images:    [...prev.images, ...urls],
        image_url: prev.image_url || urls[0], // Set first upload as hero if empty
      }));
    }

    if (uploadErrs.length > 0) {
      setUploadErrors(uploadErrs);
    }

    setUploadingImages(false);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [household?.id]);

  // ── Remove a single image from the list ────────────────────────────────
  const handleRemoveImage = useCallback((indexToRemove: number) => {
    setForm((prev) => {
      const newImages   = prev.images.filter((_, i) => i !== indexToRemove);
      const removedUrl  = prev.images[indexToRemove];
      const newImageUrl = prev.image_url === removedUrl
        ? (newImages[0] ?? "")
        : prev.image_url;
      return { ...prev, images: newImages, image_url: newImageUrl };
    });
  }, []);

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
  const isYad2Url   = (form.url.trim().includes("yad2.co.il") || form.url.trim().includes("yad-il.co.il")) && 
    (form.url.includes("/item/") || form.url.includes("/listing/") || form.url.includes("/realestate/"));
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
              {isEditing ? `Edit ${categoryConfig.emoji}` : `Add New ${categoryConfig.emoji}`}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {isEditing
                ? "Update the details below."
                : category === "apartment" 
                  ? "Paste a Yad2 URL and click Auto-Fill, or fill in manually."
                  : `Enter the ${categoryConfig.label.toLowerCase()} details below.`}
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
                  placeholder="https://www.yad2.co.il/item/... or /listing/..."
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
              label={categoryConfig.titleLabel}
              icon={<MapPin className="w-4 h-4" />}
              error={errors.title}
              required
            >
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder={category === "apartment" ? "3 rooms, Florentine, Tel Aviv" : 
                             category === "bride_venue" ? "Villa Noa, Caesarea" : 
                             "Toyota Camry 2022"}
                className={inputClass(!!errors.title)}
                autoComplete="off"
              />
            </Field>

            {/* ── Price ────────────────────────────────────────────────── */}
            <Field
              label={categoryConfig.priceLabel}
              icon={<DollarSign className="w-4 h-4" />}
              error={errors.price}
              required
            >
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder={category === "apartment" ? "6500" : 
                             category === "bride_venue" ? "15000" : 
                             "85000"}
                className={inputClass(!!errors.price)}
              />
            </Field>

            {/* ── Rooms (only for apartments and venues) ───────────────── */}
            {(category === "apartment" || category === "bride_venue") && (
              <Field
                label={category === "bride_venue" ? "Rooms/Suites" : "Rooms"}
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
            )}

            {/* ── Phone ────────────────────────────────────────────────── */}
            <Field
              label="Phone Number"
              icon={<Phone className="w-4 h-4" />}
              error={errors.phone}
              hint="On Yad2: click 'Show phone' first, then use the bookmarklet"
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

            {/* ── Image URL + Native Upload ─────────────────────────── */}
            <Field
              label="Image URL"
              icon={<ImageIcon className="w-4 h-4" />}
              error={errors.image_url}
              hint="Paste a link or upload photos below"
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

            {/* ── Upload Photos ─────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-400"><Upload className="w-4 h-4" /></span>
                Upload Photos
                <span className="text-slate-400 font-normal text-xs ml-1">— JPEG, PNG, WebP up to 5 MB each</span>
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload images"
              />

              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages || submitting}
                className="
                  flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                  border-2 border-dashed border-slate-300 text-slate-500 text-sm
                  hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all
                "
              >
                {uploadingImages ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Choose Photos</>
                )}
              </button>

              {/* Upload errors */}
              {uploadErrors.length > 0 && (
                <div className="flex flex-col gap-1">
                  {uploadErrors.map((err, i) => (
                    <p key={i} className="flex items-center gap-1 text-xs text-red-500 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Image preview strip */}
              {form.images.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-1">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                      />
                      {/* Hero badge */}
                      {form.image_url === url && (
                        <div className="absolute bottom-0 left-0 right-0 bg-brand-600/80 text-white text-[10px] text-center font-semibold py-0.5">
                          Hero
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove image ${idx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {/* Set as hero on click */}
                      {form.image_url !== url && (
                        <button
                          type="button"
                          onClick={() => setField("image_url", url)}
                          className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors"
                          title="Set as hero image"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Threaded Notes ─────────────────────────────────────────── */}
            <NotesThreadComponent
              thread={form.notes}
              newNote={form.newNote}
              onNewNote={(val) => setField("newNote", val)}
              onSend={() => {
                if (!form.newNote.trim() || !profile) return;
                const newEntry = {
                  userId:    profile.id,
                  userName:  profile.full_name,
                  text:      form.newNote.trim(),
                  createdAt: new Date().toISOString(),
                };
                setField("notes", [...form.notes, newEntry]);
                setField("newNote", "");
              }}
              currentUserId={profile?.id ?? ""}
              disabled={submitting}
            />

            {/* ── Category-specific fields ──────────────────────────── */}
            <CategoryFields
              metadata={form.metadata}
              onChange={(metadata) => setField("metadata", metadata)}
            />

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
            {submitting ? "Saving…" : isEditing ? "Save Changes" : `Add ${categoryConfig.emoji}`}
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
