/**
 * NHTSA VPIC API – free, no API key. US vehicles (1981+).
 * https://vpic.nhtsa.dot.gov/api/
 */

const BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

export type VinDecodeResult = {
  make: string;
  model: string;
  year: string;
  trim: string;
  bodyClass?: string;
  /** Raw VIN (may be partial with *) */
  vin: string;
};

/** Decode VIN (17 chars or partial with *). Returns make, model, year, trim. */
export async function decodeVin(vin: string): Promise<VinDecodeResult | null> {
  const raw = vin.trim().toUpperCase().replace(/\s/g, "");
  if (raw.length < 8) return null;
  const url = `${BASE}/DecodeVinValues/${encodeURIComponent(raw)}?format=json`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { Results?: Array<Record<string, string>> };
    const r = json.Results?.[0];
    if (!r) return null;
    const make = formatMakeName((r.Make ?? "").trim());
    const model = (r.Model ?? "").trim();
    const year = (r.ModelYear ?? "").trim();
    const trim = (r.Trim ?? "").trim();
    if (!make && !model && !year) return null;
    return {
      make,
      model,
      year,
      trim,
      bodyClass: (r.BodyClass ?? "").trim() || undefined,
      vin: raw,
    };
  } catch {
    return null;
  }
}

export type MakeItem = { makeId: number; makeName: string };

/** Format make name for display: keep short acronyms (BMW, GMC), else title-case (Toyota, Mercedes-Benz). */
function formatMakeName(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (/^[A-Z0-9]{2,5}$/.test(s)) return s;
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .replace(/\b(And|Or|Of|The)\b/gi, (m) => m.toLowerCase());
}

/** Car/SUV makes only (Passenger Car + Multipurpose Passenger Vehicle), deduped and sorted. */
export async function getAllMakes(): Promise<MakeItem[]> {
  const types = ["Passenger%20Car", "Multipurpose%20Passenger%20Vehicle"];
  const byId = new Map<number, string>();
  for (const vehicleType of types) {
    try {
      const url = `${BASE}/GetMakesForVehicleType/${vehicleType}?format=json`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        Results?: Array<{ MakeId: number; MakeName: string }>;
      };
      for (const x of json.Results ?? []) {
        if (!byId.has(x.MakeId)) byId.set(x.MakeId, x.MakeName);
      }
    } catch {
      continue;
    }
  }
  return Array.from(byId.entries())
    .map(([makeId, makeName]) => ({ makeId, makeName: formatMakeName(makeName) }))
    .sort((a, b) => a.makeName.localeCompare(b.makeName, "en", { sensitivity: "base" }));
}

export type ModelItem = { modelId: number; modelName: string };

/** Models for a make (for dropdown). */
export async function getModelsForMake(make: string): Promise<ModelItem[]> {
  const slug = make.trim().replace(/\s+/g, "%20");
  if (!slug) return [];
  const url = `${BASE}/GetModelsForMake/${encodeURIComponent(slug)}?format=json`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      Results?: Array<{ Model_ID: number; Model_Name: string }>;
    };
    return (json.Results ?? []).map((x) => ({ modelId: x.Model_ID, modelName: x.Model_Name }));
  } catch {
    return [];
  }
}

/** Models for make + year (narrower list when year known). */
export async function getModelsForMakeYear(make: string, year: string): Promise<ModelItem[]> {
  const makeSlug = make.trim().replace(/\s+/g, "%20");
  const yearNum = year.trim().replace(/\D/g, "");
  if (!makeSlug || !yearNum) return [];
  const url = `${BASE}/GetModelsForMakeYear/make/${encodeURIComponent(makeSlug)}/modelyear/${yearNum}?format=json`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      Results?: Array<{ Model_ID: number; Model_Name: string }>;
    };
    return (json.Results ?? []).map((x) => ({ modelId: x.Model_ID, modelName: x.Model_Name }));
  } catch {
    return [];
  }
}
