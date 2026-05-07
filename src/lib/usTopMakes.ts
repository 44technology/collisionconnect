import type { MakeItem } from "./vehicleApi";

/**
 * ~30 brands that typically lead U.S. light-vehicle sales (passenger + light trucks).
 * Keeps the picker short; users always pick from this list in the app.
 */
export const US_TOP_30_MAKES: readonly string[] = [
  "Toyota",
  "Ford",
  "Chevrolet",
  "Honda",
  "Hyundai",
  "Nissan",
  "Jeep",
  "Subaru",
  "Kia",
  "Ram",
  "GMC",
  "Mercedes-Benz",
  "BMW",
  "Volkswagen",
  "Mazda",
  "Lexus",
  "Audi",
  "Tesla",
  "Buick",
  "Cadillac",
  "Acura",
  "Volvo",
  "Lincoln",
  "Mitsubishi",
  "Porsche",
  "Genesis",
  "Land Rover",
  "Infiniti",
  "Chrysler",
  "MINI",
  "Other",
] as const;

export function usTopMakeItems(): MakeItem[] {
  return US_TOP_30_MAKES.map((makeName, i) => ({ makeId: i + 1, makeName }));
}

/** Normalize for comparison (VIN / user typing vs list). */
export function normalizeMakeKey(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]/g, "");
}

/** Map a VIN/API string to the canonical top-30 label, or null if no match. */
export function resolveToTopMake(decoded: string): string | null {
  const k = normalizeMakeKey(decoded);
  if (!k) return null;
  for (const m of US_TOP_30_MAKES) {
    const top = normalizeMakeKey(m);
    if (k === top || k.startsWith(top) || top.startsWith(k)) return m;
  }
  return null;
}

/** True if this make matches one of the top-30 list entries (flexible for VIN strings). */
export function isUsTopMakeName(name: string): boolean {
  return resolveToTopMake(name) != null;
}
