/**
 * Free APIs to discover collision centers: Nominatim search ("collision center near {place}") and optional Overpass.
 * Returns: name, address, etc. No API key required. Use responsibly (rate limits: Nominatim 1 req/s).
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_SEARCH_LIMIT = 20;
/** On 504 try next (overpass-api.de often times out on busy regions). */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const OVERPASS_TIMEOUT_SEC = 15;
const MAX_BBOX_SPAN = 0.08;

export type BodyShopSearchResult = {
  name: string;
  phone: string;
  email: string;
  address: string;
  /** ZIP from addr:postcode if present */
  zipCode?: string;
  /** OSM type:id for dedupe */
  osmId?: string;
};

/** US ZIP pattern: 5 digits so Nominatim resolves to USA (e.g. 33142 → Miami) */
function isUsZipLike(place: string): boolean {
  return /^\d{5}$/.test(place.trim());
}

/** Geocode place (city name or ZIP) to bounding box [south, west, north, east] */
async function geocodeToBbox(place: string): Promise<[number, number, number, number] | null> {
  const trimmed = place.trim();
  const query = isUsZipLike(trimmed) ? `${trimmed}, USA` : trimmed;
  const q = encodeURIComponent(query);
  const url = `${NOMINATIM}?q=${q}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "CollisionConnect/1.0 (body shop finder)" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ boundingbox?: string[]; lat?: string; lon?: string }>;
  if (!Array.isArray(data) || data.length === 0) return null;
  const b = data[0];
  if (b.boundingbox && b.boundingbox.length >= 4) {
    const [s, n, w, e] = b.boundingbox;
    return [parseFloat(s), parseFloat(w), parseFloat(n), parseFloat(e)];
  }
  if (b.lat != null && b.lon != null) {
    const lat = parseFloat(b.lat);
    const lon = parseFloat(b.lon);
    const d = 0.03;
    return [lat - d, lon - d, lat + d, lon + d];
  }
  return null;
}

/** Cap bbox to max span to avoid Overpass 504 on large areas. */
function capBbox(bbox: [number, number, number, number]): [number, number, number, number] {
  const [s, w, n, e] = bbox;
  const latMid = (s + n) / 2;
  const lonMid = (w + e) / 2;
  const half = MAX_BBOX_SPAN / 2;
  return [
    Math.max(s, latMid - half),
    Math.max(w, lonMid - half),
    Math.min(n, latMid + half),
    Math.min(e, lonMid + half),
  ];
}

function formatPhone(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function formatAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  if (tags["addr:housenumber"] || tags["addr:street"]) {
    parts.push([tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "));
  }
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  if (tags["addr:state"]) parts.push(tags["addr:state"]);
  if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);
  if (tags["addr:full"]) return tags["addr:full"];
  return parts.join(", ") || "";
}

/** Query Overpass for car repair / body shops in bbox. Tries multiple endpoints on 504. */
async function overpassBodyShops(bbox: [number, number, number, number]): Promise<BodyShopSearchResult[]> {
  const [s, w, n, e] = capBbox(bbox);
  const query = `
[out:json][timeout:${OVERPASS_TIMEOUT_SEC}];
(
  node["shop"="car_repair"](${s},${w},${n},${e});
  way["shop"="car_repair"](${s},${w},${n},${e});
  node["amenity"="car_repair"](${s},${w},${n},${e});
  way["amenity"="car_repair"](${s},${w},${n},${e});
  node["car:repair"="yes"](${s},${w},${n},${e});
  way["car:repair"="yes"](${s},${w},${n},${e});
  node["car:bodywork"="yes"](${s},${w},${n},${e});
  way["car:bodywork"="yes"](${s},${w},${n},${e});
);
out body;
`;
  let lastError: Error | null = null;
  for (const baseUrl of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (res.status === 504) {
        lastError = new Error("Overpass server timed out (504). Try again in a moment.");
        continue;
      }
      if (!res.ok) {
        const msg = res.status === 429 ? "Too many requests (try again in a minute)" : "Overpass request failed";
        throw new Error(msg);
      }
      const json = (await res.json()) as {
        elements?: Array<{ type: string; id: number; tags?: Record<string, string>; center?: { lat: number; lon: number } }>;
        remark?: string;
      };
      if (json.remark && String(json.remark).toLowerCase().includes("error")) {
        throw new Error("Overpass error: " + json.remark);
      }
      const elements = json.elements ?? [];
      const seen = new Set<string>();
      const results: BodyShopSearchResult[] = [];

      for (const el of elements) {
        const tags = el.tags ?? {};
        const name = tags.name ?? tags["brand:name"] ?? "";
        if (!name.trim()) continue;
        const key = `${el.type}/${el.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const phone =
          tags.phone ??
          tags["contact:phone"] ??
          tags["phone:mobile"] ??
          tags["contact:mobile"] ??
          "";
        const email = tags.email ?? tags["contact:email"] ?? "";
        const address = formatAddress(tags);
        const zipCode = (tags["addr:postcode"] ?? "").replace(/\D/g, "").slice(0, 5) || undefined;

        results.push({
          name: name.trim(),
          phone: formatPhone(phone),
          email: email.trim(),
          address: address.trim(),
          zipCode,
          osmId: `${el.type}/${el.id}`,
        });
      }

      return results;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }
  throw lastError ?? new Error("Overpass request failed");
}

/**
 * Search collision centers by place using "collision center near {place}" style query via Nominatim.
 * Returns places that match (collision centers, body shops, etc.) from OpenStreetMap.
 * Rate limit: call sparingly (e.g. 1 request per user action).
 */
export async function searchCollisionCentersFromMap(place: string): Promise<BodyShopSearchResult[]> {
  const trimmed = place.trim();
  if (!trimmed) return [];
  const locationPart = isUsZipLike(trimmed) ? `${trimmed}, USA` : trimmed;
  const query = `collision center near ${locationPart}`;
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${NOMINATIM_SEARCH_LIMIT}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "CollisionConnect/1.0 (collision center finder)" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    place_id: number;
    osm_type?: string;
    osm_id?: number;
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }>;
  if (!Array.isArray(data) || data.length === 0) return [];
  const seen = new Set<string>();
  const results: BodyShopSearchResult[] = [];
  for (const item of data) {
    const name = item.address?.name ?? item.address?.house_number ?? item.display_name.split(",")[0]?.trim() ?? item.display_name;
    if (!name.trim()) continue;
    const osmId = item.osm_type && item.osm_id != null ? `${item.osm_type}/${item.osm_id}` : `place/${item.place_id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);
    const zipCode = item.address?.postcode?.replace(/\D/g, "").slice(0, 5) || undefined;
    results.push({
      name: name.trim(),
      phone: "",
      email: "",
      address: item.display_name || "",
      zipCode,
      osmId,
    });
  }
  return results;
}

/**
 * @deprecated Use searchCollisionCentersFromMap for "collision center" results. Kept for compatibility.
 */
export async function searchBodyShopsFromMap(place: string): Promise<BodyShopSearchResult[]> {
  return searchCollisionCentersFromMap(place);
}
