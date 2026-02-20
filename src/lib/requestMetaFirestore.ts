/**
 * Firestore: which quote IDs are visible to customer per request (admin choice).
 */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseEnabled } from "./firebase";

const COLLECTION = "requestMeta";

export async function getVisibleQuoteIdsFromFirestore(requestRefId: string): Promise<string[]> {
  if (!isFirebaseEnabled() || !db) return [];
  try {
    const snap = await getDoc(doc(db, COLLECTION, requestRefId));
    const data = snap.data();
    const ids = data?.visibleQuoteIds;
    return Array.isArray(ids) ? ids : [];
  } catch (e) {
    console.warn("getVisibleQuoteIds Firestore", e);
    return [];
  }
}

export async function setVisibleQuoteIdsInFirestore(requestRefId: string, quoteIds: string[]): Promise<void> {
  if (!isFirebaseEnabled() || !db) return;
  try {
    await setDoc(doc(db, COLLECTION, requestRefId), { visibleQuoteIds: quoteIds }, { merge: true });
  } catch (e) {
    console.warn("setVisibleQuoteIds Firestore", e);
  }
}
