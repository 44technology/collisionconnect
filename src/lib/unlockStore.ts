/**
 * Which request quote details the customer has unlocked ($4.99 paid).
 */

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

export function setUnlocked(requestRefId: string): void {
  const list = load();
  if (list.includes(requestRefId)) return;
  list.push(requestRefId);
  save(list);
}
