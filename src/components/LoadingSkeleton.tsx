"use client";

// Single shimmer card placeholder shown while apartments are loading
function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-2xl bg-white overflow-hidden shadow-card border border-slate-100">
      {/* Image area */}
      <div className="skeleton w-full h-44" />

      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        {/* Status badge + source tag */}
        <div className="flex items-center gap-2">
          <div className="skeleton h-5 w-20 rounded-md" />
          <div className="skeleton h-5 w-12 rounded-md" />
        </div>

        {/* Title lines */}
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>

        {/* Phone */}
        <div className="skeleton h-4 w-32 rounded" />

        {/* Notes block */}
        <div className="skeleton h-10 w-full rounded-lg" />

        {/* Action row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex gap-1.5">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="skeleton w-8 h-8 rounded-lg" />
          </div>
          <div className="flex gap-1.5">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="skeleton w-8 h-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface LoadingSkeletonProps {
  // Number of placeholder cards to render (default: 6)
  count?: number;
}

export default function LoadingSkeleton({ count = 6 }: LoadingSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
