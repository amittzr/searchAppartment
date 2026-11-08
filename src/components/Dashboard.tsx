"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, SearchX, Home, Settings, Map, Activity } from "lucide-react";

import Navbar from "@/components/Navbar";
import FilterToolbar, { filterAndSortApartments } from "@/components/FilterToolbar";
import ApartmentCard from "@/components/ApartmentCard";
import ApartmentModal from "@/components/ApartmentModal";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import HouseholdSettingsModal from "@/components/HouseholdSettingsModal";
import MapView from "@/components/MapView";
import ChecklistModal from "@/components/ChecklistModal";
import CommentsModal from "@/components/CommentsModal";
import WelcomeGuideModal from "@/components/WelcomeGuideModal";
import AppFooter from "@/components/AppFooter";
import ActivityFeed from "@/components/ActivityFeed";
import DemoBanner from "@/components/DemoBanner";
import { useAuthGate } from "@/contexts/AuthGateContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import type { UseApartmentsReturn } from "@/hooks/useApartments";
import type { useActivityLog } from "@/hooks/useActivityLog";
import { consumePendingIntent } from "@/lib/consume-pending-intent";
import { geocodeAddress, extractAddressFromTitle } from "@/lib/geocode";
import { getSupabaseClient } from "@/lib/supabase-client";
import { savePendingIntent, type PendingItemData } from "@/lib/pending-intent";
import type {
  Apartment,
  ApartmentFormData,
  ChecklistData,
  FilterState,
  ReactionStatus,
} from "@/types/database";

// ============================================================
// Dashboard
//
// The presentational dashboard shared by the live app ("/") and the
// public playground ("/demo"). The data layer is injected through
// props, so this component never decides where data comes from:
//   - live: Supabase-backed useApartments + useActivityLog
//   - demo: in-memory mock data; high-intent actions open the signup modal
// ============================================================

export type DashboardMode = "live" | "demo";

export type DashboardData = UseApartmentsReturn & {
  /** Demo only: applies a checklist edit to local state. */
  applyLocalChecklist?: (id: string, data: ChecklistData) => void;
};

export type DashboardActivity = ReturnType<typeof useActivityLog>;

interface DashboardProps {
  mode: DashboardMode;
  data: DashboardData;
  activity: DashboardActivity;
}

// Default filter state
const DEFAULT_FILTERS: FilterState = {
  reactionFilter: "all",
  roomsFilter: null,
  roomsFilterMax: null,
  priceSort: "newest",
  searchQuery: "",
};

// Helper to parse bookmarklet URL params into form data
function parseBookmarkletParams(searchParams: URLSearchParams): Partial<ApartmentFormData> | null {
  if (searchParams.get('autofill') !== 'true') return null;

  const data: Partial<ApartmentFormData> = {};
  
  const url         = searchParams.get('url');
  const title       = searchParams.get('title');
  const price       = searchParams.get('price');
  const rooms       = searchParams.get('rooms');
  const phone       = searchParams.get('phone');
  const seller_name = searchParams.get('seller_name');
  const image_url   = searchParams.get('image_url');
  const imagesJson  = searchParams.get('images');
  // autoscrape=true means the bookmarklet fell back to URL-only mode;
  // the modal will detect the Yad2 URL and auto-trigger the scraper
  const autoScrape  = searchParams.get('autoscrape') === 'true';

  if (url) data.url = url;
  if (!autoScrape) {
    // Only populate fields if the bookmarklet did client-side extraction
    if (title)       data.title       = title;
    if (price)       data.price       = price;
    if (rooms)       data.rooms       = rooms;
    if (phone)       data.phone       = phone;
    if (seller_name) data.seller_name = seller_name;
    if (image_url)   data.image_url   = image_url;

    if (imagesJson) {
      try {
        const images = JSON.parse(imagesJson);
        if (Array.isArray(images)) data.images = images;
      } catch {
        // Ignore parse errors
      }
    }
  }

  return Object.keys(data).length > 0 ? data : null;
}

