/**
 * Body shop quotes per request (by refId).
 * Customer sees price + time first; full shop details after unlock ($4.99).
 */

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

export function getQuotesByRequestRefId(requestRefId: string): BodyShopQuote[] {
  const list = load().filter((q) => q.requestRefId === requestRefId);
  // Sort by urgency: price ascending, then by estimated completion (earlier first if parseable)
  return list.sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price;
    return (a.estimatedCompletion || "").localeCompare(b.estimatedCompletion || "");
  });
}
