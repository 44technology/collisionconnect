/**
 * Body shop preferences – stored in Firestore users/{uid}.preferences
 */
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, isFirebaseEnabled } from "./firebase";

const USERS_COLLECTION = "users";

export type ShopPreferences = {
  /** e.g. collision, paint, frame, glass, detailing */
  serviceTypes: string[];
  /** e.g. en, es */
  languagesSpoken: string[];
  acceptInsurance: boolean;
  /** Optional notes (e.g. "We specialize in luxury vehicles") */
  notes?: string;
};

export const DEFAULT_SHOP_PREFERENCES: ShopPreferences = {
  serviceTypes: [],
  languagesSpoken: [],
  acceptInsurance: true,
  notes: "",
};

export const SERVICE_TYPE_KEYS = ["collision", "paint", "frame", "glass", "detailing"] as const;
export const LANGUAGE_KEYS = ["en", "es"] as const;

export async function getShopPreferences(uid: string): Promise<ShopPreferences | null> {
  if (!isFirebaseEnabled() || !db) return null;
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  const data = snap.data();
  const prefs = data?.preferences;
  if (!prefs || typeof prefs !== "object") return null;
  return {
    serviceTypes: Array.isArray(prefs.serviceTypes) ? prefs.serviceTypes : [],
    languagesSpoken: Array.isArray(prefs.languagesSpoken) ? prefs.languagesSpoken : [],
    acceptInsurance: prefs.acceptInsurance !== false,
    notes: typeof prefs.notes === "string" ? prefs.notes : "",
  };
}

export async function updateShopPreferences(uid: string, preferences: ShopPreferences): Promise<void> {
  if (!isFirebaseEnabled() || !db) throw new Error("Firebase is not configured");
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, {
    preferences: {
      serviceTypes: preferences.serviceTypes,
      languagesSpoken: preferences.languagesSpoken,
      acceptInsurance: preferences.acceptInsurance,
      notes: preferences.notes ?? "",
    },
  });
}
