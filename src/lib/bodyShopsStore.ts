/**
 * Admin-managed list of body shops we work with.
 * When Firebase is enabled, stored in Firestore (bodyShops collection).
 */
import { isFirebaseEnabled } from "./firebase";
import {
  getAllBodyShopsFromFirestore,
  addBodyShopToFirestore,
  updateBodyShopInFirestore,
  deleteBodyShopFromFirestore,
} from "./bodyShopsFirestore";

export type AdminBodyShop = {
  id: string;
  name: string;
  whatsappPhone: string;
  /** Shop's ZIP code – only send quote link to shops near request's zip. Empty = all requests. */
  zipCode?: string;
  /** Full address (e.g. from directory/API). */
  address?: string;
  /** Contact email. */
  email?: string;
  /** Preferred channel for future jobs (set once when first sending quote link). */
  preferredChannel?: "whatsapp" | "sms" | "email";
  createdAt: string;
};

const STORAGE_KEY = "collision_admin_body_shops";

function load(): AdminBodyShop[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function save(items: AdminBodyShop[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (_) {}
}

function nextId(): string {
  return `bs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalize phone for wa.me: digits only, up to 12 chars */
export function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 12);
}

const ZIP_NORMALIZE = (z: string) => z.replace(/\D/g, "").slice(0, 5);

/** Same zip or same first 3 digits (same area) = near */
export function isNearZip(requestZip: string, shopZip: string): boolean {
  const r = ZIP_NORMALIZE(requestZip);
  const s = ZIP_NORMALIZE(shopZip);
  if (!r || !s) return true;
  if (r === s) return true;
  if (r.length >= 3 && s.length >= 3 && r.slice(0, 3) === s.slice(0, 3)) return true;
  return false;
}

export function getAllBodyShops(): AdminBodyShop[] {
  return load();
}

/** Async: Firestore when enabled. Use in UI. */
export async function getAllBodyShopsAsync(): Promise<AdminBodyShop[]> {
  if (isFirebaseEnabled()) {
    const fromFirestore = await getAllBodyShopsFromFirestore();
    if (fromFirestore.length > 0) return fromFirestore;
  }
  return getAllBodyShops();
}

/** Body shops near request zip. Use getBodyShopsNearZipAsync when Firebase enabled. */
export function getBodyShopsNearZip(requestZip: string): AdminBodyShop[] {
  return load().filter((s) => {
    const sz = (s.zipCode ?? "").trim();
    if (!sz) return true;
    return isNearZip(requestZip, sz);
  });
}

/** Async: from Firestore when enabled, then filter by zip. */
export async function getBodyShopsNearZipAsync(requestZip: string): Promise<AdminBodyShop[]> {
  const all = await getAllBodyShopsAsync();
  return all.filter((s) => {
    const sz = (s.zipCode ?? "").trim();
    if (!sz) return true;
    return isNearZip(requestZip, sz);
  });
}

export function addBodyShop(data: {
  name: string;
  whatsappPhone: string;
  zipCode?: string;
  address?: string;
  email?: string;
  preferredChannel?: "whatsapp" | "sms" | "email";
}): AdminBodyShop {
  const item: AdminBodyShop = {
    id: nextId(),
    name: data.name.trim(),
    whatsappPhone: normalizeWhatsAppPhone(data.whatsappPhone),
    zipCode: (data.zipCode ?? "").trim().replace(/\D/g, "").slice(0, 5) || undefined,
    address: (data.address ?? "").trim() || undefined,
    email: (data.email ?? "").trim() || undefined,
    preferredChannel: data.preferredChannel,
    createdAt: new Date().toISOString(),
  };
  const list = load();
  list.push(item);
  save(list);
  return item;
}

/** Async: Firestore when enabled. Use in UI. */
export async function addBodyShopAsync(data: {
  name: string;
  whatsappPhone: string;
  zipCode?: string;
  address?: string;
  email?: string;
  preferredChannel?: "whatsapp" | "sms" | "email";
}): Promise<AdminBodyShop> {
  if (isFirebaseEnabled()) {
    const created = await addBodyShopToFirestore(data);
    const list = load();
    list.push(created);
    save(list);
    return created;
  }
  return addBodyShop(data);
}

export function updateBodyShop(
  id: string,
  data: {
    name?: string;
    whatsappPhone?: string;
    zipCode?: string;
    address?: string;
    email?: string;
    preferredChannel?: "whatsapp" | "sms" | "email" | null;
  }
): AdminBodyShop | null {
  const list = load();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  if (data.name !== undefined) list[idx].name = data.name.trim();
  if (data.whatsappPhone !== undefined) list[idx].whatsappPhone = normalizeWhatsAppPhone(data.whatsappPhone);
  if (data.zipCode !== undefined) {
    const z = (data.zipCode ?? "").trim().replace(/\D/g, "").slice(0, 5);
    list[idx].zipCode = z || undefined;
  }
  if (data.address !== undefined) list[idx].address = (data.address ?? "").trim() || undefined;
  if (data.email !== undefined) list[idx].email = (data.email ?? "").trim() || undefined;
  if (data.preferredChannel !== undefined) {
    list[idx].preferredChannel = data.preferredChannel ?? undefined;
  }
  save(list);
  return list[idx];
}

/** Async: Firestore when enabled. */
export async function updateBodyShopAsync(
  id: string,
  data: {
    name?: string;
    whatsappPhone?: string;
    zipCode?: string;
    address?: string;
    email?: string;
    preferredChannel?: "whatsapp" | "sms" | "email" | null;
  }
): Promise<AdminBodyShop | null> {
  if (isFirebaseEnabled()) {
    const updated = await updateBodyShopInFirestore(id, data);
    if (updated) {
      const list = load();
      const idx = list.findIndex((x) => x.id === id);
      if (idx !== -1) list[idx] = updated;
      save(list);
    }
    return updated;
  }
  return updateBodyShop(id, data);
}

export function deleteBodyShop(id: string): boolean {
  const list = load().filter((x) => x.id !== id);
  if (list.length === load().length) return false;
  save(list);
  return true;
}

/** Async: Firestore when enabled. */
export async function deleteBodyShopAsync(id: string): Promise<boolean> {
  if (isFirebaseEnabled()) await deleteBodyShopFromFirestore(id);
  return deleteBodyShop(id);
}
