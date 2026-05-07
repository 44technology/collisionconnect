import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, ArrowLeft, MessageCircle, MapPin, Clock, Send, Loader2, ImageIcon } from "lucide-react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getShopRequestById } from "@/lib/shopRequests";
import { getSubmittedRequestByRefId, isRefId } from "@/lib/submittedRequestsStore";
import { getRequestFromFirestore } from "@/lib/requestsFirestore";
import { isFirebaseEnabled } from "@/lib/firebase";
import type { SubmittedRequest } from "@/lib/submittedRequestsStore";
import { addQuoteAsync } from "@/lib/quotesStore";
import { useLanguage } from "@/lib/LanguageContext";
import { toast } from "sonner";

/** WhatsApp number: country code + number, no + or spaces. Default: +1 954 2499084 */
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "").slice(0, 12) || "19542499084";

const QuotePage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [fetchedRequest, setFetchedRequest] = useState<SubmittedRequest | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [form, setForm] = useState(() => {
    const n = searchParams.get("n") ?? "";
    const p = searchParams.get("p") ?? "";
    const e = searchParams.get("e") ?? "";
    const a = searchParams.get("a") ?? "";
    return {
      shopName: n,
      contactPerson: "",
      address: a,
      email: e,
      phone: p ? (p.replace(/\D/g, "").length > 0 ? (p.startsWith("+") ? p : `+${p}`) : "") : "",
      price: "",
      estimatedTimeSelect: "",
      estimatedTimeOther: "",
      estimatedHours: "",
    };
  });

  const timeOptions = [
    { value: "sameDay", labelKey: "quoteTimeSameDay" },
    { value: "1-2days", labelKey: "quoteTime1_2Days" },
    { value: "3-5days", labelKey: "quoteTime3_5Days" },
    { value: "1week", labelKey: "quoteTime1Week" },
    { value: "2weeks", labelKey: "quoteTime2Weeks" },
    { value: "3-4weeks", labelKey: "quoteTime3_4Weeks" },
    { value: "1month+", labelKey: "quoteTime1MonthPlus" },
    { value: "other", labelKey: "quoteTimeOther" },
  ] as const;
  /** Same device may have stale localStorage; body-shop quote links must always prefer Firestore when enabled. */
  const localSubmitted = id && isRefId(id) ? getSubmittedRequestByRefId(id) ?? null : null;
  const legacy = id && !isRefId(id) ? getShopRequestById(parseInt(id, 10)) : null;
  const remoteForThisId =
    fetchedRequest && id && fetchedRequest.refId === id ? fetchedRequest : null;
  const request = remoteForThisId ?? localSubmitted ?? legacy;
  const refDisplay =
    request && "refId" in request && typeof request.refId === "string"
      ? request.refId
      : legacy
        ? `#${legacy.id}`
        : "";
  const requestRefId = id ?? "";

  const needsRemoteQuote =
    !!id && isRefId(id) && isFirebaseEnabled();

  const [remoteReady, setRemoteReady] = useState(() => !needsRemoteQuote);

  useEffect(() => {
    if (!id || !isRefId(id)) {
      setRemoteReady(true);
      setFetchedRequest(null);
      return;
    }
    if (!isFirebaseEnabled()) {
      setRemoteReady(true);
      return;
    }
    let cancelled = false;
    setRemoteReady(false);
    getRequestFromFirestore(id)
      .then((data) => {
        if (!cancelled) setFetchedRequest(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setFetchedRequest(null);
      })
      .finally(() => {
        if (!cancelled) setRemoteReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const showQuoteLoading = needsRemoteQuote && !remoteReady;

  if (showQuoteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">{t("loading") || "Loading…"}</p>
        </div>
      </div>
    );
  }

  if (!request) {
    const isRef = id && isRefId(id);
    const firebaseOff = !isFirebaseEnabled();
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <p className="text-muted-foreground">{t("requestNotFound")}</p>
          {isRef && (
            <p className="text-sm text-muted-foreground">
              {firebaseOff
                ? (t("quoteLinkDbHint") ?? "Firebase is not configured. Set VITE_FIREBASE_* env vars and deploy so quote links load from the database.")
                : (t("quoteLinkNotFoundHint") ?? "This request may not exist in the database yet. Ensure the customer submitted after Firebase was set up.")}
            </p>
          )}
          <Button asChild variant="outline">
            <Link to="/">{t("backToHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const timeframeLabel =
    request.desiredTimeframe
      ? t(
          {
            asap: "desiredTimeframeAsap",
            "1week": "desiredTimeframe1Week",
            "2weeks": "desiredTimeframe2Weeks",
            "3-4weeks": "desiredTimeframe3To4Weeks",
            "1month+": "desiredTimeframe1MonthPlus",
          }[request.desiredTimeframe] ?? "desiredTimeframeAsap"
        )
      : "";

  const message = [
    `Hello, I would like to submit a quote for the repair request.`,
    ``,
    `Reference: ${refDisplay}`,
    `Vehicle: ${request.vehicle}${request.trim ? ` ${request.trim}` : ""}`,
    `Damage: ${request.damage}`,
    request.zipCode ? `Location (ZIP): ${request.zipCode}` : "",
    timeframeLabel ? `Customer requested completion: ${timeframeLabel}` : "",
    ``,
    `My quote: $______`,
    `Estimated completion: ______`,
    ``,
    `Best regards,`,
    `[Your shop name]`,
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(form.price.replace(/[^0-9.]/g, ""));
    if (!form.shopName.trim()) {
      toast.error(t("quoteFormShopNameRequired"));
      return;
    }
    if (!form.email.trim()) {
      toast.error(t("enterEmail"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error(t("invalidEmail"));
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error(t("quoteFormPriceRequired"));
      return;
    }
    let estimatedCompletion = "";
    if (form.estimatedTimeSelect === "other") {
      estimatedCompletion = form.estimatedTimeOther.trim();
      if (!estimatedCompletion) {
        toast.error(t("quoteFormCompletionRequired"));
        return;
      }
    } else if (form.estimatedTimeSelect) {
      const opt = timeOptions.find((o) => o.value === form.estimatedTimeSelect);
      estimatedCompletion = opt ? t(opt.labelKey) : form.estimatedTimeSelect;
    } else {
      toast.error(t("quoteFormCompletionRequired"));
      return;
    }
    if (form.estimatedHours.trim()) {
      estimatedCompletion += ` (${form.estimatedHours.trim()})`;
    }
    try {
      await addQuoteAsync(requestRefId, {
        shopName: form.shopName.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        address: form.address.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        price: priceNum,
        estimatedCompletion,
      });
      setQuoteSubmitted(true);
      toast.success(t("quoteSubmittedSuccess"));
    } catch (e) {
      toast.error(t("quoteSubmitFailed") ?? "Could not save quote.");
    }
  };

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border/80 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <div className="app-header-pt container mx-auto flex max-w-xl items-center justify-between gap-3 px-4 pb-3">
          <Link
            to="/"
            className="inline-flex min-w-0 shrink items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="truncate text-sm font-medium sm:text-base">{t("backToHome")}</span>
          </Link>
          <img
            src="/fixy-logo-transparent.png"
            alt="Fixly"
            className="h-9 w-auto max-w-[42%] shrink-0 object-contain object-right sm:h-10 sm:max-w-[45%]"
          />
        </div>
      </header>

      <main className="app-safe-pb container mx-auto max-w-xl flex-1 overflow-y-auto overscroll-y-contain px-4 py-8">
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground">
          {t("quotePageTrustBanner")}
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {t("quotePageTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("quotePageSubtitle")}
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5 text-accent" />
              {request.vehicle}{request.trim ? ` ${request.trim}` : ""}
            </CardTitle>
            <CardDescription>Request {refDisplay}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{t("damageDetails")}</p>
              <p className="text-sm text-foreground">{request.damage}</p>
            </div>
            {((request as { location?: string }).location || request.zipCode) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>
                  {(request as { location?: string }).location}
                  {request.zipCode && ` · ${t("zip")} ${request.zipCode}`}
                </span>
              </div>
            )}
            {request.desiredTimeframe && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  {t("desiredTimeframeLabel")}: {timeframeLabel}
                </span>
              </div>
            )}
            {request.additionalNotes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("additionalNotes")}</p>
                <p className="text-sm text-foreground">{request.additionalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {(request as { imageUrls?: string[] }).imageUrls?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="w-5 h-5 text-accent" />
                {t("photos")} ({(request as { imageUrls?: string[] }).imageUrls!.length})
              </CardTitle>
              <CardDescription>{t("photosDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(request as { imageUrls?: string[]; imageLabels?: string[] }).imageUrls!.map((url, index) => (
                  <div key={index} className="space-y-1">
                    <button
                      type="button"
                      className="aspect-square w-full rounded-lg border border-border overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                      onClick={() => setLightboxImage(url)}
                    >
                      <img
                        src={url}
                        alt={(request as { imageLabels?: string[] }).imageLabels?.[index] ?? `Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    {(request as { imageLabels?: string[] }).imageLabels?.[index] && (
                      <p className="text-xs text-muted-foreground truncate text-center">
                        {(request as { imageLabels?: string[] }).imageLabels![index]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Escape" && setLightboxImage(null)}
          >
            <img
              src={lightboxImage}
              alt="Enlarged"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {!quoteSubmitted ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">{t("quoteFormTitle")}</CardTitle>
              <CardDescription>{t("quoteFormSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQuoteSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">{t("quoteFormPrice")}</Label>
                    <Input
                      id="price"
                      type="text"
                      inputMode="decimal"
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="1,500"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>{t("quoteFormTimeLabel")}</Label>
                    <Select
                      value={form.estimatedTimeSelect}
                      onValueChange={(v) => setForm((p) => ({ ...p, estimatedTimeSelect: v }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("quoteFormTimePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.estimatedTimeSelect === "other" && (
                  <div>
                    <Label htmlFor="estimatedTimeOther">{t("quoteTimeOther")}</Label>
                    <Input
                      id="estimatedTimeOther"
                      value={form.estimatedTimeOther}
                      onChange={(e) => setForm((p) => ({ ...p, estimatedTimeOther: e.target.value }))}
                      placeholder="e.g. 10 days, by Jan 25"
                      className="mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="estimatedHours" className="text-muted-foreground font-normal text-sm">
                    {t("quoteFormHoursOptional")}
                  </Label>
                  <Input
                    id="estimatedHours"
                    value={form.estimatedHours}
                    onChange={(e) => setForm((p) => ({ ...p, estimatedHours: e.target.value }))}
                    placeholder={t("quoteFormHoursPlaceholder")}
                    className="mt-1"
                  />
                </div>

                <div className="border-t border-border pt-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">{t("quoteFormYourDetails")}</p>
                  <div>
                    <Label htmlFor="shopName">{t("quoteFormShopName")}</Label>
                    <Input
                      id="shopName"
                      value={form.shopName}
                      onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))}
                      placeholder={t("quoteFormShopNamePlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">{t("quoteFormContactPerson")} ({t("optional")})</Label>
                    <Input
                      id="contactPerson"
                      value={form.contactPerson}
                      onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
                      placeholder={t("quoteFormContactPersonPlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">{t("quoteFormAddress")} ({t("optional")})</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder={t("quoteFormAddressPlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">{t("quoteFormEmail")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="shop@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{t("quoteFormPhone")}</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+1 234 567 8900"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" variant="hero">
                  <Send className="w-4 h-4 mr-2" />
                  {t("quoteFormSubmit")}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-success mb-6 text-center font-medium">{t("quoteSubmittedSuccess")}</p>
        )}

        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              {t("quotePageCtaDesc")}
            </p>
            <Button
              asChild
              size="lg"
              className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white border-0"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5 mr-2" />
                {t("quotePageWhatsAppCta")}
              </a>
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {t("quotePageWhatsAppHint")}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          {t("quotePageFooter")}
        </p>
      </main>
    </div>
  );
};

export default QuotePage;
