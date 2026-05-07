import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Apple, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import { isFirebaseEnabled } from "@/lib/firebase";
import { useLanguage } from "@/lib/LanguageContext";

const Register = () => {
  const { t } = useLanguage();
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();
  const { login, signInWithGoogle, signInWithApple, user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (user.userType === "customer") navigate("/dashboard", { replace: true });
    else if (user.userType === "shop") navigate("/shop/dashboard", { replace: true });
    else if (user.userType === "admin") navigate("/admin/dashboard", { replace: true });
  }, [loading, user, navigate]);

  const busy = !!oauthLoading;
  const actionsDisabled = busy || !termsAccepted;

  const handleGoogleSignUp = async () => {
    if (!termsAccepted) {
      toast.error(t("termsRequired"));
      return;
    }
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

  const handleAppleSignUp = async () => {
    if (!termsAccepted) {
      toast.error(t("termsRequired"));
      return;
    }
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
            {t("createAccount")}
          </p>
          <label htmlFor="register-terms" className="mt-8 flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left">
            <Checkbox
              id="register-terms"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
              className="mt-0.5"
              aria-required
            />
            <span className="text-sm leading-snug text-muted-foreground">{t("termsAndPrivacy")}</span>
          </label>

          <div className="mt-4 w-full space-y-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 w-full justify-center gap-2 rounded-2xl border-border bg-card text-foreground"
              disabled={actionsDisabled}
              onClick={handleGoogleSignUp}
            >
              <Chrome className="h-5 w-5" />
              {oauthLoading === "google" ? (t("creatingAccount") ?? "Creating account...") : t("continueWithGoogle")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 w-full justify-center gap-2 rounded-2xl border-border bg-card text-foreground"
              disabled={actionsDisabled}
              onClick={handleAppleSignUp}
            >
              <Apple className="h-5 w-5" />
              {oauthLoading === "apple" ? (t("creatingAccount") ?? "Creating account...") : t("continueWithApple")}
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="hero"
          size="lg"
          className="h-14 w-full rounded-2xl"
          disabled={!termsAccepted}
          onClick={() => {
            if (!termsAccepted) {
              toast.error(t("termsRequired"));
              return;
            }
            navigate("/request/new");
          }}
        >
          {t("getStartedPhotos")}
        </Button>
      </div>
    </div>
  );
};

export default Register;
