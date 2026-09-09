"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  BedDouble,
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

// Room options: value is the numeric string used for comparison
// "+6" means 6 or more rooms
const ROOM_OPTIONS: { value: string; label: string }[] = [
  { value: "1",   label: "1"   },
  { value: "1.5", label: "1.5" },
  { value: "2",   label: "2"   },
  { value: "2.5", label: "2.5" },
  { value: "3",   label: "3"   },
  { value: "3.5", label: "3.5" },
  { value: "4",   label: "4"   },
  { value: "4.5", label: "4.5" },
  { value: "5",   label: "5"   },
  { value: "5.5", label: "5.5" },
  { value: "6+",  label: "6+"  },
];

// Sort options
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest",     label: "Newest First"       },
  { value: "oldest",     label: "Oldest First"        },
  { value: "price-asc",  label: "Price: Low → High"  },
  { value: "price-desc", label: "Price: High → Low"  },
];

// Reaction filter options
const REACTION_FILTER_OPTIONS: { value: ReactionFilterType; label: string; emoji: string }[] = [
  { value: "all",             label: "All",          emoji: "🏠" },
  { value: "liked-by-both",   label: "Both Liked",   emoji: "💕" },
  { value: "liked-by-me",     label: "I Liked",      emoji: "❤️" },
  { value: "liked-by-partner",label: "Partner Liked", emoji: "💜" },
  { value: "review",          label: "To Review",    emoji: "🤔" },
  { value: "rejected-by-any", label: "Rejected",     emoji: "❌" },
  { value: "no-reaction",     label: "Unsorted",     emoji: "📋" },
];

// ── Room Range Selector ────────────────────────────────────────────────────────

interface RoomRangeSelectorProps {
  min: string | null;
  max: string | null;
  onChange: (min: string | null, max: string | null) => void;
}

/**
 * Renders a horizontal row of circular room buttons.
 * - First click: selects a single value (min = max)
 * - Second click on a different value: extends to a range
 * - Click on the same value: deselects
 * - Supports RTL: first selected gets rounded-r, last gets rounded-l
 */
