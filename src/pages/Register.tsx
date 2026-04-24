import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Apple, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import { isFirebaseEnabled } from "@/lib/firebase";
import { useLanguage } from "@/lib/LanguageContext";

const Register = () => {
  const { t } = useLanguage();
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const navigate = useNavigate();
  const { login, signInWithGoogle, signInWithApple, user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (user.userType === "customer") navigate("/dashboard", { replace: true });
    else if (user.userType === "shop") navigate("/shop/dashboard", { replace: true });
    else if (user.userType === "admin") navigate("/admin/dashboard", { replace: true });
  }, [loading, user, navigate]);

  const busy = !!oauthLoading;

  const handleGoogleSignUp = async () => {
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
          <div className="mt-8 w-full space-y-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 w-full justify-center gap-2 rounded-2xl border-border bg-card text-foreground"
              disabled={busy}
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
              disabled={busy}
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
          onClick={() => navigate("/request/new")}
        >
          {t("getStartedPhotos")}
        </Button>
      </div>
    </div>
  );
};

export default Register;
