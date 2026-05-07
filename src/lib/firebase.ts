import { Capacitor } from "@capacitor/core";
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize only if we have required config (so app runs without .env in dev)
const hasConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain;

const app = hasConfig ? initializeApp(firebaseConfig) : null;

function initAuthForCurrentPlatform() {
  if (!app) return null;

  // Capacitor iOS/Android WebView: `getAuth` + `setPersistence` bazı ortamlarda auth isteklerinin
  // takılmasına yol açabiliyor. `initializeAuth` ile persistence'ı baştan seçmek daha güvenilir.
  if (Capacitor.isNativePlatform()) {
    try {
      return initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
      });
    } catch {
      // Eğer auth zaten initialize edilmişse (hot reload vb.) `getAuth` ile devam et.
      return getAuth(app);
    }
  }

  const a = getAuth(app);
  // Web: tarayıcıyı kapatıp açana kadar oturum sürsün (logout yapılana kadar).
  void setPersistence(a, browserLocalPersistence).catch(() => {
    // Kalıcılık ayarı başarısız olsa bile auth çalışmaya devam eder.
  });
  return a;
}

export const auth = initAuthForCurrentPlatform();
export const db = app ? getFirestore(app) : null;
export const storage = app && firebaseConfig.storageBucket ? getStorage(app) : null;

export const isFirebaseEnabled = (): boolean => !!app;
