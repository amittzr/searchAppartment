"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  BedDouble,
  Heart,
  X,
  ChevronDown,
} from "lucide-react";
import type { FilterState, ReactionFilterType, SortOption, Apartment } from "@/types/database";
import { useHousehold } from "@/contexts/HouseholdContext";

// ============================================================
// Filter Toolbar Component
// Advanced filtering and sorting for apartments
// ============================================================

interface FilterToolbarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  apartments: Apartment[];
}

// Room filter options
const ROOM_OPTIONS = [
  { value: null, label: "All Rooms" },
  { value: "1", label: "1 Room" },
  { value: "2", label: "2 Rooms" },
  { value: "3", label: "3 Rooms" },
  { value: "4", label: "4 Rooms" },
  { value: "4+", label: "4+ Rooms" },
];

// Sort options
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
];

// Reaction filter options
const REACTION_FILTER_OPTIONS: { value: ReactionFilterType; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "🏠" },
  { value: "liked-by-both", label: "Both Liked", emoji: "💕" },
  { value: "liked-by-me", label: "I Liked", emoji: "❤️" },
  { value: "liked-by-partner", label: "Partner Liked", emoji: "💜" },
  { value: "review", label: "To Review", emoji: "🤔" },
  { value: "rejected-by-any", label: "Rejected", emoji: "❌" },
  { value: "no-reaction", label: "Unsorted", emoji: "📋" },
];

export default function FilterToolbar({
  filters,
  onFiltersChange,
  apartments,
}: FilterToolbarProps) {
  const { username, partnerName } = useHousehold();
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filters (excluding defaults)
  const activeFilterCount = [
    filters.reactionFilter !== "all",
    filters.roomsFilter !== null,
    filters.priceSort !== "newest",
    filters.searchQuery !== "",
  ].filter(Boolean).length;

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      reactionFilter: "all",
      roomsFilter: null,
      priceSort: "newest",
      searchQuery: "",
    });
  };

  // Calculate filter counts for badges
  const getReactionCount = (filter: ReactionFilterType): number => {
    return apartments.filter((apt) => {
      const myReaction = apt.reactions?.[username];
      const partnerReaction = apt.reactions?.[partnerName];

      switch (filter) {
        case "all":
          return true;
        case "liked-by-both":
          return myReaction === "liked" && partnerReaction === "liked";
        case "liked-by-me":
          return myReaction === "liked";
        case "liked-by-partner":
          return partnerReaction === "liked";
        case "review":
          return myReaction === "review" || partnerReaction === "review";
        case "rejected-by-any":
          return myReaction === "rejected" || partnerReaction === "rejected";
        case "no-reaction":
          return !myReaction && !partnerReaction;
        default:
          return true;
      }
    }).length;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            placeholder="Search by address, notes..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent hover:border-slate-300"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter("searchQuery", "")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand filters button (mobile) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
            sm:hidden
            ${activeFilterCount > 0
              ? "bg-brand-50 border-brand-300 text-brand-700"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }
          `}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop inline filters */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Rooms dropdown */}
          <div className="relative">
            <select
              value={filters.roomsFilter || ""}
              onChange={(e) => updateFilter("roomsFilter", e.target.value || null)}
              className="appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent cursor-pointer"
            >
              {ROOM_OPTIONS.map((opt) => (
                <option key={opt.value ?? "all"} value={opt.value ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
            <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={filters.priceSort}
              onChange={(e) => updateFilter("priceSort", e.target.value as SortOption)}
              className="appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Clear all button */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Expanded mobile filters */}
      {isExpanded && (
        <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 sm:hidden animate-fade-in">
          {/* Rooms */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Rooms</label>
            <div className="flex flex-wrap gap-1.5">
              {ROOM_OPTIONS.map((opt) => (
                <button
                  key={opt.value ?? "all"}
                  onClick={() => updateFilter("roomsFilter", opt.value)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${filters.roomsFilter === opt.value
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sort By</label>
            <select
              value={filters.priceSort}
              onChange={(e) => updateFilter("priceSort", e.target.value as SortOption)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Reaction filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {REACTION_FILTER_OPTIONS.map((opt) => {
          const count = getReactionCount(opt.value);
          const isActive = filters.reactionFilter === opt.value;

          return (
            <button
              key={opt.value}
              onClick={() => updateFilter("reactionFilter", opt.value)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap
                transition-all duration-150 flex-shrink-0
                ${isActive
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }
              `}
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
              <span className={`
                px-1.5 py-0.5 rounded-md text-xs font-semibold
                ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Filter utility function (used in page.tsx)
// ============================================================

export function filterAndSortApartments(
  apartments: Apartment[],
  filters: FilterState,
  username: string,
  partnerName: string
): Apartment[] {
  let result = [...apartments];

  // Apply search filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter(
      (apt) =>
        apt.title.toLowerCase().includes(query) ||
        (Array.isArray(apt.notes) && apt.notes.some((n) => n.text?.toLowerCase().includes(query))) ||
        apt.seller_name?.toLowerCase().includes(query)
    );
  }

  // Apply rooms filter
  if (filters.roomsFilter) {
    result = result.filter((apt) => {
      if (!apt.rooms) return false;
      const roomNum = parseFloat(apt.rooms);
      if (filters.roomsFilter === "4+") {
        return roomNum >= 4;
      }
      return apt.rooms === filters.roomsFilter || roomNum === parseFloat(filters.roomsFilter!);
    });
  }

  // Apply reaction filter
  result = result.filter((apt) => {
    const myReaction = apt.reactions?.[username];
    const partnerReaction = apt.reactions?.[partnerName];

    switch (filters.reactionFilter) {
      case "all":
        return true;
      case "liked-by-both":
        return myReaction === "liked" && partnerReaction === "liked";
      case "liked-by-me":
        return myReaction === "liked";
      case "liked-by-partner":
        return partnerReaction === "liked";
      case "review":
        return myReaction === "review" || partnerReaction === "review";
      case "rejected-by-any":
        return myReaction === "rejected" || partnerReaction === "rejected";
      case "no-reaction":
        return !myReaction && !partnerReaction;
      default:
        return true;
    }
  });

  // Apply sorting
  switch (filters.priceSort) {
    case "newest":
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case "oldest":
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case "price-asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result.sort((a, b) => b.price - a.price);
      break;
  }

  return result;
}
