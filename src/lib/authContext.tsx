import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updatePassword,
  deleteUser as firebaseDeleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
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
  /** Google ile (customer) giriş başlatır. */
  signInWithGoogle: () => Promise<void>;
  /** Apple ile (customer) giriş başlatır. */
  signInWithApple: () => Promise<void>;
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
  /** Email/şifre ile giriş yapanlar için (Firebase). OAuth hesaplarında false. */
  canChangePassword: boolean;
  /** Mevcut şifre + yeni şifre (önce reauthenticate). */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Oturumu yeniden doğrulayıp Auth + bilinen Firestore profil dokümanlarını siler. */
  deleteAccount: (params: { currentPassword?: string }) => Promise<void>;
  /** Kayıtlı e-postaya Firebase şifre sıfırlama bağlantısı gönderir (email/şifre hesapları). */
  sendPasswordResetForCurrentUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_COLLECTION = "users";
const CUSTOMERS_COLLECTION = "customers";
const ADMIN_COLLECTION = "admin";
const PROFILE_READ_TIMEOUT_MS = 8000;
const FIRESTORE_WRITE_TIMEOUT_MS = 10000;
const AUTH_SIGNIN_TIMEOUT_MS = 25000;

function timeoutAfter(ms: number, reason: string): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(reason)), ms);
  });
}

async function raceWithTimeout<T>(promise: Promise<T>, ms: number, reason: string): Promise<T> {
  return Promise.race([promise, timeoutAfter(ms, reason)]);
}

async function getDocWithTimeout<T>(promise: Promise<T>, reason: string): Promise<T> {
  return raceWithTimeout(promise, PROFILE_READ_TIMEOUT_MS, reason);
}

async function setDocWithTimeout(promise: Promise<void>, reason: string): Promise<void> {
  await raceWithTimeout(promise, FIRESTORE_WRITE_TIMEOUT_MS, reason);
}

function makeAuthError(code: string, message?: string): Error & { code: string } {
  const e = new Error(message ?? code) as Error & { code: string };
  e.code = code;
  return e;
}

function profileToAuthState(uid: string, p: UserProfile | null): AuthState {
  if (!p?.userType) return null;
  return {
    uid,
    userType: p.userType,
    name: p.displayName ?? p.shopName ?? undefined,
  };
}

function userHasPasswordProvider(fbUser: FirebaseUser | null): boolean {
  return !!fbUser?.providerData.some((p) => p.providerId === "password");
}

