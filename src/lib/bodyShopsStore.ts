/**
 * Admin-managed list of body shops we work with.
 * Each has name, WhatsApp phone, and zipCode (for filtering by request location).
 */

export type AdminBodyShop = {
  id: string;
  name: string;
  whatsappPhone: string;
  /** Shop's ZIP code – only send quote link to shops near request's zip. Empty = all requests. */
  zipCode?: string;
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

/** Body shops near request zip (for sending quote link). Empty shop zip = show for all. */
export function getBodyShopsNearZip(requestZip: string): AdminBodyShop[] {
  return load().filter((s) => {
    const sz = (s.zipCode ?? "").trim();
    if (!sz) return true;
    return isNearZip(requestZip, sz);
  });
}

export function addBodyShop(data: { name: string; whatsappPhone: string; zipCode?: string }): AdminBodyShop {
  const item: AdminBodyShop = {
    id: nextId(),
    name: data.name.trim(),
    whatsappPhone: normalizeWhatsAppPhone(data.whatsappPhone),
    zipCode: (data.zipCode ?? "").trim().replace(/\D/g, "").slice(0, 5) || undefined,
    createdAt: new Date().toISOString(),
  };
  const list = load();
  list.push(item);
  save(list);
  return item;
}

export function updateBodyShop(id: string, data: { name?: string; whatsappPhone?: string; zipCode?: string }): AdminBodyShop | null {
  const list = load();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  if (data.name !== undefined) list[idx].name = data.name.trim();
  if (data.whatsappPhone !== undefined) list[idx].whatsappPhone = normalizeWhatsAppPhone(data.whatsappPhone);
  if (data.zipCode !== undefined) {
    const z = (data.zipCode ?? "").trim().replace(/\D/g, "").slice(0, 5);
    list[idx].zipCode = z || undefined;
  }
  save(list);
  return list[idx];
}

export function deleteBodyShop(id: string): boolean {
  const list = load().filter((x) => x.id !== id);
  if (list.length === load().length) return false;
  save(list);
  return true;
}
