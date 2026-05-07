import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Apple, ArrowLeft, Chrome, Loader2, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/LanguageContext";
import { isFirebaseEnabled } from "@/lib/firebase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, loginWithEmailAndPassword, signInWithGoogle, signInWithApple, user, loading } = useAuth();

  const getAuthErrorMessage = (err: unknown): string => {
    const fallback = err instanceof Error ? err.message : String(err);
    const code =
      err && typeof err === "object" && "code" in err && typeof (err as { code?: unknown }).code === "string"
        ? (err as { code: string }).code
        : "";

    if (code === "permission-denied") return "Permission denied while loading user profile.";
    if (code === "auth/network-request-failed") return t("networkError") ?? "Network error. Please check connection.";
    if (code === "auth/invalid-api-key" || code === "auth/app-not-authorized") {
      return "Firebase config is not authorized for this app build.";
    }
    if (code === "auth/operation-not-allowed") return "This login method is not enabled in Firebase.";
    if (code === "invalidEmailOrPassword") return t("invalidEmailOrPassword") ?? "Invalid email or password";
    if (code === "tooManyAttempts") return t("tooManyAttempts") ?? "Too many attempts. Please try later.";
    if (code === "userDisabled") return t("userDisabled") ?? "This account is disabled.";
    if (code === "profileLoadTimeout") {
      return "Login succeeded but profile loading timed out. Please try again.";
    }
    if (code === "authSignInTimeout") {
      return "Sign-in request timed out. Check network/VPN and try again.";
    }
    if (code === "profileWriteTimeout") {
      return "Login succeeded but saving your profile timed out. Please try again.";
    }

    return fallback;
  };

  useEffect(() => {
    if (loading || !user) return;
    if (user.userType === "shop") navigate("/shop/dashboard", { replace: true });
    else if (user.userType === "admin") navigate("/admin/dashboard", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  const oauthBusy = !!oauthLoading || submitting;

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFirebaseEnabled()) {
      login("customer", email.split("@")[0] || "Customer");
      navigate("/dashboard");
      return;
    }
    setSubmitting(true);
    try {
      await loginWithEmailAndPassword(email, password);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("Sign-in error:", err);
      toast.error(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseEnabled()) {
      login("customer", "Customer");
      navigate("/dashboard");
      return;
    }
    try {
      setOauthLoading("google");
      await signInWithGoogle();
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("Google sign-in error:", err);
      toast.error(getAuthErrorMessage(err));
      setOauthLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    if (!isFirebaseEnabled()) {
      login("customer", "Customer");
      navigate("/dashboard");
      return;
    }
    try {
      setOauthLoading("apple");
      await signInWithApple();
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("Apple sign-in error:", err);
      toast.error(getAuthErrorMessage(err));
      setOauthLoading(null);
    }
  };

  return (
    <div className="app-header-pt app-safe-pb flex min-h-svh flex-col bg-background px-5">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-start py-5 animate-slide-up">
        <div className="mb-3 flex w-full justify-start">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => navigate("/")}
            aria-label={t("backToHome")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <img
          src="/fixy-logo-transparent.png"
          alt="Fixly"
          className="mt-1 w-52 max-w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
        />
        <div className="mt-3 w-full rounded-3xl border border-border/70 bg-card/70 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.36)] backdrop-blur-xl">
          <form onSubmit={handleEmailSubmit} className="w-full space-y-3">
            <div className="space-y-2 text-left">
              <Label htmlFor="login-email">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-border/70 bg-background/70 pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="login-password">{t("password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-border/70 bg-background/70 pl-10"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="h-11 w-full rounded-xl"
              disabled={submitting}
            >
              {submitting ? (t("signingIn") ?? "Signing in...") : t("signIn")}
            </Button>
          </form>

          <div className="mt-5 w-full text-center text-[11px] tracking-wide text-muted-foreground/90">
            {t("oauthContinueDivider")}
          </div>
          <div className="mt-3 grid w-full grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="default"
              className="h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              disabled={oauthBusy}
              onClick={handleGoogleSignIn}
              aria-label={t("continueWithGoogle")}
            >
              {oauthLoading === "google" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Chrome className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              variant="default"
              className="h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              disabled={oauthBusy}
              onClick={handleAppleSignIn}
              aria-label={t("continueWithApple")}
            >
              {oauthLoading === "apple" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Apple className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
