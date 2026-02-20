/**
 * Firestore: which requests have been unlocked ($4.99 paid).
 */
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseEnabled } from "./firebase";

const COLLECTION = "unlocks";

export async function isUnlockedFromFirestore(requestRefId: string): Promise<boolean> {
  if (!isFirebaseEnabled() || !db) return false;
  try {
    const snap = await getDoc(doc(db, COLLECTION, requestRefId));
    return snap.exists() && !!snap.data()?.unlocked;
  } catch (e) {
    console.warn("isUnlocked Firestore", e);
    return false;
  }
}

export async function setUnlockedInFirestore(requestRefId: string): Promise<void> {
  if (!isFirebaseEnabled() || !db) return;
  try {
    await setDoc(
      doc(db, COLLECTION, requestRefId),
      { unlocked: true, paidAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn("setUnlocked Firestore", e);
  }
}
