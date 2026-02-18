import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, ArrowLeft, Upload, X, Camera, Mail, Clock } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/lib/LanguageContext";
import { addSubmittedRequest, getSubmittedRequestByRefId } from "@/lib/submittedRequestsStore";
import { saveRequestToFirestore } from "@/lib/requestsFirestore";

const NewRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const isGuestFlow = location.pathname === "/request/new";

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    trim: "",
    year: "",
    vin: "",
    zipCode: "",
    damageDescription: "",
    additionalNotes: "",
    desiredTimeframe: "",
  });
  type SlotImage = { id: string; file: File; previewUrl: string };
  const [imagesBySlot, setImagesBySlot] = useState<Record<string, SlotImage>>({});
  const [email, setEmail] = useState("");

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSlotImage = (slotKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setImagesBySlot((prev) => {
      const old = prev[slotKey];
      if (old) URL.revokeObjectURL(old.previewUrl);
      return {
        ...prev,
        [slotKey]: { id: `${Date.now()}-${slotKey}`, file, previewUrl: URL.createObjectURL(file) },
      };
    });
    e.target.value = "";
  };

  const removeSlotImage = (slotKey: string) => {
    setImagesBySlot((prev) => {
      const old = prev[slotKey];
      if (old) URL.revokeObjectURL(old.previewUrl);
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.desiredTimeframe) {
      toast.error(t("desiredTimeframeTitle"));
      return;
    }
    const zipTrimmed = formData.zipCode.trim().replace(/\D/g, "").slice(0, 5);
    if (zipTrimmed.length < 5) {
      toast.error(t("requestZipCode") + " — " + (t("requestZipCodePlaceholder") ?? "5 digits"));
      return;
    }
    const vehicle = [formData.make, formData.model, formData.trim, formData.year].filter(Boolean).join(" ");
    const refId = addSubmittedRequest({
      vehicle: vehicle || "—",
      make: formData.make,
      model: formData.model,
      trim: formData.trim,
      year: formData.year,
      damage: formData.damageDescription || "—",
      zipCode: zipTrimmed,
      desiredTimeframe: formData.desiredTimeframe,
      additionalNotes: formData.additionalNotes || "",
      imageUrls: [],
      imageLabels: [],
    });
    const fullRequest = getSubmittedRequestByRefId(refId);
    if (fullRequest) {
      saveRequestToFirestore(fullRequest).catch(() => {});
    }

    if (isGuestFlow) {
      const trimmed = email.trim();
      if (!trimmed) {
        toast.error(t("enterEmail"));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast.error(t("invalidEmail"));
        return;
      }
      toast.success(t("requestSubmittedSuccess"));
      navigate(`/request/submitted?ref=${encodeURIComponent(refId)}&email=${encodeURIComponent(trimmed)}`);
      return;
    }
    toast.success(t("requestSubmittedSuccess"));
    navigate(`/request/submitted?ref=${encodeURIComponent(refId)}`);
  };

  const backHref = isGuestFlow ? "/" : "/dashboard";
  const title = isGuestFlow ? t("newRequestTitleGuest") : t("newRequestTitle");

  const imageTypes = [
    { key: "front", labelKey: "frontView", required: true },
    { key: "rear", labelKey: "rearView", required: true },
    { key: "left", labelKey: "leftSide", required: true },
    { key: "right", labelKey: "rightSide", required: true },
    { key: "engine", labelKey: "engineBay", required: false },
    { key: "damage", labelKey: "damageDetailLabel", required: true },
  ];

  const timeframeOptions = [
    { value: "asap", labelKey: "desiredTimeframeAsap" },
    { value: "1week", labelKey: "desiredTimeframe1Week" },
    { value: "2weeks", labelKey: "desiredTimeframe2Weeks" },
    { value: "3-4weeks", labelKey: "desiredTimeframe3To4Weeks" },
    { value: "1month+", labelKey: "desiredTimeframe1MonthPlus" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(backHref)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("back")}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-display font-bold">
                {title}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Guest: photos first; Dashboard: vehicle first */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {isGuestFlow && (
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" />
                {t("photos")}
              </CardTitle>
              <CardDescription>
                {t("photosDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageTypes.map((type) => {
                  const slot = imagesBySlot[type.key];
                  return (
                    <div key={type.key} className="space-y-1">
                      {slot ? (
                        <div className="relative aspect-square w-full rounded-lg border border-border overflow-hidden bg-muted group">
                          <img src={slot.previewUrl} alt={t(type.labelKey)} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeSlotImage(type.key)}
                            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="block border-2 border-dashed border-border rounded-lg aspect-square w-full overflow-hidden hover:border-accent/50 transition-colors cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleSlotImage(type.key, e)}
                          />
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                              <Upload className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </label>
                      )}
                      <p className="text-xs font-medium text-muted-foreground text-center mt-1">
                        {t(type.labelKey)}
                        {type.required && <span className="text-destructive"> *</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Vehicle Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-accent" />
                {t("vehicleInformation")}
              </CardTitle>
              <CardDescription>
                {t("vehicleInformationDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">{t("make")}</Label>
                  <Input
                    id="make"
                    placeholder="Toyota"
                    value={formData.make}
                    onChange={(e) => updateField("make", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">{t("model")}</Label>
                  <Input
                    id="model"
                    placeholder="Camry"
                    value={formData.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trim">{t("trim")}</Label>
                  <Input
                    id="trim"
                    placeholder="LE / XSE"
                    value={formData.trim}
                    onChange={(e) => updateField("trim", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">{t("year")}</Label>
                  <Input
                    id="year"
                    placeholder="2022"
                    value={formData.year}
                    onChange={(e) => updateField("year", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vin">{t("vinOptional")}</Label>
                <Input
                  id="vin"
                  placeholder="1HGBH41JXMN109186"
                  value={formData.vin}
                  onChange={(e) => updateField("vin", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">{t("requestZipCode")}</Label>
                <Input
                  id="zipCode"
                  placeholder={t("requestZipCodePlaceholder")}
                  value={formData.zipCode}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                  maxLength={10}
                  required
                />
                <p className="text-xs text-muted-foreground">{t("requestZipCodeHint")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Damage Description */}
          <Card>
            <CardHeader>
              <CardTitle>{t("damageDescriptionTitle")}</CardTitle>
              <CardDescription>
                {t("damageDescriptionDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="damageDescription">{t("damageDetails")}</Label>
                <Textarea
                  id="damageDescription"
                  placeholder={t("damagePlaceholder")}
                  value={formData.damageDescription}
                  onChange={(e) => updateField("damageDescription", e.target.value)}
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="additionalNotes">{t("additionalNotesOptional")}</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder={t("additionalNotesPlaceholder")}
                  value={formData.additionalNotes}
                  onChange={(e) => updateField("additionalNotes", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Desired time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                {t("desiredTimeframeTitle")}
              </CardTitle>
              <CardDescription>
                {t("desiredTimeframeDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.desiredTimeframe || undefined}
                onValueChange={(value) => updateField("desiredTimeframe", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("desiredTimeframePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {timeframeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Photo Upload - only when dashboard flow (guest sees photos first above) */}
          {!isGuestFlow && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" />
                {t("photos")}
              </CardTitle>
              <CardDescription>
                {t("photosDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageTypes.map((type) => {
                  const slot = imagesBySlot[type.key];
                  return (
                    <div key={type.key} className="space-y-1">
                      {slot ? (
                        <div className="relative aspect-square w-full rounded-lg border border-border overflow-hidden bg-muted group">
                          <img src={slot.previewUrl} alt={t(type.labelKey)} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeSlotImage(type.key)}
                            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="block border-2 border-dashed border-border rounded-lg aspect-square w-full overflow-hidden hover:border-accent/50 transition-colors cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleSlotImage(type.key, e)}
                          />
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                              <Upload className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </label>
                      )}
                      <p className="text-xs font-medium text-muted-foreground text-center mt-1">
                        {t(type.labelKey)}
                        {type.required && <span className="text-destructive"> *</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Email - only for guest flow, at the end */}
          {isGuestFlow && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-accent" />
                {t("yourEmail")}
              </CardTitle>
              <CardDescription>
                {t("yourEmailDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="request-email">{t("email")}</Label>
                <Input
                  id="request-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("alreadyHaveAccount") ?? "Already have an account?"}{" "}
                <Link to="/login" className="text-accent font-medium hover:underline">
                  {t("signIn")}
                </Link>
              </p>
            </CardContent>
          </Card>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(backHref)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" variant="hero" className="flex-1">
              {t("submitRequest")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default NewRequest;
