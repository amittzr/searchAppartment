"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Heart,
  Clock,
  X,
  ExternalLink,
  Phone,
  Pencil,
  Trash2,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Expand,
  Images,
  BedDouble,
  Car,
  Fuel,
  Calendar,
  Gauge,
} from "lucide-react";
import type { Apartment, ReactionStatus, CategoryType, ItemMetadata, CarMetadata, BrideVenueMetadata, ApartmentMetadata, NotesThread } from "@/types/database";
import { useHousehold } from "@/contexts/HouseholdContext";
import NotesThreadComponent from "./NotesThread";

interface ApartmentCardProps {
  apartment: Apartment;
  onEdit: (apartment: Apartment) => void;
  onDelete: (id: string) => void;
  onReactionChange: (id: string, reaction: ReactionStatus | null) => void;
  onMarkViewed: (id: string) => void;
}

// ── Reaction configuration ───────────────────────────────────────────────────
const REACTION_CONFIG: Record<
  ReactionStatus,
  { label: string; emoji: string; bgClass: string; textClass: string; borderClass: string }
> = {
  liked: {
    label: "Liked",
    emoji: "❤️",
    bgClass: "bg-red-50",
    textClass: "text-red-600",
    borderClass: "border-red-200",
  },
  review: {
    label: "Review",
    emoji: "🤔",
    bgClass: "bg-amber-50",
    textClass: "text-amber-600",
    borderClass: "border-amber-200",
  },
  rejected: {
    label: "Rejected",
    emoji: "❌",
    bgClass: "bg-slate-100",
    textClass: "text-slate-500",
    borderClass: "border-slate-200",
  },
};

