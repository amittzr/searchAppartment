"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, SearchX, Home } from "lucide-react";

import Navbar from "@/components/Navbar";
import FilterTabs from "@/components/FilterTabs";
import ApartmentCard from "@/components/ApartmentCard";
import ApartmentModal from "@/components/ApartmentModal";
import LoadingSkeleton from "@/components/LoadingSkeleton";

import { useApartments } from "@/hooks/useApartments";
import type {
  Apartment,
  ApartmentFormData,
  ApartmentStatus,
  FilterStatus,
} from "@/types/database";

// Helper to parse bookmarklet URL params into form data
function parseBookmarkletParams(searchParams: URLSearchParams): Partial<ApartmentFormData> | null {
  if (searchParams.get('autofill') !== 'true') return null;

  const data: Partial<ApartmentFormData> = {};
  
  const url = searchParams.get('url');
  const title = searchParams.get('title');
  const price = searchParams.get('price');
  const phone = searchParams.get('phone');
  const seller_name = searchParams.get('seller_name');
  const image_url = searchParams.get('image_url');
  const imagesJson = searchParams.get('images');

  if (url) data.url = url;
  if (title) data.title = title;
  if (price) data.price = price;
  if (phone) data.phone = phone;
  if (seller_name) data.seller_name = seller_name;
  if (image_url) data.image_url = image_url;
  
  if (imagesJson) {
    try {
      const images = JSON.parse(imagesJson);
      if (Array.isArray(images)) data.images = images;
    } catch {
      // Ignore parse errors
    }
  }

  return Object.keys(data).length > 0 ? data : null;
}

// Wrapper component to handle Suspense for useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={6} />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  // ── Data layer ──────────────────────────────────────────────────────────────
  const {
    apartments,
    loading,
    error,
    addApartment,
    updateApartment,
    deleteApartment,
    setStatus,
    refetch,
  } = useApartments();

  // ── URL params for bookmarklet auto-fill ────────────────────────────────────
  const searchParams = useSearchParams();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bookmarkletData, setBookmarkletData] = useState<Partial<ApartmentFormData> | null>(null);

  // Check for bookmarklet auto-fill params on mount
  useEffect(() => {
    const data = parseBookmarkletParams(searchParams);
    if (data) {
      setBookmarkletData(data);
      setEditingApartment(null);
      setIsModalOpen(true);
      // Clean the URL without refreshing the page
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  // "all" tab shows every apartment; other tabs filter by status value
  const filteredApartments = useMemo(() => {
    if (activeFilter === "all") return apartments;
    return apartments.filter((a) => a.status === activeFilter);
  }, [apartments, activeFilter]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleOpenAdd = () => {
    setEditingApartment(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (apartment: Apartment) => {
    setEditingApartment(apartment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingApartment(null);
  };

  // Called by ApartmentModal on valid submit
  const handleModalSubmit = async (formData: ApartmentFormData) => {
    const payload = {
      url:         formData.url.trim()         || null,
      title:       formData.title.trim(),
      price:       Number(formData.price),
      phone:       formData.phone.trim()       || null,
      seller_name: formData.seller_name.trim() || null,
      image_url:   formData.image_url.trim()   || null,
      images:      formData.images.length > 0 ? formData.images : null,
      notes:       formData.notes.trim()       || null,
      status:      formData.status,
    };

    let result: { error: string | null };

    if (editingApartment) {
      result = await updateApartment(editingApartment.id, payload);
    } else {
      result = await addApartment(payload);
    }

    if (result.error) {
      // Re-throw so the modal can display the server error inline
      throw new Error(result.error);
    }
  };

  // Two-step delete: first click sets the confirm ID, second click confirms
  const handleDeleteRequest = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    const { error: deleteError } = await deleteApartment(deleteConfirmId);
    setDeleteConfirmId(null);
    if (deleteError) setActionError(deleteError);
  };

  const handleStatusChange = async (id: string, status: ApartmentStatus) => {
    const { error: statusError } = await setStatus(id, status);
    if (statusError) setActionError(statusError);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sticky top navigation */}
      <Navbar
        onAddClick={handleOpenAdd}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

        {/* ── Action error banner ─────────────────────────────────────────── */}
        {actionError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Fetch error ─────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load apartments</p>
              <p className="mt-0.5 text-red-500">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 text-red-600 underline underline-offset-2 font-medium text-xs hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Filter tabs + summary ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            apartments={apartments}
          />
          {/* Subtitle: how many results are visible */}
          {!loading && (
            <p className="text-xs text-slate-400 px-1">
              {filteredApartments.length === 0
                ? "No apartments yet"
                : `Showing ${filteredApartments.length} apartment${filteredApartments.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        {/* ── Main content area ───────────────────────────────────────────── */}
        {loading ? (
          <LoadingSkeleton count={6} />
        ) : filteredApartments.length === 0 ? (
          <EmptyState
            filter={activeFilter}
            onAddClick={handleOpenAdd}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredApartments.map((apartment) => (
              <ApartmentCard
                key={apartment.id}
                apartment={apartment}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRequest}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <ApartmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        editingApartment={editingApartment}
        initialData={bookmarkletData}
        onInitialDataConsumed={() => setBookmarkletData(null)}
      />

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
          <div className="relative bg-white rounded-2xl shadow-modal p-6 w-full max-w-sm animate-slide-up">
            <h3 id="delete-confirm-title" className="text-base font-bold text-slate-900">
              Delete this apartment?
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              This action cannot be undone. The listing will be permanently removed for both of you.
            </p>
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
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
    </div>
  );
}

// ── Empty state component ──────────────────────────────────────────────────────
function EmptyState({
  filter,
  onAddClick,
}: {
  filter: FilterStatus;
  onAddClick: () => void;
}) {
  const isFiltered = filter !== "all";

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
        {isFiltered ? (
          <SearchX className="w-8 h-8" strokeWidth={1.5} />
        ) : (
          <Home className="w-8 h-8" strokeWidth={1.5} />
        )}
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-700">
          {isFiltered ? "No apartments here" : "No apartments yet"}
        </h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          {isFiltered
            ? `You haven't marked any apartments as "${filter}" yet.`
            : "Start adding apartments you find on Yad2 or Facebook."}
        </p>
      </div>
      {!isFiltered && (
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
