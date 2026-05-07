import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, ArrowLeft, Upload, X, Camera, Clock, User, Apple, Chrome, ChevronsUpDown, ChevronDown } from "lucide-react";
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
import { decodeVin, getModelsForMake, type ModelItem } from "@/lib/vehicleApi";
import { resolveToTopMake, usTopMakeItems } from "@/lib/usTopMakes";
import { fetchSignInMethodsForEmail, onAuthStateChanged } from "firebase/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const { registerCustomer, login, signInWithGoogle, signInWithApple } = useAuth();
  // Misafir akışı: sayfa `/request/new` ile açıldıysa, kullanıcı sonradan giriş yapsa bile aynı form akışı devam etsin.
  const [isGuestSession] = useState(() => location.pathname === "/request/new");
  const [guestTermsAccepted, setGuestTermsAccepted] = useState(false);
  const [emailSignUpExpanded, setEmailSignUpExpanded] = useState(false);
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
  type RequestImage = { id: string; file: File; previewUrl: string };
  const [images, setImages] = useState<RequestImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const saveDraftTimer = useRef<number | null>(null);
  const [vinDecoding, setVinDecoding] = useState(false);
  const [makeOpen, setMakeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const sortedMakes = useMemo(
    () =>
      [...usTopMakeItems()].sort((a, b) =>
        a.makeName.localeCompare(b.makeName, undefined, { sensitivity: "base" }),
      ),
    [],
  );
  const sortedModels = useMemo(
    () =>
      [...models].sort((a, b) =>
        a.modelName.localeCompare(b.modelName, undefined, { sensitivity: "base" }),
      ),
    [models],
  );

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
      const draftImages: Array<{ dataUrl: string; name: string }> = [];
      for (const v of images) {
        // eslint-disable-next-line no-await-in-loop
        const dataUrl = await fileToDataUrl(v.file);
        draftImages.push({ dataUrl, name: v.file.name || "photo.jpg" });
      }
      localStorage.setItem(
        GUEST_DRAFT_KEY,
        JSON.stringify({
          v: 1,
          account,
          formData,
          images: draftImages,
        })
      );
    } catch {
      // ignore storage quota / serialization issues
    }
  }, [account, formData, images, isGuestSession]);

  useEffect(() => {
    if (!isGuestSession) return;
    let cancelled = false;
    (async () => {
      const raw = localStorage.getItem(GUEST_DRAFT_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as {
          account?: typeof account;
          formData?: typeof formData;
          images?: Array<{ dataUrl: string; name: string }> | Record<string, { dataUrl: string; name: string }>;
        };
        if (cancelled) return;
        if (parsed.account) {
          setAccount(parsed.account);
        }
        if (parsed.formData) {
          const rawMake = parsed.formData.make?.trim() ?? "";
          const resolvedMake = rawMake ? resolveToTopMake(rawMake) : null;
          setFormData({
            ...parsed.formData,
            make: rawMake ? (resolvedMake ?? "") : "",
          });
        }
        if (parsed.images) {
          setImages((prev) => {
            for (const v of Object.values(prev)) URL.revokeObjectURL(v.previewUrl);
            const next: RequestImage[] = [];
            const normalizedImages = Array.isArray(parsed.images)
              ? parsed.images
              : Object.values(parsed.images || {});
            for (const [idx, item] of normalizedImages.entries()) {
              const file = dataUrlToFile(item.dataUrl, item.name || `photo-${idx + 1}.jpg`);
              next.push({ id: `${Date.now()}-${idx}`, file, previewUrl: URL.createObjectURL(file) });
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
  }, [account, formData, images, isGuestSession, persistGuestDraft]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "make") next.model = "";
      return next;
    });
    if (field === "make") setModels([]);
  };

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
        const decodedMake = (result.make ?? "").trim();
        const resolvedMake = decodedMake ? resolveToTopMake(decodedMake) : null;
        setFormData((prev) => ({
          ...prev,
          make: decodedMake ? (resolvedMake ?? "") : prev.make,
          model: result.model || prev.model,
          year: result.year || prev.year,
          trim: result.trim || prev.trim,
        }));
        if (decodedMake && !resolvedMake) {
          toast.info(t("vinMakePickFromList"));
        }
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;
    setImages((prev) => {
      const remaining = 6 - prev.length;
      if (remaining <= 0) {
        toast.error(t("maxPhotosAllowed"));
        return prev;
      }
      if (picked.length > remaining) {
        toast.error(t("maxPhotosAllowed"));
      }
      const toAdd = picked.slice(0, remaining).map((file, idx) => ({
        id: `${Date.now()}-${idx}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...toAdd];
    });
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const oauthBusy = !!oauthLoading || submitting;

  const handleGuestGoogle = async () => {
    if (isGuestSession && !guestTermsAccepted) {
      toast.error(t("termsRequired"));
      return;
    }
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
    if (isGuestSession && !guestTermsAccepted) {
      toast.error(t("termsRequired"));
      return;
    }
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
    if (!formData.make.trim() || !formData.model.trim()) {
      toast.error(`${t("make")} / ${t("model")} — ${t("required") ?? "Required"}`);
      return;
    }
    if (!formData.desiredTimeframe) {
      toast.error(t("desiredTimeframeTitle"));
      return;
    }
    const zipTrimmed = formData.zipCode.trim().replace(/\D/g, "").slice(0, 5);
    if (zipTrimmed.length < 5) {
      toast.error(t("requestZipCode") + " — " + (t("requestZipCodePlaceholder") ?? "5 digits"));
      return;
    }
    if (images.length < 2) {
      toast.error(t("minPhotosRequired"));
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

      if (!guestTermsAccepted) {
        toast.error(t("termsRequired"));
        return;
      }
      if (!effectiveEmail) {
        toast.error(t("enterEmail"));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
        toast.error(t("invalidEmail"));
        return;
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
              toast.error(t("guestQuoteDuplicateEmail"));
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
          login("customer", name.trim());
          contactEmail = typedEmail || effectiveEmail;
        }
      }

      const vehicle = [formData.make, formData.model, formData.trim, formData.year].filter(Boolean).join(" ");
      const refId = generateRefId();
      const imageList = images.map((img, idx) => ({ file: img.file, label: `${t("photo")} ${idx + 1}` }));
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

  const timeframeOptions = [
    { value: "asap", labelKey: "desiredTimeframeAsap" },
    { value: "1week", labelKey: "desiredTimeframe1Week" },
    { value: "2weeks", labelKey: "desiredTimeframe2Weeks" },
    { value: "3-4weeks", labelKey: "desiredTimeframe3To4Weeks" },
    { value: "1month+", labelKey: "desiredTimeframe1MonthPlus" },
  ];
  const useManualModelInput = !!formData.make && !modelsLoading && models.length === 0;

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border/80 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <div className="app-header-pt container mx-auto flex max-w-3xl items-center gap-2 px-4 pb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => navigate(backHref)}
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-accent">
              <Car className="h-4 w-4 text-accent-foreground" />
            </div>
            <h1 className="truncate font-display text-base font-bold tracking-tight sm:text-lg">{title}</h1>
          </div>
        </div>
      </header>

      <main className="app-safe-pb container mx-auto max-w-3xl flex-1 overflow-y-auto overscroll-y-contain px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos first — same order for guest (/request/new) and logged-in (/dashboard/new-request) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" />
                {t("photos")}
              </CardTitle>
              <CardDescription>
                {t("photosUploadRule")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="mb-4 block rounded-xl border-2 border-dashed border-border p-5 text-center transition-colors hover:border-accent/50 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{t("uploadPhotos")}</p>
                <p className="text-xs text-muted-foreground">{images.length}/6</p>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((img, index) => (
                  <div key={img.id} className="space-y-1">
                    <div className="relative aspect-square w-full rounded-lg border border-border overflow-hidden bg-muted group">
                      <img src={img.previewUrl} alt={`${t("photo")} ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground text-center mt-1">
                      {t("photo")} {index + 1}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                  <Label htmlFor="make-trigger">{t("make")}</Label>
                  <Popover open={makeOpen} onOpenChange={setMakeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="make-trigger"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={makeOpen}
                        className="w-full justify-between"
                      >
                        {formData.make || (t("makePlaceholder") ?? "Select make")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                      side="bottom"
                      avoidCollisions={false}
                    >
                      <div className="max-h-[min(50vh,280px)] overflow-y-auto p-1">
                        {sortedMakes.length === 0 ? (
                          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                            {t("noResults") ?? "No results."}
                          </p>
                        ) : (
                          sortedMakes.map((m) => (
                            <button
                              key={m.makeId}
                              type="button"
                              className={cn(
                                "w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                                formData.make === m.makeName && "bg-accent/15 font-medium"
                              )}
                              onClick={() => {
                                updateField("make", m.makeName);
                                setMakeOpen(false);
                              }}
                            >
                              {m.makeName}
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
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
                    <Popover open={modelOpen} onOpenChange={setModelOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={modelOpen}
                          className="w-full justify-between"
                          disabled={!formData.make || modelsLoading}
                        >
                          {formData.model || (modelsLoading ? (t("loading") ?? "Loading…") : (t("modelPlaceholder") ?? "Select model"))}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                        side="bottom"
                        avoidCollisions={false}
                      >
                        <div className="max-h-[min(50vh,280px)] overflow-y-auto p-1">
                          {sortedModels.length === 0 ? (
                            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                              {t("noResults") ?? "No results."}
                            </p>
                          ) : (
                            sortedModels.map((m) => (
                              <button
                                key={m.modelId}
                                type="button"
                                className={cn(
                                  "w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                                  formData.model === m.modelName && "bg-accent/15 font-medium",
                                )}
                                onClick={() => {
                                  updateField("model", m.modelName);
                                  setModelOpen(false);
                                }}
                              >
                                {m.modelName}
                              </button>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
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

          {/* Guest: create account only (no sign-in form on this page) */}
          {isGuestSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  {t("createAccount")}
                </CardTitle>
                <CardDescription>{t("yourEmailDescription")}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                    <Collapsible open={emailSignUpExpanded} onOpenChange={setEmailSignUpExpanded}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-center gap-1.5 py-2 text-center text-sm font-medium text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                        >
                          {t("signUpWithEmail")}
                          <ChevronDown
                            className={cn("h-4 w-4 shrink-0 transition-transform duration-200", emailSignUpExpanded && "rotate-180")}
                            aria-hidden
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-1">
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
                      </CollapsibleContent>
                    </Collapsible>

                    <label htmlFor="guest-terms" className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <Checkbox
                        id="guest-terms"
                        checked={guestTermsAccepted}
                        onCheckedChange={(v) => setGuestTermsAccepted(v === true)}
                        className="mt-0.5"
                        aria-required
                      />
                      <span className="text-sm leading-snug text-muted-foreground">{t("termsAndPrivacy")}</span>
                    </label>

                    {isFirebaseEnabled() && (
                      <>
                        <div className="pt-1 text-center text-xs text-muted-foreground">{t("oauthSignUpDivider")}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            type="button"
                            variant="default"
                            className="h-11 w-full justify-center gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            disabled={oauthBusy || !guestTermsAccepted}
                            onClick={handleGuestGoogle}
                          >
                            <Chrome className="h-4 w-4" />
                            {oauthLoading === "google" ? t("creatingAccount") : t("signUpWithGoogle")}
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            className="h-11 w-full justify-center gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                            disabled={oauthBusy || !guestTermsAccepted}
                            onClick={handleGuestApple}
                          >
                            <Apple className="h-4 w-4" />
                            {oauthLoading === "apple" ? t("creatingAccount") : t("signUpWithApple")}
                          </Button>
                        </div>
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
            <Button
              type="submit"
              variant="hero"
              className="flex-1"
              disabled={submitting || (isGuestSession && !guestTermsAccepted)}
            >
              {submitting ? (t("creatingAccount") ?? "Creating account…") : t("submitRequest")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default NewRequest;
