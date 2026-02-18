/**
 * Firestore persistence for submitted requests so quote links work from any device.
 */
import { doc, getDoc, setDoc } from "firebase/firestore";
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
