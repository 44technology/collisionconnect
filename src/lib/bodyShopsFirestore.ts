/**
 * Firestore persistence for admin body shops list.
 */
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseEnabled } from "./firebase";
import type { AdminBodyShop } from "./bodyShopsStore";

const COLLECTION = "bodyshop";

function toItem(id: string, data: Record<string, unknown>): AdminBodyShop {
  return {
    id,
    name: String(data.name ?? ""),
    whatsappPhone: String(data.whatsappPhone ?? ""),
    zipCode: data.zipCode != null && data.zipCode !== "" ? String(data.zipCode) : undefined,
    address: data.address != null && data.address !== "" ? String(data.address) : undefined,
    email: data.email != null && data.email !== "" ? String(data.email) : undefined,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? String(data.createdAt ?? ""),
  };
}

export async function getAllBodyShopsFromFirestore(): Promise<AdminBodyShop[]> {
  if (!isFirebaseEnabled() || !db) return [];
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    const list = snap.docs.map((d) => toItem(d.id, d.data()));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return list;
  } catch (e) {
    console.warn("getAllBodyShops Firestore", e);
    return [];
  }
}

export async function addBodyShopToFirestore(data: {
  name: string;
  whatsappPhone: string;
  zipCode?: string;
  address?: string;
  email?: string;
}): Promise<AdminBodyShop> {
  if (!isFirebaseEnabled() || !db) throw new Error("Firebase not enabled");
  const ref = await addDoc(collection(db, COLLECTION), {
    name: data.name.trim(),
    whatsappPhone: data.whatsappPhone.replace(/\D/g, "").slice(0, 12),
    zipCode: (data.zipCode ?? "").trim().replace(/\D/g, "").slice(0, 5) || null,
    address: (data.address ?? "").trim() || null,
    email: (data.email ?? "").trim() || null,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Body shop not found after add");
  return toItem(snap.id, snap.data());
}

export async function updateBodyShopInFirestore(
  id: string,
  data: { name?: string; whatsappPhone?: string; zipCode?: string; address?: string; email?: string }
): Promise<AdminBodyShop | null> {
  if (!isFirebaseEnabled() || !db) return null;
  try {
    const ref = doc(db, COLLECTION, id);
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.whatsappPhone !== undefined) updates.whatsappPhone = data.whatsappPhone.replace(/\D/g, "").slice(0, 12);
    if (data.zipCode !== undefined) {
      const z = (data.zipCode ?? "").trim().replace(/\D/g, "").slice(0, 5);
      updates.zipCode = z || null;
    }
    if (data.address !== undefined) updates.address = (data.address ?? "").trim() || null;
    if (data.email !== undefined) updates.email = (data.email ?? "").trim() || null;
    await updateDoc(ref, updates);
    const snap = await getDoc(ref);
    return snap.exists() ? toItem(snap.id, snap.data()) : null;
  } catch (e) {
    console.warn("updateBodyShop Firestore", e);
    return null;
  }
}

export async function deleteBodyShopFromFirestore(id: string): Promise<boolean> {
  if (!isFirebaseEnabled() || !db) return false;
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    return true;
  } catch (e) {
    console.warn("deleteBodyShop Firestore", e);
    return false;
  }
}
