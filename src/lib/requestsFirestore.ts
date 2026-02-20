/**
 * Firestore persistence for submitted requests so quote links work from any device.
 */
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, isFirebaseEnabled } from "./firebase";
import type { SubmittedRequest } from "./submittedRequestsStore";

const COLLECTION = "requests";

export async function saveRequestToFirestore(request: SubmittedRequest): Promise<void> {
  if (!isFirebaseEnabled() || !db) return;
  try {
    await setDoc(doc(db, COLLECTION, request.refId), request);
  } catch (e) {
    console.warn("Failed to save request to Firestore", e);
  }
}

const FETCH_TIMEOUT_MS = 8000;

export async function getRequestFromFirestore(refId: string): Promise<SubmittedRequest | null> {
  if (!isFirebaseEnabled() || !db) return null;
  try {
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), FETCH_TIMEOUT_MS)
    );
    const snap = await Promise.race([
      getDoc(doc(db, COLLECTION, refId)),
      timeoutPromise,
    ]);
    if (snap && typeof snap === "object" && "exists" in snap && snap.exists()) {
      return snap.data() as SubmittedRequest;
    }
  } catch (e) {
    console.warn("Failed to get request from Firestore", e);
  }
  return null;
}

/** List all submitted requests (newest first). For admin dashboard. */
export async function getAllRequestsFromFirestore(): Promise<SubmittedRequest[]> {
  if (!isFirebaseEnabled() || !db) return [];
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    const list = snap.docs.map((d) => d.data() as SubmittedRequest);
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return list;
  } catch (e) {
    console.warn("Failed to list requests from Firestore", e);
    return [];
  }
}
