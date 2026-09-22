"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// ============================================================
// ImageViewer — Full-featured swipeable gallery component
//
// Features:
//  - Touch swipe left/right to navigate between images
//  - Pinch-to-zoom (two-finger) or button zoom controls
//  - Pan while zoomed
//  - Smooth CSS transitions with no layout flicker
//  - Pagination dots + counter indicator
//  - Auto-reset zoom when switching images
//  - Keyboard arrow key navigation
// ============================================================

interface ImageViewerProps {
  images:        string[];
  title:         string;
  initialIndex?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────
const MIN_ZOOM  = 1;
const MAX_ZOOM  = 4;
const ZOOM_STEP = 0.75;
// Minimum horizontal swipe distance (px) to trigger a page change
const SWIPE_THRESHOLD = 50;

export default function ImageViewer({ images, title, initialIndex = 0 }: ImageViewerProps) {
  const [index,   setIndex]   = useState(initialIndex);
  const [zoom,    setZoom]    = useState(1);
  // Pan offset in pixels relative to the image center
  const [panX,    setPanX]    = useState(0);
  const [panY,    setPanY]    = useState(0);
  // Whether a CSS transition should animate the image swap
  const [sliding, setSliding] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Touch state refs (we use refs to avoid re-renders during gestures) ────
  const touchStartX    = useRef(0);
  const touchStartY    = useRef(0);
  const touchStartDist = useRef(0); // pinch start distance
  const touchStartZoom = useRef(1); // zoom level at pinch start
  const isPinching     = useRef(false);
  const isPanning      = useRef(false);
  const panStartX      = useRef(0);
  const panStartY      = useRef(0);

  // ── Reset zoom/pan when index changes ────────────────────────────────────
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // ── Navigate to a specific index ─────────────────────────────────────────
  const goTo = useCallback((next: number, dir: "left" | "right") => {
    if (next === index || images.length <= 1) return;
    setSlideDir(dir);
    setSliding(true);
    resetZoom();
    // Wait for exit animation, then swap index
    setTimeout(() => {
      setIndex(next);
      setSliding(false);
      setSlideDir(null);
    }, 180);
  }, [index, images.length, resetZoom]);

  const prev = useCallback(() => {
    goTo(index === 0 ? images.length - 1 : index - 1, "right");
  }, [index, images.length, goTo]);

  const next = useCallback(() => {
    goTo(index === images.length - 1 ? 0 : index + 1, "left");
  }, [index, images.length, goTo]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, resetZoom]);

  // ── Euclidean distance between two touch points ───────────────────────────
  const touchDist = (a: React.Touch, b: React.Touch) =>
    Math.sqrt((a.clientX - b.clientX) ** 2 + (a.clientY - b.clientY) ** 2);

  // ── Touch handlers ────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two fingers — pinch gesture start
      isPinching.current     = true;
      isPanning.current      = false;
      touchStartDist.current = touchDist(e.touches[0], e.touches[1]);
      touchStartZoom.current = zoom;
    } else {
      // Single finger — swipe or pan start
      isPinching.current = false;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;

      if (zoom > 1) {
        // When zoomed in, single finger pans the image
        isPanning.current = true;
        panStartX.current = panX;
        panStartY.current = panY;
      } else {
        isPanning.current = false;
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isPinching.current && e.touches.length === 2) {
      e.preventDefault(); // prevent browser zoom
      const dist  = touchDist(e.touches[0], e.touches[1]);
      const scale = (dist / touchStartDist.current) * touchStartZoom.current;
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale)));
    } else if (isPanning.current && e.touches.length === 1 && zoom > 1) {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      setPanX(panStartX.current + dx);
      setPanY(panStartY.current + dy);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isPinching.current) {
      isPinching.current = false;
      // Snap back to min zoom if we under-zoomed
      if (zoom <= MIN_ZOOM + 0.1) resetZoom();
      return;
    }

    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    // Single-finger swipe — only trigger if not zoomed
    if (zoom === 1 && images.length > 1) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      // Only count as horizontal swipe if movement is more horizontal than vertical
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) next(); // swipe left → next
        else        prev(); // swipe right → prev
      }
    }
  };

  // ── Zoom controls ─────────────────────────────────────────────────────────
  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2))));
  const zoomOut = () => {
    const next = parseFloat((zoom - ZOOM_STEP).toFixed(2));
    if (next <= MIN_ZOOM) { resetZoom(); } else { setZoom(next); }
  };

  if (images.length === 0) return null;

  // ── Slide animation classes ───────────────────────────────────────────────
  const slideClass = sliding
    ? slideDir === "left"
      ? "translate-x-[-8%] opacity-0"
      : "translate-x-[8%] opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className="flex flex-col bg-slate-900 select-none" ref={containerRef}>
      {/* ── Main image container ──────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ aspectRatio: "4/3", touchAction: zoom > 1 ? "none" : "pan-y" }}
      >
        {/* Image with slide + zoom transform */}
        <div
          className={`absolute inset-0 transition-all duration-180 ease-out ${slideClass}`}
          style={{
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
            transformOrigin: "center center",
            transition: sliding
              ? "opacity 0.18s ease, transform 0.18s ease"
              : zoom !== 1
                ? "none"
                : "opacity 0.18s ease, transform 0.18s ease",
            willChange: "transform",
            cursor: zoom > 1 ? "grab" : "default",
          }}
        >
          <Image
            src={images[index]}
            alt={`${title} — image ${index + 1} of ${images.length}`}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-contain"
            priority={index === 0}
            draggable={false}
          />
        </div>

        {/* Prev / Next arrow buttons (hidden while zoomed) */}
        {images.length > 1 && zoom === 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Counter + Zoom controls overlay (top-right) */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {/* Zoom controls */}
          <button
            onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {/* Reset zoom (only visible when zoomed) */}
          {zoom > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              aria-label="Reset zoom"
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Image counter badge (bottom-right) */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 z-10 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold tabular-nums">
            {index + 1} / {images.length}
          </div>
        )}
      </div>

      {/* ── Pagination dots ───────────────────────────────────────────────── */}
      {images.length > 1 && images.length <= 12 && (
        <div className="flex items-center justify-center gap-1.5 py-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > index ? "left" : "right")}
              aria-label={`Go to image ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === index
                  ? "w-4 h-2 bg-white"          // active — wider pill
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"  // inactive dot
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Thumbnail strip (desktop, more than 1 image) ──────────────────── */}
      {images.length > 1 && (
        <div className="hidden lg:flex gap-2 px-4 pb-3 overflow-x-auto justify-center">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > index ? "left" : "right")}
              aria-label={`View image ${i + 1}`}
              className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-150 ${
                i === index
                  ? "border-white scale-105 shadow-lg"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
