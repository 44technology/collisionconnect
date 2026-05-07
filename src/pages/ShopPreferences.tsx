import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Wrench, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  getShopPreferences,
  updateShopPreferences,
  DEFAULT_SHOP_PREFERENCES,
  SERVICE_TYPE_KEYS,
  LANGUAGE_KEYS,
  type ShopPreferences,
} from "@/lib/shopPreferences";
import { isFirebaseEnabled } from "@/lib/firebase";

const SERVICE_LABEL_KEYS: Record<string, string> = {
  collision: "shopServiceCollision",
  paint: "shopServicePaint",
  frame: "shopServiceFrame",
  glass: "shopServiceGlass",
  detailing: "shopServiceDetailing",
};

const ShopPreferencesPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ShopPreferences>(DEFAULT_SHOP_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.userType !== "shop" || !user?.uid) {
      navigate("/");
      return;
    }
    if (!isFirebaseEnabled()) {
      setLoading(false);
      return;
    }
    getShopPreferences(user.uid)
      .then((p) => {
        if (p) setPreferences(p);
      })
      .finally(() => setLoading(false));
  }, [user?.userType, user?.uid, navigate]);

  const toggleServiceType = (key: string) => {
    setPreferences((p) => ({
      ...p,
      serviceTypes: p.serviceTypes.includes(key) ? p.serviceTypes.filter((x) => x !== key) : [...p.serviceTypes, key],
    }));
  };
  const toggleLanguage = (key: string) => {
    setPreferences((p) => ({
      ...p,
      languagesSpoken: p.languagesSpoken.includes(key) ? p.languagesSpoken.filter((x) => x !== key) : [...p.languagesSpoken, key],
    }));
  };

  const handleSave = async () => {
    if (!user?.uid || user?.userType !== "shop") return;
    setSaving(true);
    try {
      await updateShopPreferences(user.uid, preferences);
      toast.success(t("shopPreferencesSaved"));
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (user?.userType !== "shop") return null;
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border/70 bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75">
        <div className="app-header-pt mx-auto flex max-w-lg items-center gap-2 px-3 pb-3 sm:max-w-2xl sm:gap-3 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => navigate("/shop/dashboard")}
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Wrench className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <h1 className="truncate font-display text-base font-bold tracking-tight sm:text-lg">{t("shopPreferencesTitle")}</h1>
          </div>
        </div>
      </header>

      <main className="app-safe-pb mx-auto w-full max-w-lg flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:max-w-2xl sm:py-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              {t("shopPreferencesTitle")}
            </CardTitle>
            <CardDescription>{t("shopPreferencesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">{t("shopServiceTypes")}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t("shopServiceTypesHint")}</p>
              <div className="flex flex-wrap gap-3">
                {SERVICE_TYPE_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={preferences.serviceTypes.includes(key)}
                      onCheckedChange={() => toggleServiceType(key)}
                    />
                    <span className="text-sm">{t(SERVICE_LABEL_KEYS[key] as "shopServiceCollision")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">{t("shopLanguagesSpoken")}</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {LANGUAGE_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={preferences.languagesSpoken.includes(key)}
                      onCheckedChange={() => toggleLanguage(key)}
                    />
                    <span className="text-sm">{t(key === "en" ? "shopLanguageEn" : "shopLanguageEs")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={preferences.acceptInsurance}
                  onCheckedChange={(v) => setPreferences((p) => ({ ...p, acceptInsurance: v === true }))}
                />
                <span className="text-sm">{t("shopAcceptInsurance")}</span>
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefNotes" className="text-sm text-muted-foreground">
                {t("shopPreferencesNotes")}
              </Label>
              <Input
                id="prefNotes"
                type="text"
                placeholder={t("shopPreferencesNotesPlaceholder")}
                value={preferences.notes ?? ""}
                onChange={(e) => setPreferences((p) => ({ ...p, notes: e.target.value }))}
                className="bg-muted/50"
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("save")}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ShopPreferencesPage;
