import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Car, ArrowLeft, Clock, CheckCircle, DollarSign, Building2, LogOut, MapPin, ImageIcon, Lock, CreditCard, ChevronDown, Hourglass, Inbox, Unlock, CircleHelp } from "lucide-react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/authContext";
import { useBids, shopAmountToCustomerPrice } from "@/lib/bidsStore";
import { getShopRequestById } from "@/lib/shopRequests";
import { getSubmittedRequestByRefId, isRefId as checkRefId } from "@/lib/submittedRequestsStore";
import { getRequestFromFirestore } from "@/lib/requestsFirestore";
import { getQuotesByRequestRefIdAsync, type BodyShopQuote } from "@/lib/quotesStore";
import { getVisibleQuoteIdsAsync } from "@/lib/visibleQuotesStore";
import { isUnlockedAsync, setUnlockedAsync } from "@/lib/unlockStore";
import { isIapUnlockAvailable, purchaseUnlockWithIap } from "@/lib/iapUnlock";
import { createUnlockCheckout, verifyUnlockSession } from "@/lib/unlockWebPayment";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const isRefId = checkRefId;

function extractUsZip(text: string): string | undefined {
  if (!text?.trim()) return undefined;
  const m = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : undefined;
}

/** Düşük = müşteri ZIP’ine daha yakın (US 5 haneli). */
function zipProximityScore(customerZip: string, shopZip: string): number {
  const r = customerZip.replace(/\D/g, "").slice(0, 5);
  const s = shopZip.replace(/\D/g, "").slice(0, 5);
  if (!r) return 999_999;
  if (!s) return 500_000;
  if (r === s) return 0;
  const rn = parseInt(r, 10);
  const sn = parseInt(s, 10);
  if (r.slice(0, 3) === s.slice(0, 3)) return 1000 + Math.abs(rn - sn);
  return 100_000 + Math.abs(rn - sn);
}

const demoRequests = [
  { id: 1, vehicle: "2022 Toyota Camry", damage: "Front bumper and headlight damage", status: "active", createdAt: "2024-01-15" },
  { id: 2, vehicle: "2021 Honda Civic", damage: "Right door and fender damage", status: "pending", createdAt: "2024-01-18" },
  { id: 3, vehicle: "2020 BMW 3 Series", damage: "Rear bumper and trunk damage", status: "completed", createdAt: "2024-01-10" },
];

const RequestDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const isShopArea = location.pathname.includes("/shop/");
  const dashboardPath = isShopArea ? "/shop/dashboard" : "/dashboard";
  const { t, locale } = useLanguage();
  const { logout } = useAuth();
  const { getVisibleBids } = useBids();
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlocked, setUnlockedState] = useState(false);
  const [quotes, setQuotes] = useState<BodyShopQuote[]>([]);
  const [quoteSort, setQuoteSort] = useState<"price" | "proximity">("price");
  const [photosSectionOpen, setPhotosSectionOpen] = useState(false);
  const [firestoreRequest, setFirestoreRequest] = useState<{
    vehicle: string;
    damage: string;
    status: "active";
    createdAt: string;
    trim?: string;
    zipCode: string;
    desiredTimeframe?: string;
    additionalNotes?: string;
    imageUrls: string[];
    imageLabels: string[];
    location?: string;
  } | null>(null);
  const [requestLoading, setRequestLoading] = useState(!!(id && isRefId(id)));
  const isDevUnlockBypass =
    import.meta.env.DEV && String(import.meta.env.VITE_UNLOCK_BYPASS || "").toLowerCase() === "true";

  const requestRefId = id ?? "";
  const submitted = id && isRefId(id) ? getSubmittedRequestByRefId(id) : null;
  const numericId = id && !isRefId(id) ? parseInt(id, 10) : NaN;
  const legacyRequest = Number.isNaN(numericId) ? null : demoRequests.find((r) => r.id === numericId);
  const fullRequest = Number.isNaN(numericId) ? null : getShopRequestById(numericId);
  const legacyVisibleBids = useMemo(
    () => (Number.isNaN(numericId) ? [] : getVisibleBids(numericId)),
    [numericId, getVisibleBids]
  );

  useEffect(() => {
    if (!id || !isRefId(id)) {
      setRequestLoading(false);
      return;
    }
    let cancelled = false;
    setRequestLoading(true);
    getRequestFromFirestore(id).then((data) => {
      if (cancelled) return;
      setRequestLoading(false);
      if (!data) return;
      setFirestoreRequest({
        vehicle: data.vehicle,
        damage: data.damage,
        status: "active",
        createdAt: data.createdAt,
        trim: data.trim,
        zipCode: data.zipCode,
        desiredTimeframe: data.desiredTimeframe,
        additionalNotes: data.additionalNotes,
        imageUrls: data.imageUrls ?? [],
        imageLabels: data.imageLabels ?? [],
        location: "",
      });
    }).catch(() => {
      if (!cancelled) setRequestLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  const request = firestoreRequest
    ? firestoreRequest
    : submitted
      ? {
          vehicle: submitted.vehicle,
          damage: submitted.damage,
          status: "active" as const,
          createdAt: submitted.createdAt,
          trim: submitted.trim,
          zipCode: submitted.zipCode,
          desiredTimeframe: submitted.desiredTimeframe,
          additionalNotes: submitted.additionalNotes,
          imageUrls: submitted.imageUrls ?? [],
          imageLabels: submitted.imageLabels ?? [],
          location: "",
        }
      : legacyRequest && fullRequest
        ? {
            vehicle: fullRequest.vehicle + (fullRequest.trim ? ` ${fullRequest.trim}` : ""),
            damage: fullRequest.damage,
            status: legacyRequest.status,
            createdAt: legacyRequest.createdAt,
            trim: fullRequest.trim,
            zipCode: fullRequest.zipCode,
            desiredTimeframe: fullRequest.desiredTimeframe,
            additionalNotes: fullRequest.additionalNotes,
            imageUrls: fullRequest.imageUrls ?? [],
            imageLabels: fullRequest.imageLabels ?? [],
            location: fullRequest.location,
          }
        : null;

  useEffect(() => {
    if (!requestRefId) return;
    // Legacy numeric request flow: offers come from bidsStore (admin visibility),
    // while CC- ref requests come from quotesStore/Firestore.
    if (!isRefId(requestRefId)) {
      const mapped: BodyShopQuote[] = legacyVisibleBids
        .map((b) => ({
          id: b.id,
          requestRefId,
          shopName: b.shopName ?? "Body shop",
          address: "",
          email: "",
          phone: "",
          price: shopAmountToCustomerPrice(b.amount),
          estimatedCompletion: b.note?.trim() || "TBD",
          createdAt: new Date(b.createdAt ?? Date.now()).toISOString(),
        }))
        .sort((a, b) => {
          if (a.price !== b.price) return a.price - b.price;
          return String(a.estimatedCompletion ?? "").localeCompare(String(b.estimatedCompletion ?? ""));
        });
      setQuotes(mapped);
      // Legacy akışta da body shop detayları ödeme sonrası açılmalı.
      void isUnlockedAsync(requestRefId).then((isUnlockedNow) => {
        setUnlockedState(isUnlockedNow);
      });
      return;
    }

    let cancelled = false;
    Promise.all([
      getQuotesByRequestRefIdAsync(requestRefId),
      getVisibleQuoteIdsAsync(requestRefId),
      isUnlockedAsync(requestRefId),
    ]).then(([allQuotes, visibleIds, isUnlockedNow]) => {
      if (cancelled) return;
      const sorted = [...allQuotes].sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        return String(a.estimatedCompletion ?? "").localeCompare(String(b.estimatedCompletion ?? ""));
      });
      let display = sorted;
      if (visibleIds.length > 0) {
        const filtered = sorted.filter((q) => visibleIds.includes(q.id));
        display = filtered.length > 0 ? filtered : sorted;
      }
      setQuotes(display);
      setUnlockedState(isUnlockedNow);
    });
    return () => {
      cancelled = true;
    };
  }, [requestRefId, legacyVisibleBids]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || !requestRefId) return;
    let cancelled = false;
    verifyUnlockSession(sessionId).then(async (result) => {
      if (cancelled) return;
      if ("success" in result && result.success && result.requestRefId === requestRefId) {
        await setUnlockedAsync(result.requestRefId);
        if (cancelled) return;
        setUnlockedState(true);
        toast.success(t("unlockedSuccess"));
      } else if ("error" in result) {
        toast.error(result.error || t("paymentVerifyFailed"));
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("session_id");
        return next;
      }, { replace: true });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestRefId, searchParams.get("session_id")]);

  const handleUnlockPay = async () => {
    if (!requestRefId) return;
    if (isDevUnlockBypass) {
      await setUnlockedAsync(requestRefId);
      setUnlockedState(true);
      setUnlockModalOpen(false);
      toast.success(t("unlockedSuccess"));
      return;
    }
    if (isIapUnlockAvailable()) {
      try {
        setUnlockLoading(true);
        const result = await purchaseUnlockWithIap();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        await setUnlockedAsync(requestRefId);
        setUnlockedState(true);
        setUnlockModalOpen(false);
        toast.success(t("unlockedSuccess"));
      } finally {
        setUnlockLoading(false);
      }
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const successUrl = `${origin}${location.pathname}`;
    const cancelUrl = successUrl;
    setUnlockLoading(true);
    const checkout = await createUnlockCheckout(requestRefId, successUrl, cancelUrl);
    setUnlockLoading(false);
    if ("error" in checkout) {
      toast.error(checkout.error);
      return;
    }
    window.location.href = checkout.url;
  };

  const customerZipNorm = (request?.zipCode ?? "").replace(/\D/g, "").slice(0, 5);

  const lowestPriceQuoteId = useMemo(() => {
    if (quotes.length === 0) return null;
    return quotes.reduce((best, q) => (q.price < best.price ? q : best), quotes[0]).id;
  }, [quotes]);

  const sortedQuotes = useMemo(() => {
    const list = [...quotes];
    if (quoteSort === "price") {
      list.sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        return String(a.estimatedCompletion ?? "").localeCompare(String(b.estimatedCompletion ?? ""));
      });
      return list;
    }
    list.sort((a, b) => {
      const za = extractUsZip(a.address) ?? "";
      const zb = extractUsZip(b.address) ?? "";
      const da = zipProximityScore(customerZipNorm, za);
      const db = zipProximityScore(customerZipNorm, zb);
      if (da !== db) return da - db;
      if (a.price !== b.price) return a.price - b.price;
      return String(a.estimatedCompletion ?? "").localeCompare(String(b.estimatedCompletion ?? ""));
    });
    return list;
  }, [quotes, quoteSort, customerZipNorm]);

  if (requestLoading && !request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">{t("loading") ?? "Loading…"}</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("requestNotFound")}</p>
          <Button onClick={() => navigate(dashboardPath)}>{t("backToDashboard")}</Button>
        </div>
      </div>
    );
  }

  const bestQuotePrice = quotes.length > 0 ? Math.min(...quotes.map((q) => q.price)) : null;

  const unlockSummaryHint =
    locale === "es"
      ? `Has recibido ${quotes.length} ${quotes.length === 1 ? "oferta" : "ofertas"}. Paga ${t("unlockQuotesPrice")} para ver taller, teléfono, email y dirección.`
      : `You have ${quotes.length} ${quotes.length === 1 ? "offer" : "offers"}. Pay ${t("unlockQuotesPrice")} to reveal shop name, phone, email, and address.`;

  const payMethodLabel = isIapUnlockAvailable() ? t("payWithApple") : t("payWithCard");

  const getStatusBadge = () => {
    if (request.status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          {t("completed")}
        </span>
      );
    }
    if (unlocked) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/15 text-accent rounded-full text-xs font-medium">
          <Unlock className="w-3 h-3" />
          {t("statusRevealed")}
        </span>
      );
    }
    if (quotes.length > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
          <Inbox className="w-3 h-3" />
          {t("statusOffersReceived")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
        <Hourglass className="w-3 h-3" />
        {t("statusWaitingOffers")}
      </span>
    );
  };

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border/80 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <div className="app-header-pt container mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={() => navigate(dashboardPath)}
              aria-label={t("back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-accent sm:h-10 sm:w-10">
                <Car className="h-5 w-5 text-accent-foreground sm:h-6 sm:w-6" />
              </div>
              <span className="truncate font-display text-sm font-bold sm:text-base">
                Fixly
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isShopArea ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                aria-label={t("help")}
                onClick={() => setHelpModalOpen(true)}
              >
                <CircleHelp className="h-5 w-5" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="app-safe-pb container mx-auto flex-1 overflow-y-auto overscroll-y-contain px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl">{request.vehicle}</CardTitle>
                {getStatusBadge()}
              </div>
              {isRefId(requestRefId) ? (
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {t("requestReference")}: {requestRefId}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground mt-1">Submitted {request.createdAt}</p>
              {((request as { location?: string }).location || request.zipCode) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {(request as { location?: string }).location}
                  {request.zipCode && (
                    <span className="ml-1">· {t("zip")} {request.zipCode}</span>
                  )}
                </p>
              )}
              {request.desiredTimeframe && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {t("desiredTimeframeLabel")}: {t(
                    { asap: "desiredTimeframeAsap", "1week": "desiredTimeframe1Week", "2weeks": "desiredTimeframe2Weeks", "3-4weeks": "desiredTimeframe3To4Weeks", "1month+": "desiredTimeframe1MonthPlus" }[request.desiredTimeframe] ?? "desiredTimeframeAsap"
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{t("damageDetails")}</p>
                <p className="text-sm text-foreground">{request.damage}</p>
                {request.additionalNotes && (
                  <p className="text-xs text-muted-foreground mt-1">{request.additionalNotes}</p>
                )}
              </div>
              {quotes.length > 0 && bestQuotePrice != null && (
                <div className="flex items-center gap-2 text-success">
                  <DollarSign className="w-4 h-4" />
                  <span>{t("bestPrice")}:</span>
                  <span className="font-semibold">${bestQuotePrice.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {quotes.length > 0 && (
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {t("quotesOffersTitle")} ({quotes.length})
                  </CardTitle>
                  <div className="flex flex-col gap-1 sm:items-end shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{t("sortOffersBy")}</span>
                      <Select value={quoteSort} onValueChange={(v) => setQuoteSort(v as "price" | "proximity")}>
                        <SelectTrigger className="h-9 w-full min-w-[200px] sm:w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price">{t("sortByPrice")}</SelectItem>
                          <SelectItem value="proximity">{t("sortByProximityZip")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {quoteSort === "proximity" && (
                      <p className="text-[11px] text-muted-foreground max-w-[280px] sm:text-right">{t("sortByProximityZipHint")}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t("quotesOffersSubtitle")}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {sortedQuotes.map((quote, index) => (
                    <li
                      key={quote.id}
                      className="rounded-lg border border-border bg-card overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-accent">${quote.price.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{t("quoteEstimatedCompletion")}: {quote.estimatedCompletion}</p>
                          </div>
                        </div>
                        {quote.id === lowestPriceQuoteId && (
                          <span className="text-xs text-success font-medium shrink-0">{t("bestPrice")}</span>
                        )}
                      </div>
                      {unlocked ? (
                        <div className="px-3 pb-3 pt-0 space-y-1.5 text-sm border-t border-border mt-0 pt-3 bg-muted/30">
                          <p className="font-medium text-foreground">{t("bodyShopDetails")}</p>
                          <p><span className="text-muted-foreground">{t("shopName")}:</span> {quote.shopName}</p>
                          {quote.contactPerson && <p><span className="text-muted-foreground">{t("contactPerson")}:</span> {quote.contactPerson}</p>}
                          {quote.address && <p><span className="text-muted-foreground">{t("address")}:</span> {quote.address}</p>}
                          <p><span className="text-muted-foreground">{t("email")}:</span> <a href={`mailto:${quote.email}`} className="text-accent underline">{quote.email}</a></p>
                          {quote.phone && <p><span className="text-muted-foreground">{t("phone")}:</span> <a href={`tel:${quote.phone}`} className="text-accent underline">{quote.phone}</a></p>}
                        </div>
                      ) : (
                        <div className="px-3 pb-3 pt-0 border-t border-border mt-0 pt-3 bg-muted/20">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              {extractUsZip(quote.address) ? (
                                <span>
                                  {t("quoteZipLabel")} {extractUsZip(quote.address)}
                                </span>
                              ) : (
                                <span className="italic">{t("quoteZipUnavailable")}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              <Lock className="w-3.5 h-3.5" aria-hidden />
                              {t("unlockDetailsHint")}
                            </span>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {!unlocked && (
                  <div className="rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 p-4 text-center">
                    <p className="text-sm font-medium mb-1">{t("unlockQuotesCta")}</p>
                    <p className="text-xs text-muted-foreground mb-2">{unlockSummaryHint}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t("unlockQuotesDesc")}</p>
                    <Button
                      variant="hero"
                      className="w-full sm:w-auto"
                      onClick={() => setUnlockModalOpen(true)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {payMethodLabel} — {t("unlockQuotesPrice")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {quotes.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>{t("noQuotesYet")}</p>
              </CardContent>
            </Card>
          )}

          {request.imageUrls && request.imageUrls.length > 0 ? (
            <Card className="overflow-hidden">
              <Collapsible open={photosSectionOpen} onOpenChange={setPhotosSectionOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-6 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-expanded={photosSectionOpen}
                  >
                    <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg">
                        {t("photos")} ({request.imageUrls.length})
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{t("photosDescription")}</p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 mt-1 ${photosSectionOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {request.imageUrls.map((url, index) => (
                        <div key={index} className="space-y-1">
                          <div className="aspect-[3/2] w-full overflow-hidden rounded-lg border border-border bg-muted">
                            <img
                              src={url}
                              alt={request.imageLabels?.[index] ?? `Photo ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {request.imageLabels?.[index] && (
                            <p className="truncate text-xs text-muted-foreground">{request.imageLabels[index]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ) : null}

          <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
            <DialogContent className="sm:max-w-md border border-accent/70">
              <DialogHeader>
                <DialogTitle>{t("howToUseTitle")}</DialogTitle>
                <DialogDescription>{t("helpHowToUseDescription")}</DialogDescription>
              </DialogHeader>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>{t("howToUseStep1")}</li>
                <li>{t("howToUseStep2")}</li>
                <li>{t("howToUseStep3")}</li>
              </ol>
            </DialogContent>
          </Dialog>

          <Dialog open={unlockModalOpen} onOpenChange={setUnlockModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("unlockQuotesCta")}</DialogTitle>
                <DialogDescription>{t("unlockQuotesDesc")}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-2xl font-bold text-accent text-center">{t("unlockQuotesPrice")}</p>
                <p className="text-xs text-muted-foreground text-center mt-1">{payMethodLabel}</p>
                <p className="text-xs text-muted-foreground text-center mt-3 border-t border-border pt-3">
                  {isIapUnlockAvailable() ? t("unlockPaymentNote") : t("unlockPaymentNoteWeb")}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUnlockModalOpen(false)} disabled={unlockLoading}>
                  {t("cancel")}
                </Button>
                <Button variant="hero" onClick={handleUnlockPay} disabled={unlockLoading}>
                  {unlockLoading ? t("unlocking") : `${payMethodLabel} — ${t("unlockQuotesPrice")}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      </div>
  );
};

export default RequestDetail;
