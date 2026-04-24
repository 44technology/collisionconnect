import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/lib/LanguageContext";
import { getOauthPrimaryProvider } from "@/lib/oauthDeviceOrder";

type Props = {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  oauthLoading: "google" | "apple" | null;
  setOauthLoading: (v: "google" | "apple" | null) => void;
  submitting?: boolean;
  className?: string;
};

export function OAuthCustomerButtons({
  signInWithGoogle,
  signInWithApple,
  oauthLoading,
  setOauthLoading,
  submitting = false,
  className,
}: Props) {
  const { t } = useLanguage();
  const primary = useMemo(() => getOauthPrimaryProvider(), []);
  const busy = !!oauthLoading || submitting;

  const googleButton = (
    <Button
      type="button"
      variant={primary === "google" ? "hero" : "outline"}
      className="w-full"
      size="lg"
      disabled={busy}
      onClick={async () => {
        try {
          setOauthLoading("google");
          await signInWithGoogle();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(msg);
          setOauthLoading(null);
        }
      }}
    >
      {t("continueWithGoogle")}
    </Button>
  );

  const appleButton = (
    <Button
      type="button"
      variant={primary === "apple" ? "hero" : "outline"}
      className="w-full"
      size="lg"
      disabled={busy}
      onClick={async () => {
        try {
          setOauthLoading("apple");
          await signInWithApple();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(msg);
          setOauthLoading(null);
        }
      }}
    >
      {t("continueWithApple")}
    </Button>
  );

  return (
    <div className={className ?? "space-y-3 mt-4"}>
      <div className="text-center text-xs text-muted-foreground">{t("oauthContinueDivider")}</div>
      {primary === "apple" ? (
        <>
          {appleButton}
          {googleButton}
        </>
      ) : (
        <>
          {googleButton}
          {appleButton}
        </>
      )}
    </div>
  );
}