export default function Dashboard({ mode, data, activity }: DashboardProps) {
  const isDemo = mode === "demo";

  // ── Household context ───────────────────────────────────────────────────────
  const { username, partnerName, categoryConfig, category, profile, household, refreshProfile } = useHousehold();

  // ── Auth gate (only active inside the /demo playground) ─────────────────────
  const { requireAuth } = useAuthGate();

  // ── Data layer (injected) ───────────────────────────────────────────────────
  const {
    apartments,
    loading,
    error,
    addApartment,
    updateApartment,
    deleteApartment,
    setReaction,
    addComment,
    markAsViewed,
    isMatch,
    refetch,
    applyLocalChecklist,
  } = data;

  // ── URL params for bookmarklet auto-fill ────────────────────────────────────
  const searchParams = useSearchParams();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookmarkletData, setBookmarkletData] = useState<Partial<ApartmentFormData> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [checklistApartment, setChecklistApartment] = useState<Apartment | null>(null);
  const [commentsApartment, setCommentsApartment] = useState<Apartment | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // ── One-time welcome guide ──────────────────────────────────────────────────
  // The guide shows only when the DB flag is explicitly false. If the column is
  // missing (migration not applied) the value is undefined and the guide stays hidden.
  // A localStorage guard prevents a re-show if the DB write below ever fails.
  // In demo mode the mock profile has no flag, so the guide never shows.
  const [guideFinished, setGuideFinished] = useState(false);
  const guideStorageKey = profile ? `justpick-onboarding-done:${profile.id}` : null;

  useEffect(() => {
    if (!guideStorageKey) return;
    try {
      if (window.localStorage.getItem(guideStorageKey) === "1") setGuideFinished(true);
    } catch {
      // Storage unavailable (e.g. private mode) — fall back to the DB flag only
    }
  }, [guideStorageKey]);

  const showWelcomeGuide = !isDemo && profile?.has_completed_onboarding === false && !guideFinished;

  // Called when the guide is completed OR dismissed; never shows again afterwards.
  const handleGuideComplete = async () => {
    if (!profile || !guideStorageKey) return;
    setGuideFinished(true);
    try {
      window.localStorage.setItem(guideStorageKey, "1");
    } catch {
      // Ignore storage errors
    }

    const { error: updateError } = await (getSupabaseClient().from("profiles") as any)
      .update({ has_completed_onboarding: true })
      .eq("id", profile.id);

    if (updateError) {
      console.warn("[onboarding] Failed to persist guide completion:", updateError.message);
      return;
    }
    await refreshProfile();
  };

  // Activity log (injected)
  const { entries: activityEntries, loading: activityLoading, logEvent, refetch: refetchActivity } = activity;

  // Check for bookmarklet auto-fill params on mount (live app only)
  useEffect(() => {
    if (isDemo) return;
    const parsed = parseBookmarkletParams(searchParams);
    if (parsed) {
      setBookmarkletData(parsed);
      setEditingApartment(null);
      setIsModalOpen(true);
      // Clean the URL without refreshing the page
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, isDemo]);

  // ── Post-signup: turn the item a demo visitor tried to add into a real item ──
  const pendingCheckedRef = useRef(false);
  useEffect(() => {
    if (isDemo || !household?.id || loading || pendingCheckedRef.current) return;
    pendingCheckedRef.current = true;

    consumePendingIntent({ householdId: household.id, category, addApartment }).then((result) => {
      if (result.status === "added") {
        setNotice(
          result.photosFailed
            ? `We added "${result.title}" from your demo session, but some photos could not be saved. You can re-add them by editing the item.`
            : `We added "${result.title}" from your demo session.`
        );
      } else if (result.status === "failed") {
        setActionError(`We could not add the listing from your demo session: ${result.message}`);
      }
    });
  }, [isDemo, household?.id, loading, category, addApartment]);

  // ── Filtered and sorted list ────────────────────────────────────────────────
  const filteredApartments = useMemo(() => {
    return filterAndSortApartments(apartments, filters, username, partnerName);
  }, [apartments, filters, username, partnerName]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleOpenAdd = () => {
    setEditingApartment(null);
    setBookmarkletData(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (apartment: Apartment) => {
    if (isDemo) {
      requireAuth("edit");
      return;
    }
    setEditingApartment(apartment);
    setBookmarkletData(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingApartment(null);
    setBookmarkletData(null);
  };

  // Demo: the visitor filled in (or auto-extracted) the full add form and pressed Add.
  // Keep the values for after signup, then show the signup modal.
  const captureDemoItem = (formData: ApartmentFormData) => {
    const data: PendingItemData = {
      url:         formData.url.trim(),
      title:       formData.title.trim(),
      price:       formData.price,
      rooms:       formData.rooms,
      phone:       formData.phone,
      seller_name: formData.seller_name,
      image_url:   formData.image_url,
      images:      formData.images,
      metadata:    (formData.metadata ?? {}) as Record<string, unknown>,
    };

    if (!savePendingIntent({ type: "item", data })) {
      // Browser storage is full (large photos). Retry without the locally held photos
      // (data URLs) so the text details and any remote Yad2 images still survive.
      const isLocal = (src: string) => src.startsWith("data:");
      savePendingIntent({
        type: "item",
        data: {
          ...data,
          image_url: isLocal(data.image_url) ? "" : data.image_url,
          images:    data.images.filter((src) => !isLocal(src)),
        },
      });
    }
    requireAuth("add");
  };

  // Called by ApartmentModal on valid submit
  const handleModalSubmit = async (formData: ApartmentFormData) => {
    if (isDemo) {
      captureDemoItem(formData);
      return;
    }

    const title = formData.title.trim();
    
    // Geocode the address if it's new or title changed
    let latitude: number | null = null;
    let longitude: number | null = null;
    
    const shouldGeocode = !editingApartment || editingApartment.title !== title;
    
    if (shouldGeocode && title) {
      try {
        const addressToGeocode = extractAddressFromTitle(title);
        const geoResult = await geocodeAddress(addressToGeocode);
        if (geoResult) {
          latitude = geoResult.latitude;
          longitude = geoResult.longitude;
          console.log(`[geocode] Found coordinates for "${title}":`, geoResult);
        }
      } catch (err) {
        console.warn('[geocode] Failed to geocode address:', err);
        // Continue without coordinates - not a blocking error
      }
    } else if (editingApartment) {
      // Keep existing coordinates if title didn't change
      latitude = editingApartment.latitude;
      longitude = editingApartment.longitude;
    }

    const payload = {
      url:         formData.url.trim()         || null,
      title:       title,
      price:       Number(formData.price),
      rooms:       formData.rooms?.trim()      || null,
      phone:       formData.phone.trim()       || null,
      seller_name: formData.seller_name.trim() || null,
      image_url:   formData.image_url.trim()   || null,
      images:      formData.images.length > 0 ? formData.images : null,
      // Notes: send empty string if no notes yet (DB may still have text column)
      notes:       (formData.notes.length > 0 ? formData.notes : []) as any,
      metadata:    formData.metadata           || {},
      latitude,
      longitude,
    };

    let result: { error: string | null };

    if (editingApartment) {
      result = await updateApartment(editingApartment.id, payload);
    } else {
      result = await addApartment(payload);
    }

    if (result.error) {
      throw new Error(result.error);
    }

    // Log activity (fire-and-forget — non-blocking)
    if (editingApartment) {
      // edit events are not logged to avoid noise
    } else {
      logEvent("item_added", { itemTitle: title });
    }
  };

  // Handle reaction changes from ApartmentCard
  const handleReactionChange = async (apartmentId: string, reaction: ReactionStatus | null) => {
    if (isDemo) {
      // Liking something the partner already liked is the "match" moment
      const target = apartments.find((a) => a.id === apartmentId);
      const partnerLiked = target?.reactions?.[partnerName] === "liked";
      requireAuth(reaction === "liked" && partnerLiked ? "match" : "like");
      return;
    }

    const { error: reactionError } = await setReaction(apartmentId, reaction);
    if (reactionError) { setActionError(reactionError); return; }

    // Log reaction activity (non-blocking)
    const apt = apartments.find((a) => a.id === apartmentId);
    if (apt && reaction) {
      logEvent("reaction_set", {
        itemId:    apartmentId,
        itemTitle: apt.title,
        metadata:  { reaction },
      });

      // Check if this reaction created a match
      if (reaction === "liked") {
        const updatedApt = { ...apt, reactions: { ...apt.reactions, [username]: "liked" } } as typeof apt;
        if (isMatch(updatedApt)) {
          logEvent("match", { itemId: apartmentId, itemTitle: apt.title });
        }
      }
    }
  };

  // Open checklist modal for a specific apartment
  const handleChecklist = (apartment: Apartment) => {
    setChecklistApartment(apartment);
  };

  // Called by ChecklistModal after a successful save — update local state
  const handleChecklistSaved = (id: string, checklistData: ChecklistData) => {
    setChecklistApartment((prev) =>
      prev?.id === id ? { ...prev, checklist_data: checklistData } : prev
    );
    // Demo has no realtime channel to refresh the list, so apply the edit locally
    applyLocalChecklist?.(id, checklistData);
  };

  // Open the dedicated comments chat for a specific apartment
  const handleComments = (apartment: Apartment) => {
    setCommentsApartment(apartment);
  };

  // Comments sender: in the demo, sending a note is a high-intent action
  const handleSendComment = isDemo
    ? async () => {
        requireAuth("comment");
        return { error: null };
      }
    : addComment;

  const handleOpenSettings = () => {
    if (isDemo) {
      requireAuth("invite");
      return;
    }
    setIsSettingsOpen(true);
  };

  // Jump from an activity entry to its apartment card: scroll into view + highlight.
  const handleActivityJump = (itemId: string) => {
    // If current filters would hide the target, clear them so the card is visible.
    const isVisible = filteredApartments.some((a) => a.id === itemId);
    if (!isVisible) {
      setFilters(DEFAULT_FILTERS);
    }

    setIsActivityOpen(false);
    setHighlightedId(itemId);

    // Wait for the drawer to close / list to re-render, then scroll to the card.
    setTimeout(() => {
      const el = document.getElementById(`apt-${itemId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);

    // Auto-clear the highlight after a couple seconds.
    setTimeout(() => {
      setHighlightedId((prev) => (prev === itemId ? null : prev));
    }, 2600);
  };

  // Two-step delete: first click sets the confirm ID, second click confirms
  const handleDeleteRequest = (id: string) => {
    if (isDemo) {
      requireAuth("delete");
      return;
    }
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    const idToDelete = deleteConfirmId;
    // Snapshot title before optimistic removal
    const deletedApt = apartments.find((a) => a.id === idToDelete);
    setDeleteConfirmId(null);
    const { error: deleteError } = await deleteApartment(idToDelete);
    if (deleteError) {
      setActionError(`Delete failed: ${deleteError}. The item has been restored.`);
    } else if (deletedApt) {
      logEvent("item_deleted", { itemId: idToDelete, itemTitle: deletedApt.title });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      {/* Demo-only strip explaining that this is a sandbox */}
      {isDemo && <DemoBanner />}

      {/* Sticky top navigation */}
      <Navbar
        onAddClick={handleOpenAdd}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        demoMode={isDemo}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

        {/* ── Household settings button ───────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Welcome, <span className="font-medium text-slate-700 dark:text-slate-200">{username}</span>
            {partnerName && partnerName !== "Partner" && (
              <> & <span className="font-medium text-slate-700 dark:text-slate-200">{partnerName}</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMapOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
              title="View on map"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              onClick={() => setIsActivityOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
              title="Recent activity"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </button>
            <button
              onClick={handleOpenSettings}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* ── Info notice (e.g. demo item added after signup) ─────────────── */}
        {notice && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in dark:bg-green-950/40 dark:border-green-900 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{notice}</span>
            <button
              onClick={() => setNotice(null)}
              className="text-green-500 hover:text-green-700 font-bold text-lg leading-none dark:text-green-500 dark:hover:text-green-300"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Action error banner ─────────────────────────────────────────── */}
        {actionError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-600 font-bold text-lg leading-none dark:text-red-500 dark:hover:text-red-300"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Fetch error ─────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load apartments</p>
              <p className="mt-0.5 text-red-500 dark:text-red-400">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 text-red-600 underline underline-offset-2 font-medium text-xs hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Filter toolbar ──────────────────────────────────────────────── */}
        <FilterToolbar
          filters={filters}
          onFiltersChange={setFilters}
          apartments={apartments}
        />

        {/* ── Results summary ─────────────────────────────────────────────── */}
        {!loading && (
          <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
            {filteredApartments.length === 0
              ? `No ${categoryConfig.label.toLowerCase()} match your filters`
              : `Showing ${filteredApartments.length} ${filteredApartments.length !== 1 ? categoryConfig.label.toLowerCase() : categoryConfig.label.toLowerCase().replace(/s$/, "")}`}
          </p>
        )}

        {/* ── Main content area ───────────────────────────────────────────── */}
        {loading ? (
          <LoadingSkeleton count={6} />
        ) : filteredApartments.length === 0 ? (
          <EmptyState
            hasFilters={filters.reactionFilter !== "all" || filters.roomsFilter !== null || filters.searchQuery !== ""}
            onAddClick={handleOpenAdd}
            onClearFilters={() => setFilters(DEFAULT_FILTERS)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredApartments.map((apartment) => (
              <ApartmentCard
                key={apartment.id}
                apartment={apartment}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRequest}
                onReactionChange={handleReactionChange}
                onMarkViewed={markAsViewed}
                onChecklist={handleChecklist}
                onComments={handleComments}
                highlight={highlightedId === apartment.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────────────
          Demo visitors get the same form (including Yad2 auto-fill and screenshot
          extraction); pressing Add stores their entry and opens the signup modal. */}
      <ApartmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        editingApartment={editingApartment}
        initialData={bookmarkletData}
        onInitialDataConsumed={() => setBookmarkletData(null)}
      />


      {/* ── Household Settings Modal (live only) ─────────────────────────────── */}
      {!isDemo && (
        <HouseholdSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* ── Activity Feed Drawer ─────────────────────────────────────────────── */}
      <ActivityFeed
        entries={activityEntries}
        loading={activityLoading}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        onRefetch={refetchActivity}
        onEntryClick={handleActivityJump}
        isItemAvailable={(id) => apartments.some((a) => a.id === id)}
      />

      {/* ── Checklist Modal ──────────────────────────────────────────────────── */}
      {checklistApartment && (
        <ChecklistModal
          apartment={checklistApartment}
          isOpen={true}
          onClose={() => setChecklistApartment(null)}
          onSaved={handleChecklistSaved}
          localOnly={isDemo}
        />
      )}

      {/* ── Comments Modal — uses the live apartment so new comments appear ───── */}
      {commentsApartment && (
        <CommentsModal
          apartment={apartments.find((a) => a.id === commentsApartment.id) ?? commentsApartment}
          isOpen={true}
          onClose={() => setCommentsApartment(null)}
          onSend={handleSendComment}
        />
      )}

      {/* ── Map View ────────────────────────────────────────────────────────────── */}
      {isMapOpen && (
        <MapView
          apartments={filteredApartments}
          onClose={() => setIsMapOpen(false)}
          onSelectApartment={handleOpenEdit}
        />
      )}

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-modal p-6 w-full max-w-sm animate-slide-up">
            <h3 id="delete-confirm-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Delete this apartment?
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              This action cannot be undone. The listing will be permanently removed for both of you.
            </p>
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── One-time welcome guide (first login after signup) ───────────────────── */}
      <WelcomeGuideModal isOpen={showWelcomeGuide} onComplete={handleGuideComplete} />

      {/* ── Footer ──────────────────────────────────────────────────────────────── */}
      <AppFooter />
    </div>
  );
}

// ── Empty state component ──────────────────────────────────────────────────────
function EmptyState({
  hasFilters,
  onAddClick,
  onClearFilters,
}: {
  hasFilters: boolean;
  onAddClick: () => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
        {hasFilters ? (
          <SearchX className="w-8 h-8" strokeWidth={1.5} />
        ) : (
          <Home className="w-8 h-8" strokeWidth={1.5} />
        )}
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          {hasFilters ? "No apartments match your filters" : "No apartments yet"}
        </h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
          {hasFilters
            ? "Try adjusting your filters or clearing them to see more results."
            : "Start adding apartments you find on Yad2 or Facebook."}
        </p>
      </div>
      {hasFilters ? (
        <button
          onClick={onClearFilters}
          className="mt-2 px-5 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Clear filters
        </button>
      ) : (
        <button
          onClick={onAddClick}
          className="mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-md"
        >
          Add your first apartment
        </button>
      )}
    </div>
  );
}
