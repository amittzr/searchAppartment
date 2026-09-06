"use client";

import Image from "next/image";
import {
  Heart,
  Clock,
  X,
  ExternalLink,
  Phone,
  StickyNote,
  Pencil,
  Trash2,
  MapPin,
} from "lucide-react";
import type { Apartment, ApartmentStatus } from "@/types/database";

interface ApartmentCardProps {
  apartment: Apartment;
  onEdit: (apartment: Apartment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ApartmentStatus) => void;
}

// ── Status configuration ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  ApartmentStatus,
  { label: string; emoji: string; bgClass: string; textClass: string; borderClass: string }
> = {
  all: {
    label: "Unsorted",
    emoji: "🏠",
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
    borderClass: "border-slate-200",
  },
  liked: {
    label: "Liked",
    emoji: "❤️",
    bgClass: "bg-red-50",
    textClass: "text-red-600",
    borderClass: "border-red-200",
  },
  review: {
    label: "Review Later",
    emoji: "🤔",
    bgClass: "bg-amber-50",
    textClass: "text-amber-600",
    borderClass: "border-amber-200",
  },
  rejected: {
    label: "Rejected",
    emoji: "❌",
    bgClass: "bg-slate-50",
    textClass: "text-slate-400",
    borderClass: "border-slate-200",
  },
};

// Status cycle buttons shown at the bottom of each card
const STATUS_ACTIONS: { status: ApartmentStatus; icon: React.ReactNode; label: string; activeClass: string }[] =
  [
    {
      status: "liked",
      icon: <Heart className="w-4 h-4" />,
      label: "Like",
      activeClass: "bg-red-500 text-white border-red-500",
    },
    {
      status: "review",
      icon: <Clock className="w-4 h-4" />,
      label: "Review Later",
      activeClass: "bg-amber-400 text-white border-amber-400",
    },
    {
      status: "rejected",
      icon: <X className="w-4 h-4" strokeWidth={2.5} />,
      label: "Reject",
      activeClass: "bg-slate-400 text-white border-slate-400",
    },
  ];

// Detect whether a URL looks like a Yad2 or Facebook listing
function detectSource(url: string | null): string | null {
  if (!url) return null;
  if (url.includes("yad2")) return "Yad2";
  if (url.includes("facebook") || url.includes("fb.com")) return "Facebook";
  return "Link";
}

// Format price with thousands separator
function formatPrice(price: number): string {
  return price.toLocaleString("he-IL");
}

export default function ApartmentCard({
  apartment,
  onEdit,
  onDelete,
  onStatusChange,
}: ApartmentCardProps) {
  const statusCfg = STATUS_CONFIG[apartment.status];
  const source = detectSource(apartment.url);

  const handleStatusToggle = (status: ApartmentStatus) => {
    // Clicking an already-active status resets it back to 'all' (unsorted)
    onStatusChange(apartment.id, apartment.status === status ? "all" : status);
  };

  return (
    <article
      className={`
        group relative flex flex-col rounded-2xl bg-white overflow-hidden
        shadow-card hover:shadow-card-hover border
        transition-all duration-200 animate-fade-in
        ${apartment.status === "rejected" ? "opacity-60 hover:opacity-100" : ""}
        ${statusCfg.borderClass}
      `}
    >
      {/* ── Hero Image ─────────────────────────────────────────────────────── */}
      <div className="relative w-full h-44 bg-slate-100 overflow-hidden flex-shrink-0">
        {apartment.image_url ? (
          <Image
            src={apartment.image_url}
            alt={apartment.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Fallback to placeholder on broken image URL
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          // Placeholder when no image is provided
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
            <MapPin className="w-10 h-10 mb-1" strokeWidth={1.5} />
            <span className="text-xs font-medium">No image</span>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-sm font-bold tabular-nums">
            ₪{formatPrice(apartment.price)}
            <span className="text-xs font-normal opacity-80">/mo</span>
          </span>
        </div>

        {/* Source tag (Yad2 / Facebook) */}
        {source && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-md bg-brand-600/90 backdrop-blur-sm text-white text-xs font-semibold">
              {source}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${statusCfg.bgClass} ${statusCfg.textClass} ${statusCfg.borderClass}`}
          >
            {statusCfg.emoji} {statusCfg.label}
          </span>
        </div>
      </div>

      {/* ── Card Body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 gap-3">

        {/* Title / Address */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
            {apartment.title}
          </h2>
        </div>

        {/* Phone number */}
        {apartment.phone && (
          <a
            href={`tel:${apartment.phone}`}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 transition-colors w-fit"
            aria-label={`Call ${apartment.phone}`}
          >
            <Phone className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
            <span className="font-medium">{apartment.phone}</span>
          </a>
        )}

        {/* Shared notes */}
        {apartment.notes && (
          <div className="flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-2">
            <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" strokeWidth={2} />
            <p className="line-clamp-2 leading-relaxed">{apartment.notes}</p>
          </div>
        )}

        {/* Spacer pushes action row to the bottom */}
        <div className="flex-1" />

        {/* ── Action Row ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">

          {/* Status toggle buttons */}
          <div className="flex items-center gap-1.5">
            {STATUS_ACTIONS.map(({ status, icon, label, activeClass }) => (
              <button
                key={status}
                onClick={() => handleStatusToggle(status)}
                aria-label={label}
                title={label}
                className={`
                  flex items-center justify-center w-8 h-8 rounded-lg border text-sm
                  transition-all duration-150 active:scale-90
                  ${
                    apartment.status === status
                      ? activeClass
                      : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 bg-white"
                  }
                `}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Right: open link, edit, delete */}
          <div className="flex items-center gap-1.5">
            {apartment.url && (
              <a
                href={apartment.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open original listing"
                title="Open original listing"
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-300 bg-white transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
              </a>
            )}

            <button
              onClick={() => onEdit(apartment)}
              aria-label="Edit apartment"
              title="Edit"
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-300 bg-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
            </button>

            <button
              onClick={() => onDelete(apartment.id)}
              aria-label="Delete apartment"
              title="Delete"
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 bg-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
