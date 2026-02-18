import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, ArrowLeft, MessageCircle, MapPin, Clock, Send, Loader2, ImageIcon } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getShopRequestById } from "@/lib/shopRequests";
import { getSubmittedRequestByRefId } from "@/lib/submittedRequestsStore";
import { getRequestFromFirestore } from "@/lib/requestsFirestore";
import type { SubmittedRequest } from "@/lib/submittedRequestsStore";
import { addQuote } from "@/lib/quotesStore";
import { useLanguage } from "@/lib/LanguageContext";
import { toast } from "sonner";

/** WhatsApp number: country code + number, no + or spaces. Default: +1 954 2499084 */
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "").slice(0, 12) || "19542499084";

function isRefId(id: string): boolean {
  return /^CC-[A-Z0-9]+-[A-Z0-9]+$/i.test(id);
}

const QuotePage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [fetchedRequest, setFetchedRequest] = useState<SubmittedRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    shopName: "",
    price: "",
    estimatedTimeSelect: "",
    estimatedTimeOther: "",
    estimatedHours: "",
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
  const submitted = id && isRefId(id) ? getSubmittedRequestByRefId(id) ?? null : null;
  const legacy = id && !isRefId(id) ? getShopRequestById(parseInt(id, 10)) : null;
  const request = submitted ?? fetchedRequest ?? legacy;
  const refDisplay = submitted ? submitted.refId : fetchedRequest ? fetchedRequest.refId : legacy ? `#${legacy.id}` : "";
  const requestRefId = id ?? "";

  useEffect(() => {
    if (!id || !isRefId(id) || submitted) return;
    let cancelled = false;
    setLoading(true);
    getRequestFromFirestore(id)
      .then((data) => {
        if (!cancelled) setFetchedRequest(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setFetchedRequest(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setFetchedRequest(null);
      }
    }, 12000);
    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, [id, submitted]);

  if (loading) {
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-muted-foreground mb-4">{t("requestNotFound")}</p>
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

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(form.price.replace(/[^0-9.]/g, ""));
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
    addQuote(requestRefId, {
      shopName: form.shopName.trim() || t("quoteFormShopNamePlaceholder") ?? "Body Shop",
      address: "",
      email: "",
      phone: "",
      price: priceNum,
      estimatedCompletion,
    });
    setQuoteSubmitted(true);
    toast.success(t("quoteSubmittedSuccess"));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("backToHome")}
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 gradient-accent rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">
                Collision <span className="text-accent">Collect</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-xl">
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

                <div>
                  <Label htmlFor="shopName" className="text-muted-foreground font-normal text-sm">
                    {t("quoteFormShopName")} ({t("optional") ?? "optional"})
                  </Label>
                  <Input
                    id="shopName"
                    value={form.shopName}
                    onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))}
                    placeholder={t("quoteFormShopNamePlaceholder")}
                    className="mt-1"
                  />
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
