/**
 * Firestore persistence for body shop quotes.
 */
import { collection, getDoc, getDocs, addDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseEnabled } from "./firebase";
import type { BodyShopQuote } from "./quotesStore";

const COLLECTION = "quote";

function toQuote(id: string, data: Record<string, unknown>): BodyShopQuote {
  return {
    id,
    requestRefId: String(data.requestRefId ?? ""),
    shopName: String(data.shopName ?? ""),
    contactPerson: data.contactPerson != null ? String(data.contactPerson) : undefined,
    address: String(data.address ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    price: Number(data.price ?? 0),
    estimatedCompletion: String(data.estimatedCompletion ?? ""),
    createdAt:
      data.createdAt instanceof Date
        ? data.createdAt.toISOString()
        : typeof data.createdAt === "string"
          ? data.createdAt
          : String(data.createdAt ?? ""),
  };
}

export async function addQuoteToFirestore(
  requestRefId: string,
  data: Omit<BodyShopQuote, "id" | "requestRefId" | "createdAt">
): Promise<BodyShopQuote> {
  if (!isFirebaseEnabled() || !db) throw new Error("Firebase not enabled");
  const col = collection(db, COLLECTION);
  const ref = await addDoc(col, {
    ...data,
    requestRefId,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  const created = snap.exists() ? toQuote(snap.id, { ...snap.data(), createdAt: snap.data()?.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString() }) : null;
  if (!created) throw new Error("Quote not found after add");
  return created;
}

export async function getQuotesByRequestRefIdFromFirestore(requestRefId: string): Promise<BodyShopQuote[]> {
  if (!isFirebaseEnabled() || !db) return [];
  try {
    const col = collection(db, COLLECTION);
    const q = query(col, where("requestRefId", "==", requestRefId));
    const snap = await getDocs(q);
    const list: BodyShopQuote[] = [];
    snap.docs.forEach((d) => {
      const raw = d.data();
      list.push(toQuote(d.id, { ...raw, createdAt: raw.createdAt?.toDate?.()?.toISOString?.() ?? raw.createdAt }));
    });
    list.sort((a, b) => {
      if (a.price !== b.price) return a.price - b.price;
      return (a.estimatedCompletion || "").localeCompare(b.estimatedCompletion || "");
    });
    return list;
  } catch (e) {
    console.warn("getQuotesByRequestRefId Firestore", e);
    return [];
  }
}
