import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, ArrowLeft, Upload, X, Camera, Clock, User, Mail, Lock, Apple, Chrome } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { fetchSignInMethodsForEmail, onAuthStateChanged } from "firebase/auth";

const GUEST_DRAFT_KEY = "fixly_guest_new_request_draft_v1";

function dataUrlToFile(dataUrl: string, filename: string) {
  const [header, b64] = dataUrl.split(",");
  const mime = header?.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read failed"));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}

const NewRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { registerCustomer, login, loginWithEmailAndPassword, signInWithGoogle, signInWithApple } = useAuth();
  // Misafir akışı: sayfa `/request/new` ile açıldıysa, kullanıcı sonradan giriş yapsa bile aynı form akışı devam etsin.
  const [isGuestSession] = useState(() => location.pathname === "/request/new");
  const [guestAuthMode, setGuestAuthMode] = useState<"register" | "login">("register");
  const [account, setAccount] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });

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
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const saveDraftTimer = useRef<number | null>(null);
  const [vinDecoding, setVinDecoding] = useState(false);
  const [makes, setMakes] = useState<MakeItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [makesLoaded, setMakesLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [forceManualMakeInput, setForceManualMakeInput] = useState(false);

  useEffect(() => {
    if (isGuestSession) setGuestAuthMode("register");
  }, [isGuestSession]);

  useEffect(() => {
    if (!isGuestSession) return;
    if (!isFirebaseEnabled() || !auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      setAccount((prev) => ({
        ...prev,
        email: prev.email?.trim() ? prev.email : u.email ?? prev.email,
        fullName: prev.fullName?.trim() ? prev.fullName : u.displayName ?? prev.fullName,
      }));
    });
    return () => unsub();
  }, [isGuestSession]);

  const persistGuestDraft = useCallback(async () => {
    if (!isGuestSession) return;
    try {
      const images: Record<string, { dataUrl: string; name: string }> = {};
      for (const [k, v] of Object.entries(imagesBySlot)) {
        // eslint-disable-next-line no-await-in-loop
        const dataUrl = await fileToDataUrl(v.file);
        images[k] = { dataUrl, name: v.file.name || `${k}.jpg` };
      }
      localStorage.setItem(
        GUEST_DRAFT_KEY,
        JSON.stringify({
          v: 1,
          guestAuthMode,
          account,
          formData,
          images,
        })
      );
    } catch {
      // ignore storage quota / serialization issues
    }
  }, [account, formData, guestAuthMode, imagesBySlot, isGuestSession]);

  useEffect(() => {
    if (!isGuestSession) return;
    let cancelled = false;
    (async () => {
      const raw = localStorage.getItem(GUEST_DRAFT_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as {
          guestAuthMode?: "register" | "login";
          account?: typeof account;
          formData?: typeof formData;
          images?: Record<string, { dataUrl: string; name: string }>;
        };
        if (cancelled) return;
        if (parsed.guestAuthMode) setGuestAuthMode(parsed.guestAuthMode);
        if (parsed.account) setAccount(parsed.account);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.images) {
          setImagesBySlot((prev) => {
            for (const v of Object.values(prev)) URL.revokeObjectURL(v.previewUrl);
            const next: Record<string, SlotImage> = {};
            for (const [k, item] of Object.entries(parsed.images || {})) {
              const file = dataUrlToFile(item.dataUrl, item.name || `${k}.jpg`);
              next[k] = { id: `${Date.now()}-${k}`, file, previewUrl: URL.createObjectURL(file) };
            }
            return next;
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGuestSession]);

  useEffect(() => {
    if (!isGuestSession) return;
    if (saveDraftTimer.current) window.clearTimeout(saveDraftTimer.current);
    saveDraftTimer.current = window.setTimeout(() => {
      void persistGuestDraft();
    }, 600);
    return () => {
      if (saveDraftTimer.current) window.clearTimeout(saveDraftTimer.current);
    };
  }, [account, formData, guestAuthMode, imagesBySlot, isGuestSession, persistGuestDraft]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "make") next.model = "";
      return next;
    });
    if (field === "make") setModels([]);
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      // If external make API hangs, unblock the form with manual input.
      setForceManualMakeInput(true);
      setMakesLoaded(true);
    }, 4000);
    let cancelled = false;
    getAllMakes()
      .then((list) => {
        if (!cancelled) setMakes(list);
      })
      .finally(() => {
        if (!cancelled) {
          window.clearTimeout(timeout);
          setMakesLoaded(true);
        }
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
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

  const oauthBusy = !!oauthLoading || submitting;

  const handleGuestGoogle = async () => {
    if (!isFirebaseEnabled() || !auth) {
      toast.error("Firebase is not configured");
      return;
    }
    try {
      await persistGuestDraft();
      setOauthLoading("google");
      await signInWithGoogle();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setOauthLoading(null);
    }
  };

  const handleGuestApple = async () => {
    if (!isFirebaseEnabled() || !auth) {
      toast.error("Firebase is not configured");
      return;
    }
    try {
      await persistGuestDraft();
      setOauthLoading("apple");
      await signInWithApple();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setOauthLoading(null);
    }
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
    const requiredImageSlots = ["front", "rear", "left", "right", "damage"];
    const missingRequired = requiredImageSlots.filter((slot) => !imagesBySlot[slot]);
    if (missingRequired.length > 0) {
      toast.error(t("photosDescription") ?? "Please upload required vehicle photos before submitting.");
      return;
    }

    const fullName = account.fullName;
    const accountEmail = account.email.trim();
    const authedEmail = auth?.currentUser?.email?.trim() ?? "";
    const effectiveEmail = accountEmail || authedEmail;
    const password = account.password;
    const confirmPassword = account.confirmPassword;

    if (isGuestSession) {
      if (!fullName.trim()) {
        toast.error(t("fullName") + " — " + (t("enterName") ?? "Required"));
        return;
      }

      if (guestAuthMode === "register") {
        if (!effectiveEmail) {
          toast.error(t("enterEmail"));
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
          toast.error(t("invalidEmail"));
          return;
        }
      } else if (guestAuthMode === "login" && !auth?.currentUser) {
        if (!effectiveEmail) {
          toast.error(t("enterEmail"));
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
          toast.error(t("invalidEmail"));
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      let contactEmail = "";

      if (isGuestSession) {
        const name = account.fullName;
        const typedEmail = account.email.trim();
        const password = account.password;
        const confirmPassword = account.confirmPassword;

        if (isFirebaseEnabled()) {
          const alreadySignedIn = !!auth?.currentUser;

          if (guestAuthMode === "register") {
            if (!alreadySignedIn) {
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

              const methods = auth ? await fetchSignInMethodsForEmail(auth, effectiveEmail) : [];
              if (methods.length > 0) {
                setGuestAuthMode("login");
                toast.info(t("alreadyHaveAccount") ?? "Account exists. Please sign in.");
                setSubmitting(false);
                return;
              }

              await registerCustomer({
                email: effectiveEmail,
                password,
                name: name.trim(),
              });
            }
            contactEmail = auth?.currentUser?.email || effectiveEmail;
          } else {
            if (!alreadySignedIn) {
              if (password.length < 6) {
                toast.error(t("passwordMinLength"));
                setSubmitting(false);
                return;
              }
              await loginWithEmailAndPassword(typedEmail || effectiveEmail, password);
            }
            contactEmail = auth?.currentUser?.email || typedEmail || effectiveEmail;
          }
        } else {
          if (guestAuthMode === "register") {
            login("customer", name.trim());
          } else {
            login("customer", (typedEmail || effectiveEmail).split("@")[0] || "Customer");
          }
          contactEmail = typedEmail || effectiveEmail;
        }
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
        const res = await uploadRequestImages(refId, imageList);
        imageUrls = res.urls;
        imageLabels = res.labels;
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
      if (isGuestSession) {
        try {
          localStorage.removeItem(GUEST_DRAFT_KEY);
        } catch {
          // ignore
        }
      }
      toast.success(t("requestSubmittedSuccess"));
      if (isGuestSession) {
        navigate(`/request/submitted?ref=${encodeURIComponent(refId)}&email=${encodeURIComponent(contactEmail || "")}`);
      } else {
        navigate(`/request/submitted?ref=${encodeURIComponent(refId)}`);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : String(err);
      toast.error(msg || t("registrationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const backHref = isGuestSession ? "/" : "/dashboard";
  const title = isGuestSession ? t("newRequestTitleGuest") : t("newRequestTitle");

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
  const useManualMakeInput = forceManualMakeInput || (makesLoaded && makes.length === 0);
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
          {isGuestSession && (
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
          {!isGuestSession && (
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

          {/* Guest: email sign-up or sign-in (+ optional OAuth) */}
          {isGuestSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  {guestAuthMode === "register" ? t("createAccount") : t("signIn")}
                </CardTitle>
                <CardDescription>
                  {guestAuthMode === "register"
                    ? t("yourEmailDescription")
                    : t("guestSignInEmailDescription")}
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

                    {isFirebaseEnabled() && (
                      <>
                        <div className="pt-1 text-center text-xs text-muted-foreground">{t("oauthSignUpDivider")}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            type="button"
                            variant="default"
                            className="h-11 w-full justify-center gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            disabled={oauthBusy}
                            onClick={handleGuestGoogle}
                          >
                            <Chrome className="h-4 w-4" />
                            {oauthLoading === "google" ? t("creatingAccount") : t("signUpWithGoogle")}
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            className="h-11 w-full justify-center gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            disabled={oauthBusy}
                            onClick={handleGuestApple}
                          >
                            <Apple className="h-4 w-4" />
                            {oauthLoading === "apple" ? t("creatingAccount") : t("signUpWithApple")}
                          </Button>
                        </div>
                      </>
                    )}

                    <div>
                      <Label htmlFor="request-email-reg">{t("email")}</Label>
                      <Input
                        id="request-email-reg"
                        type="email"
                        placeholder="you@example.com"
                        value={account.email}
                        onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="request-password-reg">{t("password")}</Label>
                      <Input
                        id="request-password-reg"
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
                      {t("alreadyHaveAccount")}{" "}
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
                      <Label htmlFor="request-email-login">{t("email")}</Label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="request-email-login"
                          type="email"
                          placeholder="you@example.com"
                          value={account.email}
                          onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="request-password-login">{t("password")}</Label>
                      <div className="relative mt-2">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="request-password-login"
                          type="password"
                          placeholder="••••••••"
                          value={account.password}
                          onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {isFirebaseEnabled() && (
                      <>
                        <div className="pt-1 text-center text-xs text-muted-foreground">{t("oauthContinueDivider")}</div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <Button
                            type="button"
                            variant="default"
                            className="h-11 w-full justify-center gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            disabled={oauthBusy}
                            onClick={handleGuestGoogle}
                          >
                            <Chrome className="h-4 w-4" />
                            {oauthLoading === "google" ? (t("signingIn") ?? "…") : t("continueWithGoogle")}
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            className="h-11 w-full justify-center gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            disabled={oauthBusy}
                            onClick={handleGuestApple}
                          >
                            <Apple className="h-4 w-4" />
                            {oauthLoading === "apple" ? (t("signingIn") ?? "…") : t("continueWithApple")}
                          </Button>
                        </div>
                      </>
                    )}

                    <p className="text-sm text-muted-foreground">
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