function RoomRangeSelector({ min, max, onChange }: RoomRangeSelectorProps) {
  const minIdx = min ? ROOM_OPTIONS.findIndex((o) => o.value === min) : -1;
  const maxIdx = max ? ROOM_OPTIONS.findIndex((o) => o.value === max) : minIdx;

  const handleClick = (value: string, idx: number) => {
    // Nothing selected → select single
    if (minIdx === -1) {
      onChange(value, null);
      return;
    }
    // Same single value clicked → deselect
    if (minIdx === idx && (maxIdx === -1 || maxIdx === idx)) {
      onChange(null, null);
      return;
    }
    // Clicked inside existing range → collapse to that value
    if (maxIdx !== -1 && idx >= minIdx && idx <= maxIdx) {
      onChange(value, null);
      return;
    }
    // Extend range: pick the outer bounds
    const newMinIdx = Math.min(minIdx, idx);
    const newMaxIdx = Math.max(maxIdx === -1 ? minIdx : maxIdx, idx);
    onChange(ROOM_OPTIONS[newMinIdx].value, newMinIdx === newMaxIdx ? null : ROOM_OPTIONS[newMaxIdx].value);
  };

  return (
    <div
      className="flex items-center overflow-x-auto scrollbar-hide pb-0.5"
      dir="ltr" // keep LTR so range direction is consistent
      role="group"
      aria-label="Filter by number of rooms"
    >
      {ROOM_OPTIONS.map((opt, idx) => {
        const inRange = maxIdx !== -1
          ? idx >= minIdx && idx <= maxIdx
          : idx === minIdx;
        const isMin = idx === minIdx;
        const isMax = maxIdx !== -1 ? idx === maxIdx : idx === minIdx;
        const isActive = inRange && minIdx !== -1;

        // Border radius: first of range gets rounded left, last gets rounded right
        // (LTR layout — no RTL needed since dir="ltr" is set)
        let roundedClass = "rounded-full";
        if (isActive && maxIdx !== -1) {
          if (isMin && isMax) roundedClass = "rounded-full";
          else if (isMin)      roundedClass = "rounded-l-full rounded-r-none";
          else if (isMax)      roundedClass = "rounded-r-full rounded-l-none";
          else                 roundedClass = "rounded-none";
        }

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleClick(opt.value, idx)}
            aria-pressed={isActive}
            className={`
              flex-shrink-0 flex items-center justify-center
              w-9 h-9 text-xs font-semibold
              border transition-all duration-100 select-none
              ${isActive
                ? `bg-orange-50 border-orange-500 text-orange-600
                   ${!isMin ? "border-l-0" : ""}
                   ${!isMax ? "border-r-0" : ""}
                   ${roundedClass}`
                : "rounded-full bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
              }
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main FilterToolbar ─────────────────────────────────────────────────────────

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

  const updateRooms = (min: string | null, max: string | null) => {
    onFiltersChange({ ...filters, roomsFilter: min, roomsFilterMax: max });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      reactionFilter: "all",
      roomsFilter: null,
      roomsFilterMax: null,
      priceSort: "newest",
      searchQuery: "",
    });
  };

  // Rooms filter summary label for the desktop dropdown area
  const roomsLabel = (() => {
    if (!filters.roomsFilter) return "All Rooms";
    if (!filters.roomsFilterMax) return `${filters.roomsFilter} Rooms`;
    return `${filters.roomsFilter}–${filters.roomsFilterMax} Rooms`;
  })();

  // Calculate filter counts for badges
  const getReactionCount = (filter: ReactionFilterType): number => {
    return apartments.filter((apt) => {
      const myReaction = apt.reactions?.[username];
      const partnerReaction = apt.reactions?.[partnerName];
      switch (filter) {
        case "all":              return true;
        case "liked-by-both":   return myReaction === "liked" && partnerReaction === "liked";
        case "liked-by-me":     return myReaction === "liked";
        case "liked-by-partner":return partnerReaction === "liked";
        case "review":          return myReaction === "review" || partnerReaction === "review";
        case "rejected-by-any": return myReaction === "rejected" || partnerReaction === "rejected";
        case "no-reaction":     return !myReaction && !partnerReaction;
        default:                return true;
      }
    }).length;
  };

  return (
    <div className="flex flex-col gap-3">

      {/* ── Main toolbar row ───────────────────────────────────────────────── */}
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

        {/* Mobile: expand filters button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all sm:hidden
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

        {/* Desktop: sort dropdown + rooms summary badge */}
        <div className="hidden sm:flex items-center gap-2">

          {/* Rooms summary button — shows current selection, clicking expands */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
              ${filters.roomsFilter
                ? "bg-orange-50 border-orange-400 text-orange-700"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }
            `}
          >
            <BedDouble className="w-4 h-4" />
            <span>{roomsLabel}</span>
            {filters.roomsFilter && (
              <button
                onClick={(e) => { e.stopPropagation(); updateRooms(null, null); }}
                className="ml-1 text-orange-400 hover:text-orange-700"
                aria-label="Clear rooms filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </button>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={filters.priceSort}
              onChange={(e) => updateFilter("priceSort", e.target.value as SortOption)}
              className="appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
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

      {/* ── Expanded panel: room range + mobile sort ───────────────────────── */}
      {isExpanded && (
        <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">

          {/* Room range selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5" />
                Rooms
                {filters.roomsFilter && (
                  <span className="normal-case font-normal text-orange-600 ml-1">
                    — {roomsLabel}
                  </span>
                )}
              </label>
              {filters.roomsFilter && (
                <button
                  onClick={() => updateRooms(null, null)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Clear
                </button>
              )}
            </div>
            <RoomRangeSelector
              min={filters.roomsFilter}
              max={filters.roomsFilterMax}
              onChange={updateRooms}
            />
            <p className="text-xs text-slate-400">
              Tap once to select · tap another to set a range · tap again to deselect
            </p>
          </div>

          {/* Mobile only: sort */}
          <div className="flex flex-col gap-1.5 sm:hidden">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sort By</label>
            <select
              value={filters.priceSort}
              onChange={(e) => updateFilter("priceSort", e.target.value as SortOption)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Reaction filter pills ──────────────────────────────────────────── */}
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

  // Apply rooms filter (supports single value or range)
  if (filters.roomsFilter) {
    const minVal = parseFloat(filters.roomsFilter);
    const maxVal = filters.roomsFilterMax
      ? (filters.roomsFilterMax === "6+" ? Infinity : parseFloat(filters.roomsFilterMax))
      : (filters.roomsFilter === "6+" ? Infinity : minVal);
    const minRooms = filters.roomsFilter === "6+" ? 6 : minVal;

    result = result.filter((apt) => {
      if (!apt.rooms) return false;
      const roomNum = parseFloat(apt.rooms);
      if (isNaN(roomNum)) return false;
      return roomNum >= minRooms && roomNum <= maxVal;
    });
  }

  // Apply reaction filter
  result = result.filter((apt) => {
    const myReaction = apt.reactions?.[username];
    const partnerReaction = apt.reactions?.[partnerName];
    switch (filters.reactionFilter) {
      case "all":              return true;
      case "liked-by-both":   return myReaction === "liked" && partnerReaction === "liked";
      case "liked-by-me":     return myReaction === "liked";
      case "liked-by-partner":return partnerReaction === "liked";
      case "review":          return myReaction === "review" || partnerReaction === "review";
      case "rejected-by-any": return myReaction === "rejected" || partnerReaction === "rejected";
      case "no-reaction":     return !myReaction && !partnerReaction;
      default:                return true;
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
