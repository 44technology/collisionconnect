/**
 * Google Places API (Maps JavaScript + Places) for "body shop" / collision center search.
 * Requires VITE_GOOGLE_MAPS_API_KEY in .env and enabling Maps JavaScript API + Places API in Google Cloud.
 */

import type { BodyShopSearchResult } from "./bodyShopsApi";

const SCRIPT_URL = "https://maps.googleapis.com/maps/api/js";
const MAX_RESULTS = 20;

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          PlacesService: new (attrContainer: HTMLDivElement) => {
            textSearch: (
              request: { query: string },
              callback: (results: PlaceResult[] | null, status: string) => void
            ) => void;
          };
        };
      };
    };
    initGoogleMapsCallback?: () => void;
  }
}

interface PlaceResult {
  name?: string;
  formatted_address?: string;
  place_id?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

/** Load Google Maps script with Places library once. */
function loadGoogleMapsScript(): Promise<void> {
  const key = getApiKey();
  if (!key) return Promise.reject(new Error("Google Maps API key not set"));

  if (typeof window === "undefined") return Promise.reject(new Error("Not in browser"));
  if (window.google?.maps?.places) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src^="${SCRIPT_URL}"]`);
    if (existing) {
      const check = () => (window.google?.maps?.places ? resolve() : setTimeout(check, 50));
      check();
      return;
    }
    const script = document.createElement("script");
    script.src = `${SCRIPT_URL}?key=${encodeURIComponent(key)}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    window.initGoogleMapsCallback = () => {
      delete window.initGoogleMapsCallback;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
}

/**
 * Search body shops / collision centers via Google Places text search.
 * Query: "body shop {place}" e.g. "body shop Miami, FL" or "body shop 33142".
 * Returns [] if key missing or on error.
 */
export async function searchBodyShopsGoogle(place: string): Promise<BodyShopSearchResult[]> {
  const trimmed = place.trim();
  if (!trimmed) return [];

  const key = getApiKey();
  if (!key) return [];

  try {
    await loadGoogleMapsScript();
  } catch {
    return [];
  }

  const locationPart = /^\d{5}$/.test(trimmed) ? `${trimmed}, USA` : trimmed;
  const query = `body shop ${locationPart}`;

  return new Promise((resolve) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const service = new window.google!.maps!.places!.PlacesService(div);
    service.textSearch({ query }, (results, status) => {
      document.body.removeChild(div);
      if (status !== "OK" || !results?.length) {
        resolve([]);
        return;
      }
      const list: BodyShopSearchResult[] = results.slice(0, MAX_RESULTS).map((r) => {
        const addr = r.formatted_address?.trim() || "";
        const zipMatch = addr.match(/\b(\d{5})(?:-\d{4})?\b/);
        return {
          name: r.name?.trim() || "—",
          phone: "",
          email: "",
          address: addr,
          zipCode: zipMatch ? zipMatch[1] : undefined,
          osmId: r.place_id ? `google/${r.place_id}` : undefined,
        };
      });
      resolve(list);
    });
  });
}

export function isGooglePlacesEnabled(): boolean {
  return !!getApiKey();
}
