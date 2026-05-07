/**
 * Body shop quotes per request (by refId).
 * Customer sees price + time first; full shop details after unlock ($4.99).
 * When Firebase is enabled, data is stored in Firestore and read from there.
 */
import { isFirebaseEnabled } from "./firebase";
import { addQuoteToFirestore, getQuotesByRequestRefIdFromFirestore } from "./quotesFirestore";

export type BodyShopQuote = {
  id: string;
  requestRefId: string;
  shopName: string;
  /** Contact person name – shown to customer after $4.99 unlock */
  contactPerson?: string;
  address: string;
  email: string;
  phone: string;
  price: number;
  estimatedCompletion: string;
  createdAt: string;
};

const STORAGE_KEY = "collision_quotes";

function load(): BodyShopQuote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function save(quotes: BodyShopQuote[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  } catch (_) {}
}

function nextId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Sync: localStorage only. Prefer addQuoteAsync when Firebase enabled. */
export function addQuote(
  requestRefId: string,
  data: Omit<BodyShopQuote, "id" | "requestRefId" | "createdAt">
): BodyShopQuote {
  const quote: BodyShopQuote = {
    ...data,
    id: nextId(),
    requestRefId,
    createdAt: new Date().toISOString(),
  };
  const list = load();
  list.push(quote);
  save(list);
  return quote;
}

/** Async: Firestore when enabled, else localStorage. Use this in UI. */
export async function addQuoteAsync(
  requestRefId: string,
  data: Omit<BodyShopQuote, "id" | "requestRefId" | "createdAt">
): Promise<BodyShopQuote> {
  if (isFirebaseEnabled()) {
    const created = await addQuoteToFirestore(requestRefId, data);
    const list = load();
    list.push(created);
    save(list);
    return created;
  }
  const quote = addQuote(requestRefId, data);
  return quote;
}

/** Sync: localStorage only. */
export function getQuotesByRequestRefId(requestRefId: string): BodyShopQuote[] {
  const list = load().filter((q) => q.requestRefId === requestRefId);
  return list.sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price;
    return (a.estimatedCompletion || "").localeCompare(b.estimatedCompletion || "");
  });
}

function mergeQuotesDedupe(a: BodyShopQuote[], b: BodyShopQuote[]): BodyShopQuote[] {
  const map = new Map<string, BodyShopQuote>();
  for (const q of a) map.set(q.id, q);
  for (const q of b) {
    if (!map.has(q.id)) map.set(q.id, q);
  }
  return Array.from(map.values()).sort((x, y) => {
    if (x.price !== y.price) return x.price - y.price;
    return (x.estimatedCompletion || "").localeCompare(y.estimatedCompletion || "");
  });
}

/**
 * Firestore açıkken kaynak olarak Firestore kullanılır (tüm cihazlarda aynı veri).
 * Önceki hata: Firestore boşken localStorage'a düşülüyordu — sadece geliştirici makinesinde
 * görünen “hayalet” teklifler oluşuyordu.
 * DEV: Firestore + tarayıcı localStorage birleştirilir (yalnızca geliştirme kolaylığı).
 */
export async function getQuotesByRequestRefIdAsync(requestRefId: string): Promise<BodyShopQuote[]> {
  if (isFirebaseEnabled()) {
    const fromFirestore = await getQuotesByRequestRefIdFromFirestore(requestRefId);
    if (import.meta.env.DEV) {
      const local = getQuotesByRequestRefId(requestRefId);
      return mergeQuotesDedupe(fromFirestore, local);
    }
    return fromFirestore;
  }
  return getQuotesByRequestRefId(requestRefId);
}