async function deleteProfileDocs(uid: string, userType: UserType): Promise<void> {
  if (!db) return;
  const refs = [doc(db, USERS_COLLECTION, uid)];
  if (userType === "customer") refs.push(doc(db, CUSTOMERS_COLLECTION, uid));
  if (userType === "admin") refs.push(doc(db, ADMIN_COLLECTION, uid));
  await Promise.allSettled(refs.map((r) => deleteDoc(r)));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [canChangePassword, setCanChangePassword] = useState(false);
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
    let gotAuthEvent = false;
    const fallbackTimer = window.setTimeout(() => {
      if (gotAuthEvent) return;
      // Hiç onAuthStateChanged gelmezse (nadir) loading'de kalmayı önle.
      // eslint-disable-next-line no-console
      console.error("AuthLoadingGuard fallback: onAuthStateChanged did not settle in time");
      setUser(null);
      setLoading(false);
    }, 10000);

    let unsub: (() => void) | undefined;
    try {
      unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        gotAuthEvent = true;
        window.clearTimeout(fallbackTimer);
      if (!fbUser) {
        setUser(null);
        setCanChangePassword(false);
        setLoading(false);
        return;
      }
      setCanChangePassword(userHasPasswordProvider(fbUser));
      try {
        const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
        const userSnap = await getDocWithTimeout(getDoc(userRef), "users/profile-timeout");
        const userData = userSnap.exists() ? userSnap.data() : null;
        const oauthProviders = fbUser.providerData.map((p) => p.providerId);
        const isOAuthCustomer = oauthProviders.includes("google.com") || oauthProviders.includes("apple.com");

        const userType = userData?.userType as UserProfile["userType"] | undefined;
        let profile: UserProfile | null = userData && userType ? { ...userData, userType } as UserProfile : null;

        if (profile?.userType === "customer") {
          const custSnap = await getDocWithTimeout(getDoc(doc(db, CUSTOMERS_COLLECTION, fbUser.uid)), "customers/profile-timeout");
          if (custSnap.exists()) {
            const d = custSnap.data();
            profile = { ...profile, displayName: d.displayName ?? profile.displayName, email: d.email ?? profile.email, phone: d.phone ?? profile.phone };
          }
        } else if (profile?.userType === "admin") {
          const adminSnap = await getDocWithTimeout(getDoc(doc(db, ADMIN_COLLECTION, fbUser.uid)), "admin/profile-timeout");
          if (adminSnap.exists()) {
            const d = adminSnap.data();
            profile = { ...profile, displayName: d.displayName ?? profile.displayName, email: d.email ?? profile.email };
          }
        } else if (!profile) {
          // Legacy hesaplarda users dokümanı olmayabiliyor; girişi bozmak yerine toparlıyoruz.
          const adminSnap = await getDocWithTimeout(getDoc(doc(db, ADMIN_COLLECTION, fbUser.uid)), "admin/recovery-timeout");
          if (adminSnap.exists()) {
            const d = adminSnap.data();
            profile = { userType: "admin", displayName: d.displayName, email: d.email ?? fbUser.email ?? undefined };
            try {
              await setDocWithTimeout(
                setDoc(doc(db, USERS_COLLECTION, fbUser.uid), { userType: "admin", email: profile.email ?? null }, { merge: true }),
                "users/admin-recovery-write-timeout"
              );
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error("users/admin recovery write failed:", e);
            }
          } else {
            const custSnap = await getDocWithTimeout(getDoc(doc(db, CUSTOMERS_COLLECTION, fbUser.uid)), "customers/recovery-timeout");
            if (custSnap.exists()) {
              const d = custSnap.data();
              profile = {
                userType: "customer",
                displayName: d.displayName ?? fbUser.displayName ?? "Customer",
                email: d.email ?? fbUser.email ?? undefined,
                phone: d.phone ?? null,
              };
              try {
                await setDocWithTimeout(
                  setDoc(doc(db, USERS_COLLECTION, fbUser.uid), { userType: "customer", email: profile.email ?? null }, { merge: true }),
                  "users/customer-recovery-write-timeout"
                );
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error("users/customer recovery write failed:", e);
              }
            } else if ((isOAuthCustomer || !!fbUser.email) && fbUser.email) {
              const displayName = fbUser.displayName ?? "Customer";
              const email = fbUser.email;
              profile = { userType: "customer", displayName, email, phone: null };
              try {
                await setDocWithTimeout(
                  setDoc(doc(db, USERS_COLLECTION, fbUser.uid), { userType: "customer", email }),
                  "users/oauth-bootstrap-write-timeout"
                );
                await setDocWithTimeout(
                  setDoc(doc(db, CUSTOMERS_COLLECTION, fbUser.uid), {
                    displayName,
                    email,
                    phone: null,
                    createdAt: new Date().toISOString(),
                  }),
                  "customers/oauth-bootstrap-write-timeout"
                );
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error("oauth customer bootstrap write failed:", e);
              }
            }
          }
        }
        setUser(profileToAuthState(fbUser.uid, profile));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Auth profile resolve error:", err);
        setUser(null);
        setCanChangePassword(false);
      } finally {
        setLoading(false);
      }
      });
    } catch (err) {
      window.clearTimeout(fallbackTimer);
      // eslint-disable-next-line no-console
      console.error("onAuthStateChanged init error:", err);
      setUser(null);
      setCanChangePassword(false);
      setLoading(false);
    }

    return () => {
      window.clearTimeout(fallbackTimer);
      if (unsub) unsub();
    };
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
        const cred = await raceWithTimeout(
          signInWithEmailAndPassword(auth, email.trim(), password),
          AUTH_SIGNIN_TIMEOUT_MS,
          "auth/signin-timeout"
        );
        const userRef = doc(db, USERS_COLLECTION, cred.user.uid);
        const userSnap = await getDocWithTimeout(getDoc(userRef), "users/login-timeout");
        const userData = userSnap.exists() ? userSnap.data() : null;
        const userType = userData?.userType as UserProfile["userType"] | undefined;
        // users dokümanı var ama userType yoksa (legacy veri), null kabul edip
        // aşağıdaki recovery akışlarının çalışmasına izin veriyoruz.
        let profile: UserProfile | null = userData && userType ? ({ ...userData, userType } as UserProfile) : null;
        if (profile?.userType === "customer") {
          const custSnap = await getDocWithTimeout(getDoc(doc(db, CUSTOMERS_COLLECTION, cred.user.uid)), "customers/login-timeout");
          if (custSnap.exists()) {
            const d = custSnap.data();
            profile = { ...profile, displayName: d.displayName ?? profile.displayName, email: d.email ?? profile.email, phone: d.phone ?? profile.phone };
          }
        } else if (profile?.userType === "admin") {
          const adminSnap = await getDocWithTimeout(getDoc(doc(db, ADMIN_COLLECTION, cred.user.uid)), "admin/login-timeout");
          if (adminSnap.exists()) {
            const d = adminSnap.data();
            profile = { ...profile, displayName: d.displayName ?? profile.displayName, email: d.email ?? profile.email };
          }
        } else if (!profile) {
          // users kaydı eksik hesaplarda email/password login sonrası profil kurtarma.
          const adminSnap = await getDocWithTimeout(getDoc(doc(db, ADMIN_COLLECTION, cred.user.uid)), "admin/login-recovery-timeout");
          if (adminSnap.exists()) {
            const d = adminSnap.data();
            profile = { userType: "admin", displayName: d.displayName, email: d.email ?? cred.user.email ?? undefined };
            try {
              await setDocWithTimeout(
                setDoc(doc(db, USERS_COLLECTION, cred.user.uid), { userType: "admin", email: profile.email ?? null }, { merge: true }),
                "users/admin-login-recovery-write-timeout"
              );
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error("users/admin login recovery write failed:", e);
            }
          } else {
            const custSnap = await getDocWithTimeout(getDoc(doc(db, CUSTOMERS_COLLECTION, cred.user.uid)), "customers/login-recovery-timeout");
            if (custSnap.exists()) {
              const d = custSnap.data();
              profile = {
                userType: "customer",
                displayName: d.displayName ?? cred.user.displayName ?? "Customer",
                email: d.email ?? cred.user.email ?? undefined,
                phone: d.phone ?? null,
              };
              try {
                await setDocWithTimeout(
                  setDoc(doc(db, USERS_COLLECTION, cred.user.uid), { userType: "customer", email: profile.email ?? null }, { merge: true }),
                  "users/customer-login-recovery-write-timeout"
                );
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error("users/customer login recovery write failed:", e);
              }
            } else if (cred.user.email) {
              const displayName = cred.user.displayName ?? "Customer";
              const email = cred.user.email;
              profile = { userType: "customer", displayName, email, phone: null };
              await setDocWithTimeout(
                setDoc(doc(db, USERS_COLLECTION, cred.user.uid), { userType: "customer", email }),
                "users/email-bootstrap-write-timeout"
              );
              await setDocWithTimeout(
                setDoc(doc(db, CUSTOMERS_COLLECTION, cred.user.uid), {
                  displayName,
                  email,
                  phone: null,
                  createdAt: new Date().toISOString(),
                }),
                "customers/email-bootstrap-write-timeout"
              );
            }
          }
        }
        const state = profileToAuthState(cred.user.uid, profile);
        setUser(state);
        return state;
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.error("loginWithEmailAndPassword error:", err);
        const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
        if (
          code === "auth/invalid-credential" ||
          code === "auth/user-not-found" ||
          code === "auth/wrong-password" ||
          code === "auth/invalid-email"
        ) {
          throw makeAuthError("invalidEmailOrPassword");
        }
        if (code === "auth/user-disabled") {
          throw makeAuthError("userDisabled");
        }
        if (code === "auth/too-many-requests") {
          throw makeAuthError("tooManyAttempts");
        }
        if (err instanceof Error && err.message.includes("signin-timeout")) {
          throw makeAuthError("authSignInTimeout");
        }
        if (err instanceof Error && (err.message.includes("write-timeout") || err.message.includes("bootstrap-write-timeout"))) {
          throw makeAuthError("profileWriteTimeout");
        }
        if (err instanceof Error && err.message.includes("timeout")) {
          throw makeAuthError("profileLoadTimeout");
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

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Firebase is not configured");
    const provider = new GoogleAuthProvider();
    // Popup, uzun formlu akışlarda (misafir talep) sayfa yenilemeden giriş için daha güvenli.
    await signInWithPopup(auth, provider);
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!auth) throw new Error("Firebase is not configured");
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    await signInWithPopup(auth, provider);
  }, []);

  const registerCustomer = useCallback(
    async (params: { email: string; password: string; name: string; phone?: string }) => {
      if (!auth || !db) throw new Error("Firebase is not configured");
      const { email, password, name, phone } = params;
      const cred = await raceWithTimeout(
        createUserWithEmailAndPassword(auth, email.trim(), password),
        AUTH_SIGNIN_TIMEOUT_MS,
        "auth/create-user-timeout"
      );
      const uid = cred.user.uid;
      await setDocWithTimeout(setDoc(doc(db, USERS_COLLECTION, uid), { userType: "customer", email: email.trim() }), "users/register-write-timeout");
      await setDocWithTimeout(
        setDoc(doc(db, CUSTOMERS_COLLECTION, uid), {
          displayName: name.trim(),
          email: email.trim(),
          phone: phone?.trim() ?? null,
          createdAt: new Date().toISOString(),
        }),
        "customers/register-write-timeout"
      );
      setUser(profileToAuthState(uid, { userType: "customer", displayName: name.trim(), email: email.trim(), phone: phone?.trim() }));
    },
    []
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!auth) throw new Error("Firebase is not configured");
    const u = auth.currentUser;
    if (!u?.email) throw makeAuthError("noEmailForPassword");
    if (!userHasPasswordProvider(u)) throw makeAuthError("passwordChangeOAuthOnly");
    try {
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await updatePassword(u, newPassword);
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
        throw makeAuthError("invalidEmailOrPassword");
      }
      if (code === "auth/weak-password") {
        throw makeAuthError("weakPasswordAuth");
      }
      if (code === "auth/requires-recent-login") {
        throw makeAuthError("requiresRecentLoginAuth");
      }
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(
    async (params: { currentPassword?: string }) => {
      if (!auth || !db) throw new Error("Firebase is not configured");
      const u = auth.currentUser;
      if (!u) throw makeAuthError("accountActionSignInRequired");
      const userType = user?.userType;
      if (!userType) throw makeAuthError("accountActionSignInRequired");
      const uid = u.uid;
      try {
        if (userHasPasswordProvider(u) && u.email) {
          const pw = params.currentPassword?.trim();
          if (!pw) throw makeAuthError("mustEnterPassword");
          const cred = EmailAuthProvider.credential(u.email, pw);
          await reauthenticateWithCredential(u, cred);
        } else {
          const hasGoogle = u.providerData.some((p) => p.providerId === "google.com");
          const hasApple = u.providerData.some((p) => p.providerId === "apple.com");
          if (hasGoogle) {
            await reauthenticateWithPopup(u, new GoogleAuthProvider());
          } else if (hasApple) {
            await reauthenticateWithPopup(u, new OAuthProvider("apple.com"));
          } else {
            throw makeAuthError("noAuthProviderForDelete");
          }
        }
        await deleteProfileDocs(uid, userType);
        await firebaseDeleteUser(u);
      } catch (err: unknown) {
        const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
        if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
          throw makeAuthError("invalidEmailOrPassword");
        }
        if (code === "auth/requires-recent-login") {
          throw makeAuthError("requiresRecentLoginAuth");
        }
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          throw makeAuthError("authCancelled");
        }
        throw err;
      }
    },
    [user]
  );

  const sendPasswordResetForCurrentUser = useCallback(async () => {
    if (!auth) throw new Error("Firebase is not configured");
    const u = auth.currentUser;
    if (!u?.email) throw makeAuthError("noEmailForPassword");
    if (!userHasPasswordProvider(u)) throw makeAuthError("passwordChangeOAuthOnly");
    try {
      await sendPasswordResetEmail(auth, u.email);
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
      if (code === "auth/too-many-requests") {
        throw makeAuthError("tooManyAttempts");
      }
      throw err;
    }
  }, []);

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
      const cred = await raceWithTimeout(
        createUserWithEmailAndPassword(auth, email.trim(), password),
        AUTH_SIGNIN_TIMEOUT_MS,
        "auth/create-user-timeout"
      );
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
      await setDocWithTimeout(setDoc(doc(db, USERS_COLLECTION, cred.user.uid), docData), "users/register-shop-write-timeout");
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
    signInWithGoogle,
    signInWithApple,
    registerCustomer,
    registerShop,
    canChangePassword,
    changePassword,
    deleteAccount,
    sendPasswordResetForCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
