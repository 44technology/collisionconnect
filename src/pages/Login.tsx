import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Apple, Chrome, Lock, Mail } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const adminMode = searchParams.get("mode") === "admin";
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, loginWithEmailAndPassword, signInWithGoogle, signInWithApple, user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (adminMode) {
      if (user.userType === "admin") navigate("/admin/dashboard", { replace: true });
      return;
    }
    if (user.userType === "shop") navigate("/shop/dashboard", { replace: true });
    else if (user.userType === "admin") navigate("/admin/dashboard", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [loading, user, navigate, adminMode]);

  const busy = (!!oauthLoading || submitting) && !adminMode;

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (adminMode) {
      if (!isFirebaseEnabled()) {
        login("admin", email.split("@")[0] || "Admin");
        navigate("/admin/dashboard");
        return;
      }
      setSubmitting(true);
      try {
        const state = await loginWithEmailAndPassword(email, password);
        if (state?.userType !== "admin") {
          toast.error(t("adminOnly") ?? "Admin access only. Sign in with an admin account.");
          try {
            await logout();
          } catch {
            // ignore
          }
          return;
        }
        navigate("/admin/dashboard", { replace: true });
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "code" in err
            ? (err as { code: string }).code === "auth/invalid-credential" ||
                (err as { code: string }).code === "auth/user-not-found"
              ? t("invalidEmailOrPassword") ?? "Invalid email or password"
              : (err as { message?: string }).message ?? String(err)
            : String(err);
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!isFirebaseEnabled()) {
      login("customer", email.split("@")[0] || "Customer");
      navigate("/dashboard");
      return;
    }
    setSubmitting(true);
    try {
      const state = await loginWithEmailAndPassword(email, password);
      if (state?.userType === "shop") navigate("/shop/dashboard");
      else if (state?.userType === "admin") navigate("/admin/dashboard");
      else navigate("/dashboard");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code === "auth/invalid-credential" ||
              (err as { code: string }).code === "auth/user-not-found"
            ? t("invalidEmailOrPassword") ?? "Invalid email or password"
            : (err as { message?: string }).message ?? String(err)
          : String(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (adminMode) return;
    if (!isFirebaseEnabled()) {
      login("customer", "Customer");
      navigate("/dashboard");
      return;
    }
    try {
      setOauthLoading("google");
      await signInWithGoogle();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
      setOauthLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    if (adminMode) return;
    if (!isFirebaseEnabled()) {
      login("customer", "Customer");
      navigate("/dashboard");
      return;
    }
    try {
      setOauthLoading("apple");
      await signInWithApple();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 pb-6 pt-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col animate-slide-up">
        <div className="flex flex-1 flex-col items-center justify-center">
          <img
            src="/fixy-logo-transparent.png"
            alt="Fixly"
            className="w-72 max-w-full object-contain"
          />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {adminMode ? t("adminLoginDesc") : t("signInToAccount")}
          </p>
          <form onSubmit={handleEmailSubmit} className="mt-6 w-full space-y-3">
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
                  className="h-12 rounded-2xl pl-10"
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
                  className="h-12 rounded-2xl pl-10"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="h-12 w-full rounded-2xl"
              disabled={adminMode ? submitting : busy}
            >
              {submitting ? (t("signingIn") ?? "Signing in...") : adminMode ? t("signInAsAdmin") : t("signIn")}
            </Button>
          </form>
          {adminMode ? (
            <div className="mt-6 w-full text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-foreground hover:underline">
                {t("backToCustomerSignIn")}
              </Link>
            </div>
          ) : (
            <>
          <div className="mt-5 w-full text-center text-xs text-muted-foreground">{t("oauthContinueDivider")}</div>
          <div className="mt-3 w-full space-y-3">
            <Button
              type="button"
              variant="default"
              size="lg"
              className="h-14 w-full justify-center gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              disabled={busy}
              onClick={handleGoogleSignIn}
            >
              <Chrome className="h-5 w-5" />
              {oauthLoading === "google" ? (t("signingIn") ?? "Signing in...") : t("continueWithGoogle")}
            </Button>
            <Button
              type="button"
              variant="default"
              size="lg"
              className="h-14 w-full justify-center gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              disabled={busy}
              onClick={handleAppleSignIn}
            >
              <Apple className="h-5 w-5" />
              {oauthLoading === "apple" ? (t("signingIn") ?? "Signing in...") : t("continueWithApple")}
            </Button>
          </div>
            </>
          )}
        </div>

        {!adminMode ? (
        <Button
          type="button"
          variant="hero"
          size="lg"
          className="h-14 w-full rounded-2xl"
          onClick={() => navigate("/request/new")}
        >
          {t("getStartedPhotos")}
        </Button>
        ) : null}
      </div>
    </div>
  );
};

export default Login;
