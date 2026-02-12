import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
const Settings = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("back")}
            </Button>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-lg font-display font-bold">{t("settingsTitle")}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
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
                English
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setLocale("es")}
                className={`h-12 font-medium border-2 ${locale === "es" ? "border-accent bg-accent/10 text-foreground" : "border-border text-foreground"}`}
              >
                Español
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("currentLanguage")}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