// Reaction buttons for user selection
const REACTION_ACTIONS: { reaction: ReactionStatus; icon: React.ReactNode; label: string; activeClass: string }[] = [
  {
    reaction: "liked",
    icon: <Heart className="w-4 h-4" />,
    label: "Like",
    activeClass: "bg-red-500 text-white border-red-500",
  },
  {
    reaction: "review",
    icon: <Clock className="w-4 h-4" />,
    label: "Review",
    activeClass: "bg-amber-400 text-white border-amber-400",
  },
  {
    reaction: "rejected",
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

// Get price unit based on category
function getPriceUnit(category: CategoryType): string {
  switch (category) {
    case "apartment": return "/mo";
    case "bride_venue": return "/night";
    case "car": return "";
    default: return "";
  }
}

export default function ApartmentCard({
  apartment,
  onEdit,
  onDelete,
  onReactionChange,
  onMarkViewed,
}: ApartmentCardProps) {
  const { username, partnerName, members, category, categoryConfig, profile } = useHousehold();
  
  // Normalize notes to always be an array
  const notesThread: NotesThread = Array.isArray(apartment.notes) ? apartment.notes : [];

  // Determine if this item is unread by the current user
  const currentUserId = profile?.id ?? "";
  const isUnread = currentUserId
    ? !(apartment.viewed_by ?? []).includes(currentUserId)
    : false;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get reactions for both users
  const myReaction = apartment.reactions?.[username] || null;
  const partnerReaction = apartment.reactions?.[partnerName] || null;
  
  // Check if all members liked (match)
  const isMatch = members.length >= 2 && members.every(m => apartment.reactions?.[m.full_name] === "liked");
  const anyRejected = myReaction === "rejected" || partnerReaction === "rejected";
  
  const cardBorderClass = isMatch 
    ? "border-green-300 ring-2 ring-green-100" 
    : anyRejected 
      ? "border-slate-200 opacity-60 hover:opacity-100" 
      : "border-slate-200";
  
  const source = detectSource(apartment.url);
  const priceUnit = getPriceUnit(category);
  
  // Get all images
  const allImages = apartment.images?.length 
    ? apartment.images 
    : apartment.image_url 
      ? [apartment.image_url] 
      : [];

  const handleReactionToggle = (reaction: ReactionStatus) => {
    onReactionChange(apartment.id, myReaction === reaction ? null : reaction);
    // Reacting to an item counts as having seen it
    if (isUnread) onMarkViewed(apartment.id);
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
    const opening = !isExpanded;
    setIsExpanded(opening);
    setCurrentImageIndex(0);
    // Mark as viewed when user opens the card
    if (opening && isUnread) {
      onMarkViewed(apartment.id);
    }
  };

  // ── Category-specific metadata display ──────────────────────────────────────
  const renderCategoryBadges = (expanded = false) => {
    const metadata = apartment.metadata as ItemMetadata;
    const badges: React.ReactNode[] = [];

    // Rooms badge for apartments and venues
    if ((category === "apartment" || category === "bride_venue") && apartment.rooms) {
      badges.push(
        <span key="rooms" className={`flex items-center gap-1 ${expanded ? "px-2.5 py-1 rounded-lg text-sm" : "px-2 py-0.5 rounded-md text-xs"} bg-purple-100 text-purple-700 font-semibold border border-purple-200`}>
          <BedDouble className={expanded ? "w-4 h-4" : "w-3 h-3"} />
          {apartment.rooms} {category === "bride_venue" ? "suites" : "rooms"}
        </span>
      );
    }

    // Car-specific badges
    if (category === "car" && metadata) {
      const carMeta = metadata as CarMetadata;
      if (carMeta.year) {
        badges.push(
          <span key="year" className={`flex items-center gap-1 ${expanded ? "px-2.5 py-1 rounded-lg text-sm" : "px-2 py-0.5 rounded-md text-xs"} bg-blue-100 text-blue-700 font-semibold border border-blue-200`}>
            <Calendar className={expanded ? "w-4 h-4" : "w-3 h-3"} />
            {carMeta.year}
          </span>
        );
      }
      if (carMeta.mileage) {
        badges.push(
          <span key="mileage" className={`flex items-center gap-1 ${expanded ? "px-2.5 py-1 rounded-lg text-sm" : "px-2 py-0.5 rounded-md text-xs"} bg-green-100 text-green-700 font-semibold border border-green-200`}>
            <Gauge className={expanded ? "w-4 h-4" : "w-3 h-3"} />
            {(carMeta.mileage / 1000).toFixed(0)}K km
          </span>
        );
      }
      if (carMeta.fuel_type) {
        badges.push(
          <span key="fuel" className={`flex items-center gap-1 ${expanded ? "px-2.5 py-1 rounded-lg text-sm" : "px-2 py-0.5 rounded-md text-xs"} bg-amber-100 text-amber-700 font-semibold border border-amber-200`}>
            <Fuel className={expanded ? "w-4 h-4" : "w-3 h-3"} />
            {carMeta.fuel_type}
          </span>
        );
      }
    }

    // Bride venue distance
    if (category === "bride_venue" && metadata) {
      const venueMeta = metadata as BrideVenueMetadata;
      if (venueMeta.distance_km) {
        badges.push(
          <span key="distance" className={`flex items-center gap-1 ${expanded ? "px-2.5 py-1 rounded-lg text-sm" : "px-2 py-0.5 rounded-md text-xs"} bg-teal-100 text-teal-700 font-semibold border border-teal-200`}>
            <MapPin className={expanded ? "w-4 h-4" : "w-3 h-3"} />
            {venueMeta.distance_km} km
          </span>
        );
      }
    }

    return badges;
  };

  // ── Expanded View ──────────────────────────────────────────────────────────
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
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category emoji */}
              <span className="text-lg">{categoryConfig.emoji}</span>
              
              {/* Dual reaction badges */}
              <ReactionBadge name={username} reaction={myReaction} isMe />
              <ReactionBadge name={partnerName} reaction={partnerReaction} />
              {isMatch && (
                <span className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold border border-green-200 animate-pulse">
                  💕 Match!
                </span>
              )}
              {source && (
                <span className="px-2.5 py-1 rounded-lg bg-brand-600/90 text-white text-xs font-semibold">
                  {source}
                </span>
              )}
              {renderCategoryBadges(true)}
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
                        
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
                          {currentImageIndex + 1} / {allImages.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[4/3] lg:h-full flex flex-col items-center justify-center text-slate-500">
                    {category === "car" ? (
                      <Car className="w-12 h-12 mb-2" strokeWidth={1.5} />
                    ) : (
                      <MapPin className="w-12 h-12 mb-2" strokeWidth={1.5} />
                    )}
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
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-slate-900">
                    ₪{formatPrice(apartment.price)}
                  </span>
                  {priceUnit && <span className="text-slate-400 text-sm">{priceUnit}</span>}
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                  {apartment.title}
                </h2>

                {/* Category-specific details */}
                <div className="flex flex-wrap gap-2">
                  {renderCategoryBadges(true)}
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

                {/* Notes (full thread, read-only in expanded view) */}
                {notesThread.length > 0 && (
                  <div className="flex flex-col gap-2 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <NotesThreadComponent
                      thread={notesThread}
                      newNote=""
                      onNewNote={() => {}}
                      onSend={() => {}}
                      currentUserId={profile?.id ?? ""}
                      disabled
                    />
                  </div>
                )}

                {/* Reaction Selector */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Reaction</h3>
                  <div className="flex gap-2">
                    {REACTION_ACTIONS.map(({ reaction, icon, label, activeClass }) => (
                      <button
                        key={reaction}
                        onClick={() => handleReactionToggle(reaction)}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium
                          transition-all duration-150 active:scale-95
                          ${
                            myReaction === reaction
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
                  
                  {/* Partner's reaction */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400">{partnerName}&apos;s reaction:</span>
                    {partnerReaction ? (
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${REACTION_CONFIG[partnerReaction].bgClass} ${REACTION_CONFIG[partnerReaction].textClass}`}>
                        {REACTION_CONFIG[partnerReaction].emoji} {REACTION_CONFIG[partnerReaction].label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not yet voted</span>
                    )}
                  </div>
                </div>

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
        ${cardBorderClass}
      `}
    >
      {/* Hero Image */}
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
            {allImages.length > 1 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                <Images className="w-3.5 h-3.5" />
                {allImages.length}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
            {category === "car" ? (
              <Car className="w-10 h-10 mb-1" strokeWidth={1.5} />
            ) : (
              <MapPin className="w-10 h-10 mb-1" strokeWidth={1.5} />
            )}
            <span className="text-xs font-medium">No image</span>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-sm font-bold tabular-nums">
            ₪{formatPrice(apartment.price)}
            {priceUnit && <span className="text-xs font-normal opacity-80">{priceUnit}</span>}
          </span>
        </div>

        {/* Source tag */}
        {source && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-md bg-brand-600/90 backdrop-blur-sm text-white text-xs font-semibold">
              {source}
            </span>
          </div>
        )}

        {/* NEW badge — shown when current user hasn't seen this item yet */}
        {isUnread && (
          <div className="absolute top-2 right-2 z-10">
            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-400 text-amber-900 text-xs font-bold shadow animate-pulse">
              ✨ NEW
            </span>
          </div>
        )}

        {/* Dual reaction badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <ReactionBadge name={username} reaction={myReaction} isMe compact />
          <ReactionBadge name={partnerName} reaction={partnerReaction} compact />
        </div>

        {/* Match indicator */}
        {isMatch && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-bold shadow-lg animate-pulse">
              💕 Match!
            </span>
          </div>
        )}

        {/* Expand button on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Expand className="w-5 h-5 text-slate-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title with category-specific badges */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug flex-1">
            {apartment.title}
          </h2>
          <div className="flex flex-wrap gap-1 flex-shrink-0">
            {renderCategoryBadges()}
          </div>
        </div>

        {/* Seller and phone */}
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
            >
              <Phone className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
              <span className="font-medium">{apartment.phone}</span>
            </a>
          )}
        </div>

        {/* Notes (compact read-only) */}
        {notesThread.length > 0 && (
          <NotesThreadComponent
            thread={notesThread}
            newNote=""
            onNewNote={() => {}}
            onSend={() => {}}
            currentUserId={profile?.id ?? ""}
            compact
          />
        )}

        <div className="flex-1" />

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
          {/* Reaction toggle buttons */}
          <div className="flex items-center gap-1.5">
            {REACTION_ACTIONS.map(({ reaction, icon, label, activeClass }) => (
              <button
                key={reaction}
                onClick={() => handleReactionToggle(reaction)}
                aria-label={label}
                title={label}
                className={`
                  flex items-center justify-center w-8 h-8 rounded-lg border text-sm
                  transition-all duration-150 active:scale-90
                  ${
                    myReaction === reaction
                      ? activeClass
                      : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 bg-white"
                  }
                `}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Right actions */}
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
              aria-label="Edit"
              title="Edit"
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-300 bg-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
            </button>

            <button
              onClick={() => onDelete(apartment.id)}
              aria-label="Delete"
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

// ── Helper Components ─────────────────────────────────────────────────────────

interface ReactionBadgeProps {
  name: string;
  reaction: ReactionStatus | null;
  isMe?: boolean;
  compact?: boolean;
}

function ReactionBadge({ name, reaction, isMe, compact }: ReactionBadgeProps) {
  if (!reaction) {
    return compact ? null : (
      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-xs font-medium border border-slate-200">
        {isMe ? "You" : name}: 🏠
      </span>
    );
  }

  const cfg = REACTION_CONFIG[reaction];
  const displayName = isMe ? "You" : name.charAt(0).toUpperCase();

  if (compact) {
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass} border`}>
        {displayName}: {cfg.emoji}
      </span>
    );
  }

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}>
      {isMe ? "You" : name}: {cfg.emoji} {cfg.label}
    </span>
  );
}
