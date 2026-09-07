"use client";

import { useEffect, useRef, useState } from "react";
import { X, ExternalLink, Phone, BedDouble, MapPin } from "lucide-react";
import type { Apartment } from "@/types/database";

// Leaflet types - using any since we load from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletMap = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletMarker = any;

interface MapViewProps {
  apartments: Apartment[];
  onClose: () => void;
  onSelectApartment?: (apartment: Apartment) => void;
}

// Format price with thousands separator
function formatPrice(price: number): string {
  return price.toLocaleString("he-IL");
}

// Get marker color based on reactions
function getMarkerColor(apartment: Apartment): string {
  const reactions = Object.values(apartment.reactions || {});
  const hasLiked = reactions.includes("liked");
  const hasRejected = reactions.includes("rejected");
  
  if (reactions.length >= 2 && reactions.every(r => r === "liked")) {
    return "#ec4899"; // Pink - both liked
  }
  if (hasLiked) {
    return "#ef4444"; // Red - someone liked
  }
  if (hasRejected) {
    return "#6b7280"; // Gray - rejected
  }
  return "#3b82f6"; // Blue - no reaction
}

export default function MapView({ apartments, onClose, onSelectApartment }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const markerClickedRef = useRef(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter apartments with coordinates
  const mappableApartments = apartments.filter(
    (apt) => apt.latitude != null && apt.longitude != null
  );

  useEffect(() => {
    // Dynamically load Leaflet CSS and JS
    const loadLeaflet = async () => {
      // Check if already loaded
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).L) {
        initializeMap();
        return;
      }

      // Load CSS
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      cssLink.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      cssLink.crossOrigin = "";
      document.head.appendChild(cssLink);

      // Load JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;

      // Default center: Tel Aviv
      const defaultCenter: [number, number] = [32.0853, 34.7818];
      
      // Create map
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 12);
      mapRef.current = map;

      // Close selected apartment when clicking on map (not on marker)
      map.on("click", () => {
        // Skip if a marker was just clicked
        if (markerClickedRef.current) {
          markerClickedRef.current = false;
          return;
        }
        setSelectedApartment(null);
      });

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add markers for each apartment
      const bounds: [number, number][] = [];

      mappableApartments.forEach((apt) => {
        if (apt.latitude == null || apt.longitude == null) return;

        const color = getMarkerColor(apt);
        
        // Create custom icon
        const icon = L.divIcon({
          className: "custom-marker",
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background-color: ${color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              cursor: pointer;
              transition: transform 0.15s ease;
            " 
            onmouseover="this.style.transform='scale(1.3)'"
            onmouseout="this.style.transform='scale(1)'"
            ></div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([apt.latitude, apt.longitude], { icon })
          .addTo(map)
          .on("click", () => {
            // Set flag to prevent map click from closing the card
            markerClickedRef.current = true;
            // Close tooltip when showing card
            marker.closeTooltip();
            setSelectedApartment(apt);
          });

        // Add tooltip on hover
        marker.bindTooltip(
          `<div style="font-weight:600;max-width:200px">${apt.title}</div>
           <div style="color:#666">₪${formatPrice(apt.price)}</div>`,
          { 
            direction: "top", 
            offset: [0, -10],
            className: "apartment-tooltip"
          }
        );

        markersRef.current.push(marker);
        bounds.push([apt.latitude, apt.longitude]);
      });

      // Fit bounds if we have markers
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }

      setIsLoading(false);
    };

    loadLeaflet();

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
    };
  }, [mappableApartments]);

  const handleCardClick = () => {
    if (selectedApartment && onSelectApartment) {
      onSelectApartment(selectedApartment);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-4 sm:inset-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-800">Map View</h2>
            <span className="text-sm text-slate-500">
              ({mappableApartments.length} of {apartments.length} apartments on map)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 transition-colors"
            aria-label="Close map"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Map container */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-500">Loading map...</span>
              </div>
            </div>
          )}
          
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* No geocoded apartments warning */}
          {!isLoading && mappableApartments.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90">
              <div className="text-center p-6">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-700">No apartments on map yet</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  Apartments will appear on the map once their addresses are geocoded.
                  Edit an apartment and save it to geocode its location.
                </p>
              </div>
            </div>
          )}

          {/* Selected apartment card */}
          {selectedApartment && (
            <div 
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-slide-up"
              style={{ zIndex: 1000 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedApartment(null)}
                className="absolute top-2 right-2 p-1 rounded-lg hover:bg-slate-100 transition-colors z-10"
                aria-label="Close card"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>

              {/* Image */}
              {selectedApartment.image_url && (
                <div className="h-32 bg-slate-100 overflow-hidden">
                  <img
                    src={selectedApartment.image_url}
                    alt={selectedApartment.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-3">
                <h3 className="font-semibold text-slate-800 text-sm line-clamp-2">
                  {selectedApartment.title}
                </h3>

                <div className="flex items-center gap-3 mt-2">
                  <span className="text-lg font-bold text-brand-600">
                    ₪{formatPrice(selectedApartment.price)}
                  </span>
                  {selectedApartment.rooms && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      <BedDouble className="w-3 h-3" />
                      {selectedApartment.rooms}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  {selectedApartment.url && (
                    <a
                      href={selectedApartment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View listing
                    </a>
                  )}
                  {selectedApartment.phone && (
                    <a
                      href={`tel:${selectedApartment.phone}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      Call
                    </a>
                  )}
                  <button
                    onClick={handleCardClick}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors text-center"
                  >
                    View details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-4 text-xs text-slate-500">
          <span className="font-medium">Legend:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-pink-500 border border-white shadow-sm" />
            Both liked
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm" />
            Liked
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm" />
            No reaction
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-500 border border-white shadow-sm" />
            Rejected
          </span>
        </div>
      </div>

      {/* Custom tooltip styles */}
      <style jsx global>{`
        .apartment-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .apartment-tooltip::before {
          border-top-color: white !important;
        }
        .leaflet-popup-close-button {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
