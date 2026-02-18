/**
 * Admin-managed list of body shops we work with.
 * Each has a name and WhatsApp phone number.
 */

export type AdminBodyShop = {
  id: string;
  name: string;
  whatsappPhone: string;
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

export function getAllBodyShops(): AdminBodyShop[] {
  return load();
}

export function addBodyShop(data: { name: string; whatsappPhone: string }): AdminBodyShop {
  const item: AdminBodyShop = {
    id: nextId(),
    name: data.name.trim(),
    whatsappPhone: normalizeWhatsAppPhone(data.whatsappPhone),
    createdAt: new Date().toISOString(),
  };
  const list = load();
  list.push(item);
  save(list);
  return item;
}

export function updateBodyShop(id: string, data: { name?: string; whatsappPhone?: string }): AdminBodyShop | null {
  const list = load();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  if (data.name !== undefined) list[idx].name = data.name.trim();
  if (data.whatsappPhone !== undefined) list[idx].whatsappPhone = normalizeWhatsAppPhone(data.whatsappPhone);
  save(list);
  return list[idx];
}

export function deleteBodyShop(id: string): boolean {
  const list = load().filter((x) => x.id !== id);
  if (list.length === load().length) return false;
  save(list);
  return true;
}
