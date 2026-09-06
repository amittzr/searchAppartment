"use client";

import { useState } from "react";
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
  User,
  ChevronLeft,
  ChevronRight,
  Expand,
  Images,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const statusCfg = STATUS_CONFIG[apartment.status];
  const source = detectSource(apartment.url);
  
  // Get all images - use images array if available, otherwise fallback to single image_url
  const allImages = apartment.images?.length 
    ? apartment.images 
    : apartment.image_url 
      ? [apartment.image_url] 
      : [];

  const handleStatusToggle = (status: ApartmentStatus) => {
    // Clicking an already-active status resets it back to 'all' (unsorted)
    onStatusChange(apartment.id, apartment.status === status ? "all" : status);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setCurrentImageIndex(0); // Reset to first image when toggling
  };

  // ── Expanded View (Modal-like overlay) ──────────────────────────────────────
  if (isExpanded) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={toggleExpanded}
        />
        
        {/* Expanded Card */}
        <div className="fixed inset-4 sm:inset-8 lg:inset-16 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusCfg.bgClass} ${statusCfg.textClass} ${statusCfg.borderClass}`}
              >
                {statusCfg.emoji} {statusCfg.label}
              </span>
              {source && (
                <span className="px-2.5 py-1 rounded-lg bg-brand-600/90 text-white text-xs font-semibold">
                  {source}
                </span>
              )}
            </div>
            <button
              onClick={toggleExpanded}
              className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close expanded view"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row">
              {/* Image Gallery */}
              <div className="lg:w-1/2 xl:w-3/5 bg-slate-900 relative">
                {allImages.length > 0 ? (
                  <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full">
                    <Image
                      src={allImages[currentImageIndex]}
                      alt={`${apartment.title} - Image ${currentImageIndex + 1}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-contain"
                      priority
                    />
                    
                    {/* Navigation arrows */}
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={handlePrevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={handleNextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        
                        {/* Image counter */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
                          {currentImageIndex + 1} / {allImages.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[4/3] lg:h-full flex flex-col items-center justify-center text-slate-500">
                    <MapPin className="w-12 h-12 mb-2" strokeWidth={1.5} />
                    <span className="text-sm font-medium">No images</span>
                  </div>
                )}
                
                {/* Thumbnail strip */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-16 left-0 right-0 px-4 hidden lg:block">
                    <div className="flex gap-2 overflow-x-auto py-2 justify-center">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(idx);
                          }}
                          className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                            idx === currentImageIndex
                              ? "border-white shadow-lg scale-105"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <Image
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Details Panel */}
              <div className="lg:w-1/2 xl:w-2/5 p-4 sm:p-6 flex flex-col gap-5">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    ₪{formatPrice(apartment.price)}
                  </span>
                  <span className="text-slate-400 text-sm">/month</span>
                </div>

                {/* Title/Address */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                    {apartment.title}
                  </h2>
                </div>

                {/* Contact Info */}
                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</h3>
                  
                  {apartment.seller_name && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{apartment.seller_name}</span>
                    </div>
                  )}
                  
                  {apartment.phone && (
                    <a
                      href={`tel:${apartment.phone}`}
                      className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span>{apartment.phone}</span>
                    </a>
                  )}
                  
                  {!apartment.seller_name && !apartment.phone && (
                    <p className="text-sm text-slate-400 italic">No contact info</p>
                  )}
                </div>

                {/* Notes */}
                {apartment.notes && (
                  <div className="flex flex-col gap-2 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">
                      <StickyNote className="w-3.5 h-3.5" />
                      Notes
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{apartment.notes}</p>
                  </div>
                )}

                {/* Status Buttons */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</h3>
                  <div className="flex gap-2">
                    {STATUS_ACTIONS.map(({ status, icon, label, activeClass }) => (
                      <button
                        key={status}
                        onClick={() => handleStatusToggle(status)}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium
                          transition-all duration-150 active:scale-95
                          ${
                            apartment.status === status
                              ? activeClass
                              : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-white"
                          }
                        `}
                      >
                        {icon}
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  {apartment.url && (
                    <a
                      href={apartment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 bg-white transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Original
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setIsExpanded(false);
                      onEdit(apartment);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 bg-white transition-colors text-sm font-medium"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setIsExpanded(false);
                      onDelete(apartment.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-500 hover:border-red-200 bg-white transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Normal Card View ────────────────────────────────────────────────────────
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
      <div 
        className="relative w-full h-44 bg-slate-100 overflow-hidden flex-shrink-0 cursor-pointer"
        onClick={toggleExpanded}
      >
        {allImages.length > 0 ? (
          <>
            <Image
              src={allImages[0]}
              alt={apartment.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Image count badge */}
            {allImages.length > 1 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                <Images className="w-3.5 h-3.5" />
                {allImages.length}
              </div>
            )}
          </>
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

        {/* Expand button on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Expand className="w-5 h-5 text-slate-700" />
            </div>
          </div>
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

        {/* Seller name and phone */}
        <div className="flex flex-col gap-1.5">
          {apartment.seller_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
              <span className="font-medium">{apartment.seller_name}</span>
            </div>
          )}
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
        </div>

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
