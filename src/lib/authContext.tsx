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
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_COLLECTION = "users";

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
        const ref = doc(db, USERS_COLLECTION, fbUser.uid);
        const snap = await getDoc(ref);
        const profile = snap.exists() ? (snap.data() as UserProfile) : null;
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
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const ref = doc(db, USERS_COLLECTION, cred.user.uid);
      const snap = await getDoc(ref);
      const profile = snap.exists() ? (snap.data() as UserProfile) : null;
      const state = profileToAuthState(cred.user.uid, profile);
      setUser(state);
      return state;
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
      const profile: UserProfile = {
        userType: "customer",
        displayName: name.trim(),
        email: email.trim(),
        phone: phone?.trim(),
      };
      await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), profile);
      setUser(profileToAuthState(cred.user.uid, profile));
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
    }) => {
      if (!auth || !db) throw new Error("Firebase is not configured");
      const { email, password, shopName, ownerName, phone, address, city, state } = params;
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
      await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), profile);
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
