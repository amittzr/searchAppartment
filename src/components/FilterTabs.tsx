"use client";

import type { FilterStatus, Apartment } from "@/types/database";

interface FilterTabsProps {
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  apartments: Apartment[];
}

// Tab definitions — label, emoji and the status value they filter by
const TABS: { label: string; emoji: string; value: FilterStatus }[] = [
  { label: "All",      emoji: "🏠", value: "all"      },
  { label: "Liked",    emoji: "❤️",  value: "liked"    },
  { label: "Review",   emoji: "🤔", value: "review"   },
  { label: "Rejected", emoji: "❌", value: "rejected" },
];

export default function FilterTabs({
  activeFilter,
  onFilterChange,
  apartments,
}: FilterTabsProps) {
  // Count apartments per status bucket
  const counts: Record<FilterStatus, number> = {
    all:      apartments.length,
    liked:    apartments.filter((a) => a.status === "liked").length,
    review:   apartments.filter((a) => a.status === "review").length,
    rejected: apartments.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 min-w-max px-4 sm:px-0 py-1">
        {TABS.map((tab) => {
          const isActive = activeFilter === tab.value;
          const count = counts[tab.value];

          return (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              aria-pressed={isActive}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                border transition-all duration-150 whitespace-nowrap
                ${
                  isActive
                    ? "bg-brand-600 border-brand-600 text-white shadow-md"
                    : "bg-white border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50"
                }
              `}
            >
              <span role="img" aria-hidden="true" className="text-base leading-none">
                {tab.emoji}
              </span>
              <span>{tab.label}</span>
              {/* Live count badge */}
              <span
                className={`
                  inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                  rounded-full text-xs font-bold
                  ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 text-slate-500"
                  }
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
