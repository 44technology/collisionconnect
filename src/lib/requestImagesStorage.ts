/**
 * Upload request photos to Firebase Storage; return public URLs for Firestore.
 */
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, isFirebaseEnabled } from "./firebase";

export type ImageWithLabel = { file: File; label: string };

export async function uploadRequestImages(
  requestRefId: string,
  images: ImageWithLabel[]
): Promise<{ urls: string[]; labels: string[] }> {
  if (!isFirebaseEnabled() || !storage || images.length === 0) {
    return { urls: [], labels: [] };
  }
  const urls: string[] = [];
  const labels: string[] = [];
  const basePath = `requests/${requestRefId}`;

  for (let i = 0; i < images.length; i++) {
    const { file, label } = images[i];
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = `${i}_${Date.now()}.${ext}`;
    const path = `${basePath}/${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
    labels.push(label || `Photo ${i + 1}`);
  }

  return { urls, labels };
}
