import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, ArrowLeft, Upload, X, Camera, Mail, Clock, Lock, User } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/authContext";
import {
  generateRefId,
  addSubmittedRequestWithRefId,
  getSubmittedRequestByRefId,
} from "@/lib/submittedRequestsStore";
import { saveRequestToFirestore } from "@/lib/requestsFirestore";
import { uploadRequestImages } from "@/lib/requestImagesStorage";
import { auth, isFirebaseEnabled } from "@/lib/firebase";
import { decodeVin, getAllMakes, getModelsForMake, type MakeItem, type ModelItem } from "@/lib/vehicleApi";
import { fetchSignInMethodsForEmail } from "firebase/auth";

const NewRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { registerCustomer, login, loginWithEmailAndPassword, signInWithGoogle, signInWithApple, user } = useAuth();
  const isGuestFlow = location.pathname === "/request/new" && !user;
  const [guestAuthMode, setGuestAuthMode] = useState<"register" | "login">("register");

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
  const [account, setAccount] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [vinDecoding, setVinDecoding] = useState(false);
  const [makes, setMakes] = useState<MakeItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [makesLoaded, setMakesLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    // Kullanıcı yokken guest akışa girince register adımıyla başlayalım.
    if (isGuestFlow) setGuestAuthMode("register");
  }, [isGuestFlow]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "make") next.model = "";
      return next;
    });
    if (field === "make") setModels([]);
  };

  useEffect(() => {
    let cancelled = false;
    getAllMakes()
      .then((list) => {
        if (!cancelled) setMakes(list);
      })
      .finally(() => {
        if (!cancelled) setMakesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!formData.make.trim()) {
      setModels([]);
      return;
    }
    setModelsLoading(true);
    getModelsForMake(formData.make)
      .then(setModels)
      .finally(() => setModelsLoading(false));
  }, [formData.make]);

  const handleDecodeVin = async () => {
    if (!formData.vin.trim()) return;
    setVinDecoding(true);
    try {
      const result = await decodeVin(formData.vin);
      if (result) {
        setFormData((prev) => ({
          ...prev,
          make: result.make || prev.make,
          model: result.model || prev.model,
          year: result.year || prev.year,
          trim: result.trim || prev.trim,
        }));
        if (result.make || result.model || result.year || result.trim) {
          toast.success(t("vinDecoded") ?? "VIN decoded. Make, model, year, trim filled.");
        } else {
          toast.info(t("vinDecodeNoData") ?? "No vehicle data for this VIN.");
        }
      } else {
        toast.error(t("vinDecodeFailed") ?? "Could not decode VIN.");
      }
    } finally {
      setVinDecoding(false);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (isGuestFlow) {
      const fullName = account.fullName;
      const accountEmail = account.email.trim();
      const password = account.password;
      const confirmPassword = account.confirmPassword;

      if (!accountEmail) {
        toast.error(t("enterEmail"));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
        toast.error(t("invalidEmail"));
        return;
      }

      setSubmitting(true);
      try {
        if (isFirebaseEnabled()) {
          if (guestAuthMode === "register") {
            if (!fullName.trim()) {
              toast.error(t("fullName") + " — " + (t("enterName") ?? "Required"));
              setSubmitting(false);
              return;
            }
            if (password.length < 6) {
              toast.error(t("passwordMinLength"));
              setSubmitting(false);
              return;
            }
            if (password !== confirmPassword) {
              toast.error(t("passwordsDoNotMatch"));
              setSubmitting(false);
              return;
            }

            // Email daha önce kayıtlıysa, register yerine login adımına geçiyoruz.
            const methods = auth ? await fetchSignInMethodsForEmail(auth, accountEmail) : [];
            if (methods.length > 0) {
              setGuestAuthMode("login");
              toast.info(t("alreadyHaveAccount") ?? "Account exists. Please sign in.");
              setSubmitting(false);
              return;
            }

            await registerCustomer({
              email: accountEmail,
              password,
              name: fullName.trim(),
            });
          } else {
            if (password.length < 6) {
              toast.error(t("passwordMinLength"));
              setSubmitting(false);
              return;
            }
            await loginWithEmailAndPassword(accountEmail, password);
          }
        } else {
          // Firebase kapalıyken mock akış: sadece customer olarak giriş yapıyoruz.
          if (guestAuthMode === "register") {
            if (!fullName.trim()) {
              toast.error(t("fullName") + " — " + (t("enterName") ?? "Required"));
              setSubmitting(false);
              return;
            }
            login("customer", fullName.trim());
          } else {
            // Mock’ta login modu pratikte register ile aynı davranır.
            login("customer", fullName.trim() || "Customer");
          }
        }
      } catch (err: unknown) {
        const msg = err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : String(err);
        toast.error(msg ?? t("registrationFailed"));
        setSubmitting(false);
        return;
      }

      const vehicle = [formData.make, formData.model, formData.trim, formData.year].filter(Boolean).join(" ");
      const refId = generateRefId();
      const imageSlotOrder = [
        { key: "front", labelKey: "frontView" },
        { key: "rear", labelKey: "rearView" },
        { key: "left", labelKey: "leftSide" },
        { key: "right", labelKey: "rightSide" },
        { key: "engine", labelKey: "engineBay" },
        { key: "damage", labelKey: "damageDetailLabel" },
      ];
      const imageList = imageSlotOrder
        .filter(({ key }) => imagesBySlot[key])
        .map(({ key, labelKey }) => ({ file: imagesBySlot[key].file, label: t(labelKey) }));
      let imageUrls: string[] = [];
      let imageLabels: string[] = [];
      if (imageList.length > 0) {
        try {
          const res = await uploadRequestImages(refId, imageList);
          imageUrls = res.urls;
          imageLabels = res.labels;
        } catch (_) {
          toast.error(t("photoUploadFailed") ?? "Photo upload failed. Request saved without photos.");
        }
      }
      addSubmittedRequestWithRefId(refId, {
        vehicle: vehicle || "—",
        make: formData.make,
        model: formData.model,
        trim: formData.trim,
        year: formData.year,
        vin: formData.vin.trim() || undefined,
        damage: formData.damageDescription || "—",
        zipCode: zipTrimmed,
        desiredTimeframe: formData.desiredTimeframe,
        additionalNotes: formData.additionalNotes || "",
        imageUrls,
        imageLabels,
      });
      const fullRequest = getSubmittedRequestByRefId(refId);
      if (fullRequest) {
        try {
          await saveRequestToFirestore(fullRequest);
        } catch {
          toast.error(t("requestSavedLocallyButCloudFailed") ?? "Request saved locally, but cloud sync failed.");
        }
      }
      toast.success(t("requestSubmittedSuccess"));
      navigate(`/request/submitted?ref=${encodeURIComponent(refId)}&email=${encodeURIComponent(accountEmail)}`);
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    const vehicle = [formData.make, formData.model, formData.trim, formData.year].filter(Boolean).join(" ");
    const refId = generateRefId();
    const imageSlotOrder = [
      { key: "front", labelKey: "frontView" },
      { key: "rear", labelKey: "rearView" },
      { key: "left", labelKey: "leftSide" },
      { key: "right", labelKey: "rightSide" },
      { key: "engine", labelKey: "engineBay" },
      { key: "damage", labelKey: "damageDetailLabel" },
    ];
    const imageList = imageSlotOrder
      .filter(({ key }) => imagesBySlot[key])
      .map(({ key, labelKey }) => ({ file: imagesBySlot[key].file, label: t(labelKey) }));
    let imageUrls: string[] = [];
    let imageLabels: string[] = [];
    if (imageList.length > 0) {
      try {
        const res = await uploadRequestImages(refId, imageList);
        imageUrls = res.urls;
        imageLabels = res.labels;
      } catch (_) {
        toast.error(t("photoUploadFailed") ?? "Photo upload failed. Request saved without photos.");
      }
    }
    addSubmittedRequestWithRefId(refId, {
      vehicle: vehicle || "—",
      make: formData.make,
      model: formData.model,
      trim: formData.trim,
      year: formData.year,
      vin: formData.vin.trim() || undefined,
      damage: formData.damageDescription || "—",
      zipCode: zipTrimmed,
      desiredTimeframe: formData.desiredTimeframe,
      additionalNotes: formData.additionalNotes || "",
      imageUrls,
      imageLabels,
    });
    const fullRequest = getSubmittedRequestByRefId(refId);
    if (fullRequest) {
      try {
        await saveRequestToFirestore(fullRequest);
      } catch {
        toast.error(t("requestSavedLocallyButCloudFailed") ?? "Request saved locally, but cloud sync failed.");
      }
    }
    toast.success(t("requestSubmittedSuccess"));
    navigate(`/request/submitted?ref=${encodeURIComponent(refId)}`);
    setSubmitting(false);
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
  const useManualMakeInput = makesLoaded && makes.length === 0;
  const useManualModelInput = !!formData.make && !modelsLoading && models.length === 0;

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
                  {useManualMakeInput ? (
                    <Input
                      id="make"
                      placeholder={t("makePlaceholder") ?? "Select make"}
                      value={formData.make}
                      onChange={(e) => updateField("make", e.target.value)}
                      required
                    />
                  ) : (
                    <Select
                      value={formData.make || "__none__"}
                      onValueChange={(v) => updateField("make", v === "__none__" ? "" : v)}
                      required
                    >
                      <SelectTrigger id="make">
                        <SelectValue placeholder={t("makePlaceholder") ?? "Select make"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("makePlaceholder") ?? "Select make"}</SelectItem>
                        {makes.map((m) => (
                          <SelectItem key={m.makeId} value={m.makeName}>
                            {m.makeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">{t("model")}</Label>
                  {useManualModelInput ? (
                    <Input
                      id="model"
                      placeholder={t("modelPlaceholder") ?? "Select model"}
                      value={formData.model}
                      onChange={(e) => updateField("model", e.target.value)}
                      required
                      disabled={!formData.make}
                    />
                  ) : (
                    <Select
                      value={formData.model || "__none__"}
                      onValueChange={(v) => updateField("model", v === "__none__" ? "" : v)}
                      required
                      disabled={!formData.make || modelsLoading}
                    >
                      <SelectTrigger id="model">
                        <SelectValue placeholder={modelsLoading ? (t("loading") ?? "Loading…") : (t("modelPlaceholder") ?? "Select model")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("modelPlaceholder") ?? "Select model"}</SelectItem>
                        {models.map((m) => (
                          <SelectItem key={m.modelId} value={m.modelName}>
                            {m.modelName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                    maxLength={4}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label htmlFor="vin">{t("vinOptional")}</Label>
                  <Input
                    id="vin"
                    placeholder="1HGBH41JXMN109186"
                    value={formData.vin}
                    onChange={(e) => updateField("vin", e.target.value)}
                    maxLength={17}
                  />
                </div>
                <Button type="button" variant="outline" onClick={handleDecodeVin} disabled={vinDecoding || !formData.vin.trim()}>
                  {vinDecoding ? (t("loading") ?? "Loading…") : (t("vinDecode") ?? "Decode VIN")}
                </Button>
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

          {/* Auth step — guest flow: submit sırasında register yerine login adımına geçer */}
          {isGuestFlow && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  {guestAuthMode === "register" ? t("createAccount") : t("signIn")}
                </CardTitle>
                <CardDescription>
                  {guestAuthMode === "register"
                    ? t("yourEmailDescription")
                    : "Account exists. Please sign in to continue."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {guestAuthMode === "register" && (
                  <>
                    <div>
                      <Label htmlFor="request-name">{t("fullName")}</Label>
                      <Input
                        id="request-name"
                        type="text"
                        placeholder="John Doe"
                        value={account.fullName}
                        onChange={(e) => setAccount((a) => ({ ...a, fullName: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="request-email">{t("email")}</Label>
                      <Input
                        id="request-email"
                        type="email"
                        placeholder="you@example.com"
                        value={account.email}
                        onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="request-password">{t("password")}</Label>
                      <Input
                        id="request-password"
                        type="password"
                        placeholder="••••••••"
                        value={account.password}
                        onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="request-confirm">{t("confirmPassword")}</Label>
                      <Input
                        id="request-confirm"
                        type="password"
                        placeholder="••••••••••"
                        value={account.confirmPassword}
                        onChange={(e) => setAccount((a) => ({ ...a, confirmPassword: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {t("alreadyHaveAccount") ?? "Already have an account?"}{" "}
                      <button
                        type="button"
                        className="text-accent font-medium hover:underline"
                        onClick={() => setGuestAuthMode("login")}
                      >
                        {t("signIn")}
                      </button>
                    </p>
                  </>
                )}

                {guestAuthMode === "login" && (
                  <>
                    <div>
                      <Label htmlFor="request-email">{t("email")}</Label>
                      <Input
                        id="request-email"
                        type="email"
                        placeholder="you@example.com"
                        value={account.email}
                        onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="request-password">{t("password")}</Label>
                      <Input
                        id="request-password"
                        type="password"
                        placeholder="••••••••"
                        value={account.password}
                        onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    {isFirebaseEnabled() && (
                      <div className="space-y-3 pt-2">
                        <div className="text-center text-xs text-muted-foreground">or continue with</div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          size="lg"
                          disabled={!!oauthLoading || submitting}
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
                          Continue with Google
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          size="lg"
                          disabled={!!oauthLoading || submitting}
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
                          Continue with Apple
                        </Button>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">
                      New here?{" "}
                      <button
                        type="button"
                        className="text-accent font-medium hover:underline"
                        onClick={() => setGuestAuthMode("register")}
                      >
                        {t("createAccount")}
                      </button>
                    </p>
                  </>
                )}
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
            <Button type="submit" variant="hero" className="flex-1" disabled={submitting}>
              {submitting ? (t("creatingAccount") ?? "Creating account…") : t("submitRequest")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default NewRequest;
