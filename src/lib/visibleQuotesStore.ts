/**
 * Which quote IDs the admin has shared with the customer (per request).
 * Customer only sees these quotes; full details (shop name, contact, etc.) after $4.99 unlock.
 */

const STORAGE_KEY = "collision_visible_quote_ids";

function load(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

function save(data: Record<string, string[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

export function getVisibleQuoteIds(requestRefId: string): string[] {
  return load()[requestRefId] ?? [];
}

export function setVisibleQuoteIds(requestRefId: string, quoteIds: string[]): void {
  const data = load();
  data[requestRefId] = quoteIds;
  save(data);
}
