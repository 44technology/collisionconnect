/**
 * Which request quote details the customer has unlocked ($4.99 paid).
 * When Firebase is enabled, also stored in Firestore (unlocks collection).
 */
import { isFirebaseEnabled } from "./firebase";
import { isUnlockedFromFirestore, setUnlockedInFirestore } from "./unlocksFirestore";

const STORAGE_KEY = "collision_unlocked_requests";

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function save(refIds: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(refIds));
  } catch (_) {}
}

export function isUnlocked(requestRefId: string): boolean {
  return load().includes(requestRefId);
}

/** Async: Firestore when enabled. Use in UI for accurate state. */
export async function isUnlockedAsync(requestRefId: string): Promise<boolean> {
  if (isFirebaseEnabled()) {
    const fromFirestore = await isUnlockedFromFirestore(requestRefId);
    if (fromFirestore) return true;
  }
  return isUnlocked(requestRefId);
}

export function setUnlocked(requestRefId: string): void {
  const list = load();
  if (list.includes(requestRefId)) return;
  list.push(requestRefId);
  save(list);
}

/** Async: writes to Firestore when enabled and localStorage. Use after payment. */
export async function setUnlockedAsync(requestRefId: string): Promise<void> {
  if (isFirebaseEnabled()) await setUnlockedInFirestore(requestRefId);
  setUnlocked(requestRefId);
}
