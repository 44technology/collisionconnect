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
    const make = (r.Make ?? "").trim();
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

/** All makes (for dropdown). */
export async function getAllMakes(): Promise<MakeItem[]> {
  const url = `${BASE}/GetAllMakes?format=json`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const json = (await res.json()) as { Results?: Array<{ Make_ID: number; Make_Name: string }> };
    return (json.Results ?? []).map((x) => ({ makeId: x.Make_ID, makeName: x.Make_Name }));
  } catch {
    return [];
  }
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
