/**
 * Which quote IDs the admin has shared with the customer (per request).
 * When Firebase is enabled, stored in Firestore (requestMeta collection).
 */
import { isFirebaseEnabled } from "./firebase";
import {
  getVisibleQuoteIdsFromFirestore,
  setVisibleQuoteIdsInFirestore,
} from "./requestMetaFirestore";

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

/** Async: Firestore when enabled. Use in UI. */
export async function getVisibleQuoteIdsAsync(requestRefId: string): Promise<string[]> {
  if (isFirebaseEnabled()) {
    const ids = await getVisibleQuoteIdsFromFirestore(requestRefId);
    if (ids.length > 0) return ids;
  }
  return getVisibleQuoteIds(requestRefId);
}

export function setVisibleQuoteIds(requestRefId: string, quoteIds: string[]): void {
  const data = load();
  data[requestRefId] = quoteIds;
  save(data);
}

/** Async: writes to Firestore when enabled and localStorage. Use in UI. */
export async function setVisibleQuoteIdsAsync(requestRefId: string, quoteIds: string[]): Promise<void> {
  if (isFirebaseEnabled()) await setVisibleQuoteIdsInFirestore(requestRefId, quoteIds);
  setVisibleQuoteIds(requestRefId, quoteIds);
}
