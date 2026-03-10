import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseEnabled } from "./firebase";
import type { ShopPreferences } from "./shopPreferences";

export type UserType = "customer" | "shop" | "admin";

export type AuthState = { userType: UserType; name?: string; uid?: string } | null;

const STORAGE_KEY = "collision_collect_user";

export type UserProfile = {
  userType: UserType;
  displayName?: string;
  email?: string;
  shopName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
};

type AuthContextValue = {
  user: AuthState;
  loading: boolean;
  /** Email/password ile giriş (Firebase açıksa). Giriş sayfaları yönlendirme için userType döner. */
  loginWithEmailAndPassword: (email: string, password: string) => Promise<AuthState>;
  /** Eski mock API – Firebase kapalıysa kullanılır: login("customer", "John") */
  login: (userType: UserType, name?: string) => void;
  logout: () => void;
  isAdmin: boolean;
  /** Müşteri kaydı (Firebase). */
  registerCustomer: (params: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  /** Body shop kaydı (Firebase). */
  registerShop: (params: {
    email: string;
    password: string;
    shopName: string;
    ownerName: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    preferences?: ShopPreferences;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_COLLECTION = "users";
const CUSTOMERS_COLLECTION = "customers";
const ADMIN_COLLECTION = "admin";

function profileToAuthState(uid: string, p: UserProfile | null): AuthState {
  if (!p?.userType) return null;
  return {
    uid,
    userType: p.userType,
    name: p.displayName ?? p.shopName ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState>(() => {
    if (isFirebaseEnabled()) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthState;
        if (parsed?.userType) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Firebase: auth state + Firestore profile
  useEffect(() => {
    if (!isFirebaseEnabled() || !auth || !db) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        const userType = userData?.userType as UserProfile["userType"] | undefined;
        let profile: UserProfile | null = userData ? { ...userData, userType } as UserProfile : null;
        if (profile?.userType === "customer") {
          const custSnap = await getDoc(doc(db, CUSTOMERS_COLLECTION, fbUser.uid));
          if (custSnap.exists()) {
            const d = custSnap.data();
            profile = { ...profile, displayName: d.displayName ?? profile.displayName, email: d.email ?? profile.email, phone: d.phone ?? profile.phone };
          }
        } else if (profile?.userType === "admin") {
          const adminSnap = await getDoc(doc(db, ADMIN_COLLECTION, fbUser.uid));
          if (adminSnap.exists()) {
            const d = adminSnap.data();
            profile = { ...profile, displayName: d.displayName ?? profile.displayName, email: d.email ?? profile.email };
          }
        }
        setUser(profileToAuthState(fbUser.uid, profile));
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Mock: localStorage senkron
  useEffect(() => {
    if (isFirebaseEnabled()) return;
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const loginWithEmailAndPassword = useCallback(
    async (email: string, password: string): Promise<AuthState> => {
      if (!auth || !db) throw new Error("Firebase is not configured");
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const userRef = doc(db, USERS_COLLECTION, cred.user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        const userType = userData?.userType as UserProfile["userType"] | undefined;
        let profile: UserProfile | null = userData ? { ...userData, userType } as UserProfile : null;
        if (profile?.userType === "customer") {
          const custSnap = await getDoc(doc(db, CUSTOMERS_COLLECTION, cred.user.uid));
          if (custSnap.exists()) {
            const d = custSnap.data();
            profile = { ...profile, displayName: d.displayName ?? profile.displayName, email: d.email ?? profile.email, phone: d.phone ?? profile.phone };
          }
        } else if (profile?.userType === "admin") {
          const adminSnap = await getDoc(doc(db, ADMIN_COLLECTION, cred.user.uid));
          if (adminSnap.exists()) {
            const d = adminSnap.data();
            profile = { ...profile, displayName: d.displayName ?? profile.displayName, email: d.email ?? profile.email };
          }
        }
        const state = profileToAuthState(cred.user.uid, profile);
        setUser(state);
        return state;
      } catch (err: unknown) {
        const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
        if (
          code === "auth/invalid-credential" ||
          code === "auth/user-not-found" ||
          code === "auth/wrong-password" ||
          code === "auth/invalid-email"
        ) {
          throw new Error("invalidEmailOrPassword");
        }
        if (code === "auth/user-disabled") {
          throw new Error("userDisabled");
        }
        if (code === "auth/too-many-requests") {
          throw new Error("tooManyAttempts");
        }
        throw err;
      }
    },
    []
  );

  const login = useCallback((userType: UserType, name?: string) => {
    setUser({ userType, name });
  }, []);

  const logout = useCallback(async () => {
    if (isFirebaseEnabled() && auth) {
      await signOut(auth);
    }
    setUser(null);
  }, []);

  const registerCustomer = useCallback(
    async (params: { email: string; password: string; name: string; phone?: string }) => {
      if (!auth || !db) throw new Error("Firebase is not configured");
      const { email, password, name, phone } = params;
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      await setDoc(doc(db, USERS_COLLECTION, uid), { userType: "customer", email: email.trim() });
      await setDoc(doc(db, CUSTOMERS_COLLECTION, uid), {
        displayName: name.trim(),
        email: email.trim(),
        phone: phone?.trim() ?? null,
        createdAt: new Date().toISOString(),
      });
      setUser(profileToAuthState(uid, { userType: "customer", displayName: name.trim(), email: email.trim(), phone: phone?.trim() }));
    },
    []
  );

  const registerShop = useCallback(
    async (params: {
      email: string;
      password: string;
      shopName: string;
      ownerName: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      preferences?: ShopPreferences;
    }) => {
      if (!auth || !db) throw new Error("Firebase is not configured");
      const { email, password, shopName, ownerName, phone, address, city, state, preferences } = params;
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const profile: UserProfile = {
        userType: "shop",
        displayName: ownerName.trim(),
        shopName: shopName.trim(),
        email: email.trim(),
        phone: phone?.trim(),
        address: address?.trim(),
        city: city?.trim(),
        state: state?.trim(),
      };
      const docData: Record<string, unknown> = { ...profile };
      if (preferences && Array.isArray(preferences.serviceTypes) && Array.isArray(preferences.languagesSpoken)) {
        docData.preferences = {
          serviceTypes: preferences.serviceTypes,
          languagesSpoken: preferences.languagesSpoken,
          acceptInsurance: preferences.acceptInsurance !== false,
          notes: preferences.notes ?? "",
        };
      }
      await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), docData);
      setUser(profileToAuthState(cred.user.uid, profile));
    },
    []
  );

  const isAdmin = user?.userType === "admin";

  const value: AuthContextValue = {
    user,
    loading,
    loginWithEmailAndPassword,
    login,
    logout,
    isAdmin,
    registerCustomer,
    registerShop,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
