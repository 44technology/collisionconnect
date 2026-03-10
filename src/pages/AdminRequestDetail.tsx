import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Shield,
  Car,
  ArrowLeft,
  DollarSign,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Trophy,
  Building2,
  ImageIcon,
  MessageCircle,
  Send,
  Copy,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { useBids, shopAmountToCustomerPrice } from "@/lib/bidsStore";
import { useLanguage } from "@/lib/LanguageContext";
import { useNotifications } from "@/lib/notificationContext";
import { getShopRequestById } from "@/lib/shopRequests";
import { getRequestFromFirestore } from "@/lib/requestsFirestore";
import { isRefId } from "@/lib/submittedRequestsStore";
import { getBodyShopsNearZipAsync, normalizeWhatsAppPhone } from "@/lib/bodyShopsStore";
import { getQuotesByRequestRefIdAsync } from "@/lib/quotesStore";
import { getVisibleQuoteIdsAsync, setVisibleQuoteIdsAsync } from "@/lib/visibleQuotesStore";
import { toast } from "sonner";

const AdminRequestDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { addNotification } = useNotifications();
  const {
    getBids,
    getVisibleBidIds,
    setVisibleBidIds,
    getWinningBidAmount,
    setWinningBidAmount,
  } = useBids();

  const { t } = useLanguage();
  const [firestoreRequest, setFirestoreRequest] = useState<import("@/lib/submittedRequestsStore").SubmittedRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const mockRequest = id && !isRefId(id) ? getShopRequestById(parseInt(id, 10)) : undefined;
  const request = firestoreRequest ?? mockRequest;

  const [selectedBidIds, setSelectedBidIds] = useState<string[]>([]);
  const [winningAmount, setWinningAmount] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Array<{ id: string; shopName: string; price: number; estimatedCompletion: string }>>([]);
  const [visibleQuoteIds, setVisibleQuoteIdsState] = useState<string[]>([]);
  const [bodyShopsNearZip, setBodyShopsNearZip] = useState<Array<{ id: string; name: string; whatsappPhone: string; address?: string; email?: string }>>([]);

  const requestRefId = request ? ((request as { refId?: string }).refId ?? String((request as { id?: number }).id ?? "")) : "";
  const requestIdNum = request && typeof (request as { id?: number }).id === "number" ? (request as { id: number }).id : null;

  const bids = requestIdNum != null ? getBids(requestIdNum) : [];
  const sortedBids = [...bids].sort((a, b) => a.amount - b.amount);
  const currentWinning = requestIdNum != null ? getWinningBidAmount(requestIdNum) : null;

  useEffect(() => {
    if (user?.userType !== "admin") {
      navigate("/");
    }
  }, [user?.userType, navigate]);

  useEffect(() => {
    if (!id) return;
    if (isRefId(id)) {
      setLoadingRequest(true);
      getRequestFromFirestore(id)
        .then((data) => setFirestoreRequest(data ?? null))
        .finally(() => setLoadingRequest(false));
    } else {
      setFirestoreRequest(null);
    }
  }, [id]);

  useEffect(() => {
    if (requestIdNum != null) {
      setSelectedBidIds(getVisibleBidIds(requestIdNum));
      const win = getWinningBidAmount(requestIdNum);
      setWinningAmount(win != null ? String(win) : "");
    }
  }, [requestIdNum]);

  useEffect(() => {
    if (!requestRefId) return;
    let cancelled = false;
    Promise.all([
      getQuotesByRequestRefIdAsync(requestRefId),
      getVisibleQuoteIdsAsync(requestRefId),
      getBodyShopsNearZipAsync(request.zipCode ?? ""),
    ]).then(([quotesList, visibleIds, shops]) => {
      if (cancelled) return;
      setQuotes(quotesList);
      setVisibleQuoteIdsState(visibleIds);
      setSelectedQuoteIds(visibleIds);
      setBodyShopsNearZip(shops);
    });
    return () => { cancelled = true; };
  }, [requestRefId, request?.zipCode]);

  const selectAllBids = () => {
    setSelectedBidIds(sortedBids.map((b) => b.id));
  };

  const handleSaveVisibleBids = () => {
    if (!request || requestIdNum == null) return;
    setVisibleBidIds(requestIdNum, selectedBidIds);
    if (selectedBidIds.length > 0) {
      addNotification(requestIdNum, request.vehicle, selectedBidIds.length);
    }
    toast.success(
      selectedBidIds.length > 0
        ? t("bidsNowVisible")
        : t("noBidsVisible")
    );
  };

  const handleSetWinning = () => {
    if (!request || requestIdNum == null) return;
    const amount = parseInt(winningAmount, 10);
    if (Number.isNaN(amount)) return;
    setWinningBidAmount(requestIdNum, amount);
    toast.success(t("winningSaved"));
    setWinningAmount("");
  };

  if (!isAdmin) return null;

  if (loadingRequest) {
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
          <Button onClick={() => navigate("/admin/dashboard")}>{t("backToAdmin")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="border-white/50 bg-white/15 text-white hover:bg-white/25"
                onClick={() => navigate("/admin/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToList")}
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <span className="text-xl font-display font-bold">
                  Fixly
                  <span className="text-sm font-normal text-muted-foreground ml-2">{t("admin")} – {t("requestDetail")}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Talep özeti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5" />
              {request.vehicle}{request.trim ? ` ${request.trim}` : ""}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{request.damage}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {request.desiredTimeframe && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("desiredTimeframeLabel")}:</span>
                  <span className="font-medium">{t(
                    { asap: "desiredTimeframeAsap", "1week": "desiredTimeframe1Week", "2weeks": "desiredTimeframe2Weeks", "3-4weeks": "desiredTimeframe3To4Weeks", "1month+": "desiredTimeframe1MonthPlus" }[request.desiredTimeframe] ?? "desiredTimeframeAsap"
                  )}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("location")}:</span>
                <span className="font-medium">{(request as { location?: string }).location ? (request as { location: string }).location + (request.zipCode ? ` · ${t("zip")} ${request.zipCode}` : "") : (request.zipCode ? `${t("zip")} ${request.zipCode}` : "—")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("date")}:</span>
                <span className="font-medium">{request.createdAt}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("vin")}:</span>
                <span className="font-mono text-xs">{(request as { vin?: string }).vin ?? "—"}</span>
              </div>
            </div>
            {request.additionalNotes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">{t("additionalNotes")}</p>
                <p className="text-sm">{request.additionalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send quote link to body shops near this request's zip */}
        {(() => {
          const baseUrl = (import.meta.env.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "") || "https://collisionconnect.netlify.app").replace(/\/$/, "");
          const buildQuoteLink = (shop: { name: string; whatsappPhone: string; address?: string; email?: string }) => {
            if (!requestRefId) return baseUrl + "/quote/";
            const params = new URLSearchParams();
            if (shop.name) params.set("n", shop.name);
            if (shop.whatsappPhone) params.set("p", shop.whatsappPhone.replace(/\D/g, "").slice(0, 12));
            if (shop.email) params.set("e", shop.email);
            if (shop.address) params.set("a", shop.address);
            const q = params.toString();
            return `${baseUrl}/quote/${requestRefId}${q ? `?${q}` : ""}`;
          };
          const quoteLink = requestRefId ? `${baseUrl}/quote/${requestRefId}` : "";
          const bodyShops = bodyShopsNearZip.filter((s) => normalizeWhatsAppPhone(s.whatsappPhone));
          const defaultMessage = (t("adminQuoteLinkMessage") ?? "New quote request – please submit your price and turnaround time:\n").replace(/\n/g, "\n") + quoteLink;
          const openWhatsApp = (shop: { name: string; whatsappPhone: string; address?: string; email?: string }) => {
            const num = normalizeWhatsAppPhone(shop.whatsappPhone);
            if (!num) return;
            const linkWithShop = buildQuoteLink(shop);
            const msg = (t("adminQuoteLinkMessage") ?? "New quote request – please submit your price and turnaround time:\n").replace(/\n/g, "\n") + linkWithShop;
            window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
          };
          const openAllTabs = () => {
            bodyShops.forEach((s) => openWhatsApp(s));
            if (bodyShops.length > 0) toast.success(t("adminQuoteLinkOpenedAll") ?? "Opened WhatsApp for each body shop. Send the message in each tab.");
          };
          return (
            <Card className="border-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  {t("adminSendQuoteLinkToShops")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("adminSendQuoteLinkHint")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">{t("adminQuoteLinkLabel")}</span>
                  {quoteLink ? (
                    <>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all flex-1 min-w-0">{quoteLink}</code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(quoteLink);
                            toast.success(t("linkCopied"));
                          } catch {
                            toast.error("Copy failed");
                          }
                        }}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {t("copyQuoteLink")}
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("adminQuoteLinkEmpty")}</span>
                  )}
                </div>
                {bodyShops.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("adminNoBodyShopsForWhatsApp")}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {bodyShops.map((shop) => (
                        <Button
                          key={shop.id}
                          size="sm"
                          variant="outline"
                          className="border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10"
                          onClick={() => openWhatsApp(shop)}
                        >
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          {shop.name}
                        </Button>
                      ))}
                    </div>
                    <Button size="sm" variant="secondary" onClick={openAllTabs}>
                      <Send className="w-4 h-4 mr-2" />
                      {t("adminOpenAllWhatsApp")}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Body shop quotes – share which ones with customer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" />
              {t("adminBodyShopQuotes")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("adminBodyShopQuotesHint")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noQuotesYet")}</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label>{t("adminQuotesToShowToCustomer")}</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedQuoteIds(quotes.map((q) => q.id))}>
                    {t("selectAll")}
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {quotes.map((quote) => (
                    <label
                      key={quote.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card text-sm cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <Checkbox
                        checked={selectedQuoteIds.includes(quote.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedQuoteIds((prev) => [...prev, quote.id]);
                          else setSelectedQuoteIds((prev) => prev.filter((id) => id !== quote.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{quote.shopName} – ${quote.price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{t("quoteEstimatedCompletion")}: {quote.estimatedCompletion}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="hero"
                  onClick={async () => {
                    await setVisibleQuoteIdsAsync(requestRefId, selectedQuoteIds);
                    setVisibleQuoteIdsState(selectedQuoteIds);
                    toast.success(t("adminQuotesVisibilitySaved") ?? "Saved. Customer will see selected quotes.");
                  }}
                >
                  {t("adminSaveQuotesVisibility")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fotoğraflar */}
        {request.imageUrls?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="w-5 h-5" />
              {t("photos")} ({request.imageUrls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {request.imageUrls.map((url, index) => (
                <div key={index} className="space-y-1">
                  <button
                    type="button"
                    className="aspect-[3/2] w-full rounded-lg border border-border overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                    onClick={() => setLightboxImage(url)}
                  >
                    <img
                      src={url}
                      alt={request.imageLabels[index] ?? `${t("photo")} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {request.imageLabels[index] ?? `${t("photo")} ${index + 1}`}
                  </p>
                </div>
              ))}
            </div>
            <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
              <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-2 border-0 bg-black/95">
                {lightboxImage && (
                  <img
                    src={lightboxImage}
                    alt=""
                    className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded"
                  />
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        )}

        {/* Body shop bids (mock/demo only; real requests use quotes below) */}
        {requestIdNum != null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" />
              {t("bodyShopBids")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("bodyShopBidsHint")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("bidsToShowToCustomer")}</Label>
              {sortedBids.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={selectAllBids}>
                  {t("selectAll")}
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sortedBids.map((bid) => (
                <label
                  key={bid.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card text-sm cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    checked={selectedBidIds.includes(bid.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedBidIds((prev) => [...prev, bid.id]);
                      else setSelectedBidIds((prev) => prev.filter((id) => id !== bid.id));
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {bid.shopName ?? "Body shop"} – ${bid.amount.toLocaleString()} ({t("shopReceives")})
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("customerSees")}: ${shopAmountToCustomerPrice(bid.amount).toLocaleString()}
                    </p>
                    {bid.note && (
                      <p className="text-muted-foreground mt-1 text-xs">{bid.note}</p>
                    )}
                  </div>
                  {currentWinning === bid.amount && (
                    <span className="inline-flex items-center gap-1 text-xs text-success font-medium shrink-0">
                      <Trophy className="w-3 h-3" /> {t("winning")}
                    </span>
                  )}
                </label>
              ))}
              {sortedBids.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">{t("noBidsYet")}</p>
              )}
            </div>

            <Button
              type="button"
              variant="hero"
              size="sm"
              onClick={handleSaveVisibleBids}
              className="w-full sm:w-auto"
            >
              {t("openBidsToCustomer")}
            </Button>

            <div className="border-t border-border pt-4 space-y-2">
              <Label>{t("winningBidHint")}</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="number"
                  placeholder={t("placeholderWinning")}
                  value={winningAmount}
                  onChange={(e) => setWinningAmount(e.target.value)}
                  className="w-32"
                />
                <Button size="sm" variant="hero" onClick={handleSetWinning}>
                  {t("saveWinning")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("feedbackNote")}
              </p>
            </div>
          </CardContent>
        </Card>
        )}
      </main>
    </div>
  );
};

export default AdminRequestDetail;
