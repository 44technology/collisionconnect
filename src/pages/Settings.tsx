import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, KeyRound, Mail, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/authContext";
import { auth, isFirebaseEnabled } from "@/lib/firebase";
import { toast } from "sonner";

function authErrorMessage(t: (key: string) => string, err: unknown, fallbackKey: string): string {
  const code =
    err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : "";
  if (code) {
    const msg = t(code);
    if (msg && msg !== code) return msg;
  }
  return t(fallbackKey);
}

const Settings = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLanguage();
  const { user, loading, canChangePassword, changePassword, deleteAccount, sendPasswordResetForCurrentUser } = useAuth();

  /** Context bazen gecikmeli; giriş yöntemini Auth’tan okumak email/şifre butonlarını her zaman gösterir. */
  const [hasPasswordProvider, setHasPasswordProvider] = useState(false);
  useEffect(() => {
    if (!auth) {
      setHasPasswordProvider(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setHasPasswordProvider(!!u?.providerData.some((p) => p.providerId === "password"));
    });
    return unsub;
  }, []);

  const emailPasswordUser = hasPasswordProvider || canChangePassword;

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delLoading, setDelLoading] = useState(false);
  const [resetEmailLoading, setResetEmailLoading] = useState(false);

  const showAccountSection = !!user && !loading;

  const resetPwdForm = () => {
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
  };

  const handleChangePassword = async () => {
    if (pwdNew.length < 6) {
      toast.error(t("passwordMinLength"));
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }
    setPwdLoading(true);
    try {
      await changePassword(pwdCurrent, pwdNew);
      toast.success(t("passwordChangedSuccess"));
      setPwdOpen(false);
      resetPwdForm();
    } catch (err) {
      toast.error(authErrorMessage(t, err, "passwordChangeFailed"));
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    setResetEmailLoading(true);
    try {
      await sendPasswordResetForCurrentUser();
      toast.success(t("passwordResetEmailSent"));
    } catch (err) {
      toast.error(authErrorMessage(t, err, "passwordResetEmailFailed"));
    } finally {
      setResetEmailLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDelLoading(true);
    try {
      await deleteAccount(emailPasswordUser ? { currentPassword: delPassword } : {});
      toast.success(t("accountDeletedSuccess"));
      setDelOpen(false);
      setDelPassword("");
      navigate("/login");
    } catch (err) {
      toast.error(authErrorMessage(t, err, "accountDeleteFailed"));
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border/70 bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75">
        <div className="app-header-pt mx-auto flex max-w-lg items-center gap-2 px-3 pb-3 sm:max-w-2xl sm:gap-3 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => navigate(-1)}
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SettingsIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <h1 className="truncate font-display text-base font-bold tracking-tight sm:text-lg">{t("settingsTitle")}</h1>
          </div>
        </div>
      </header>

      <main className="app-safe-pb mx-auto w-full max-w-lg flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:max-w-2xl sm:py-8 space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t("language")}</CardTitle>
            <CardDescription>{t("languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label className="text-sm text-muted-foreground">{t("language")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setLocale("en")}
                className={`h-12 font-medium border-2 ${locale === "en" ? "border-accent bg-accent/10 text-foreground" : "border-border text-foreground"}`}
              >
                {t("english")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setLocale("es")}
                className={`h-12 font-medium border-2 ${locale === "es" ? "border-accent bg-accent/10 text-foreground" : "border-border text-foreground"}`}
              >
                {t("spanish")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{locale === "en" ? t("currentLanguageEn") : t("currentLanguageEs")}</p>
          </CardContent>
        </Card>

        {showAccountSection && (
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle>{t("accountSecurityTitle")}</CardTitle>
              <CardDescription>
                {!isFirebaseEnabled() ? t("settingsAccountRequiresFirebase") : t("accountSecurityDesc")}
              </CardDescription>
            </CardHeader>
            {isFirebaseEnabled() && (
              <CardContent className="space-y-3">
                {emailPasswordUser ? (
                  <>
                    <Button type="button" variant="outline" className="w-full justify-start gap-2 h-12" onClick={() => setPwdOpen(true)}>
                      <KeyRound className="h-4 w-4 shrink-0" />
                      {t("changePassword")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2 h-12"
                      onClick={() => void handleSendPasswordResetEmail()}
                      disabled={resetEmailLoading}
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      {resetEmailLoading ? t("sendingEmail") : t("sendPasswordResetEmailBtn")}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("passwordChangeOAuthOnly")}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 h-12 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setDelPassword("");
                    setDelOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  {t("deleteAccount")}
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        <Dialog
          open={pwdOpen}
          onOpenChange={(o) => {
            setPwdOpen(o);
            if (!o) resetPwdForm();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("changePassword")}</DialogTitle>
              <DialogDescription>{t("changePasswordDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="pwd-current">{t("password")}</Label>
                <Input
                  id="pwd-current"
                  type="password"
                  autoComplete="current-password"
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-new">{t("newPasswordLabel")}</Label>
                <Input
                  id="pwd-new"
                  type="password"
                  autoComplete="new-password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-confirm">{t("confirmPassword")}</Label>
                <Input
                  id="pwd-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setPwdOpen(false)} disabled={pwdLoading}>
                {t("cancel")}
              </Button>
              <Button type="button" variant="hero" onClick={() => void handleChangePassword()} disabled={pwdLoading}>
                {pwdLoading ? t("passwordUpdating") : t("changePassword")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={delOpen} onOpenChange={(o) => !delLoading && setDelOpen(o)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">{t("deleteAccountConfirmTitle")}</DialogTitle>
              <DialogDescription className="space-y-2 pt-1">
                <span className="block text-foreground">{t("deleteAccountDesc")}</span>
                <span className="block text-sm">{emailPasswordUser ? t("deleteAccountWarning") : t("deleteAccountOAuthHint")}</span>
              </DialogDescription>
            </DialogHeader>
            {emailPasswordUser && (
              <div className="space-y-2 py-2">
                <Label htmlFor="del-pwd">{t("password")}</Label>
                <Input
                  id="del-pwd"
                  type="password"
                  autoComplete="current-password"
                  value={delPassword}
                  onChange={(e) => setDelPassword(e.target.value)}
                />
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDelOpen(false)} disabled={delLoading}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDeleteAccount()}
                disabled={delLoading || (emailPasswordUser && !delPassword.trim())}
              >
                {delLoading ? t("deletingAccount") : t("confirmDeleteAccount")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Settings;
