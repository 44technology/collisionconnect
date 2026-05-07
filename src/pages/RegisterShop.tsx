import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Mail, Lock, User, Phone, MapPin, ArrowLeft, Wrench } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import { isFirebaseEnabled } from "@/lib/firebase";
import { useLanguage } from "@/lib/LanguageContext";
import type { ShopPreferences } from "@/lib/shopPreferences";
import { SERVICE_TYPE_KEYS, LANGUAGE_KEYS } from "@/lib/shopPreferences";

const SERVICE_LABEL_KEYS: Record<string, string> = {
  collision: "shopServiceCollision",
  paint: "shopServicePaint",
  frame: "shopServiceFrame",
  glass: "shopServiceGlass",
  detailing: "shopServiceDetailing",
};

const RegisterShop = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    password: "",
    confirmPassword: "",
  });
  const [preferences, setPreferences] = useState<ShopPreferences>({
    serviceTypes: [],
    languagesSpoken: [],
    acceptInsurance: true,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();
  const { registerShop, login } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }
    if (formData.password.length < 6) {
      toast.error(t("passwordMinLength"));
      return;
    }
    if (!termsAccepted) {
      toast.error(t("termsRequired"));
      return;
    }
    if (isFirebaseEnabled()) {
      setSubmitting(true);
      try {
        await registerShop({
          email: formData.email,
          password: formData.password,
          shopName: formData.shopName,
          ownerName: formData.ownerName,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          preferences,
        });
        toast.success(t("businessAccountCreated"));
        navigate("/shop/dashboard");
      } catch (err: unknown) {
        const msg = err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : String(err);
        toast.error(msg ?? t("registrationFailed"));
      } finally {
        setSubmitting(false);
      }
    } else {
      login("shop", formData.shopName);
      navigate("/shop/dashboard");
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Back button */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToHome")}
        </Link>

        <Card className="border border-border/80 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">{t("bodyShopRegistration")}</CardTitle>
            <CardDescription>
              {t("addYourBusiness")}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">{t("businessName")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="shopName"
                      type="text"
                      placeholder="ABC Body Shop"
                      value={formData.shopName}
                      onChange={(e) => updateField("shopName", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerName">{t("contactName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="ownerName"
                      type="text"
                      placeholder="John Doe"
                      value={formData.ownerName}
                      onChange={(e) => updateField("ownerName", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="shop@email.com"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("address")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("city")}</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="New York"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">{t("state")}</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="NY"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-base font-semibold">{t("shopPreferencesTitle")}</Label>
                    <p className="text-xs text-muted-foreground">{t("shopPreferencesDesc")}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">{t("shopServiceTypes")}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{t("shopServiceTypesHint")}</p>
                  <div className="flex flex-wrap gap-3">
                    {SERVICE_TYPE_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={preferences.serviceTypes.includes(key)}
                          onCheckedChange={() => toggleServiceType(key)}
                        />
                        <span className="text-sm">{t(SERVICE_LABEL_KEYS[key])}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">{t("shopLanguagesSpoken")}</Label>
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
                  <Label htmlFor="prefNotes" className="text-sm text-muted-foreground">{t("shopPreferencesNotes")}</Label>
                  <Input
                    id="prefNotes"
                    type="text"
                    placeholder={t("shopPreferencesNotesPlaceholder")}
                    value={preferences.notes ?? ""}
                    onChange={(e) => setPreferences((p) => ({ ...p, notes: e.target.value }))}
                    className="bg-muted/50"
                  />
                </div>
              </div>

              <label htmlFor="shop-terms" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                <Checkbox
                  id="shop-terms"
                  checked={termsAccepted}
                  onCheckedChange={(v) => setTermsAccepted(v === true)}
                  className="mt-0.5"
                  aria-required
                />
                <span className="text-sm leading-snug text-muted-foreground">{t("termsAndPrivacy")}</span>
              </label>

              <Button type="submit" className="w-full" size="lg" disabled={submitting || !termsAccepted}>
                {submitting ? t("creatingAccount") : t("register")}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t("alreadyHaveAccount")} </span>
              <Link to="/login/shop" className="text-accent hover:underline font-medium">
                {t("signIn")}
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-border text-center">
              <Link 
                to="/register" 
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                {t("registerAsCustomerLink")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterShop;
