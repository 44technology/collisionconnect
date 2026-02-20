/**
 * Free APIs to discover body shops: Nominatim (geocode) + Overpass (OpenStreetMap).
 * Returns: name, phone, email (if in OSM), address.
 * No API key required. Use responsibly (rate limits: Nominatim 1 req/s, Overpass avoid heavy load).
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";

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

/** Geocode place (city name or ZIP) to bounding box [south, west, north, east] */
async function geocodeToBbox(place: string): Promise<[number, number, number, number] | null> {
  const q = encodeURIComponent(place.trim());
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
    const d = 0.05;
    return [lat - d, lon - d, lat + d, lon + d];
  }
  return null;
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

/** Query Overpass for car repair / body shops in bbox */
async function overpassBodyShops(bbox: [number, number, number, number]): Promise<BodyShopSearchResult[]> {
  const [s, w, n, e] = bbox;
  const query = `
[out:json][timeout:25];
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
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error("Overpass request failed");
  const json = (await res.json()) as { elements?: Array<{ type: string; id: number; tags?: Record<string, string>; center?: { lat: number; lon: number } }> };
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
}

/**
 * Search body shops by place (city name or ZIP). Uses free Nominatim + Overpass APIs.
 * Rate limit: call sparingly (e.g. 1 request per user action).
 */
export async function searchBodyShopsFromMap(place: string): Promise<BodyShopSearchResult[]> {
  const bbox = await geocodeToBbox(place);
  if (!bbox) return [];
  return overpassBodyShops(bbox);
}
