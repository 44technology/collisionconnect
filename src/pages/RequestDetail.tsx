import { useState, useEffect } from "react";
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
import { Car, ArrowLeft, Clock, CheckCircle, FileText, DollarSign, Building2, LogOut, MapPin, ImageIcon, Lock, CreditCard } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { getShopRequestById } from "@/lib/shopRequests";
import { getSubmittedRequestByRefId } from "@/lib/submittedRequestsStore";
import { getQuotesByRequestRefId } from "@/lib/quotesStore";
import { getVisibleQuoteIds } from "@/lib/visibleQuotesStore";
import { isUnlocked, setUnlocked } from "@/lib/unlockStore";
import { toast } from "sonner";

function isRefId(s: string): boolean {
  return /^CC-[A-Z0-9]+-[A-Z0-9]+$/i.test(s);
}

const demoRequests = [
  { id: 1, vehicle: "2022 Toyota Camry", damage: "Front bumper and headlight damage", status: "active", createdAt: "2024-01-15" },
  { id: 2, vehicle: "2021 Honda Civic", damage: "Right door and fender damage", status: "pending", createdAt: "2024-01-18" },
  { id: 3, vehicle: "2020 BMW 3 Series", damage: "Rear bumper and trunk damage", status: "completed", createdAt: "2024-01-10" },
];

const UNLOCK_PRICE = 4.99;

const RequestDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlocked, setUnlockedState] = useState(false);

  const requestRefId = id ?? "";
  const submitted = id && isRefId(id) ? getSubmittedRequestByRefId(id) : null;
  const numericId = id && !isRefId(id) ? parseInt(id, 10) : NaN;
  const legacyRequest = Number.isNaN(numericId) ? null : demoRequests.find((r) => r.id === numericId);
  const fullRequest = Number.isNaN(numericId) ? null : getShopRequestById(numericId);

  const request = submitted
    ? {
        vehicle: submitted.vehicle,
        damage: submitted.damage,
        status: "active" as const,
        createdAt: submitted.createdAt,
        trim: submitted.trim,
        zipCode: submitted.zipCode,
        desiredTimeframe: submitted.desiredTimeframe,
        additionalNotes: submitted.additionalNotes,
        imageUrls: submitted.imageUrls,
        imageLabels: submitted.imageLabels,
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
          imageUrls: fullRequest.imageUrls,
          imageLabels: fullRequest.imageLabels,
          location: fullRequest.location,
        }
      : null;

  const allQuotes = requestRefId ? getQuotesByRequestRefId(requestRefId) : [];
  const visibleIds = requestRefId ? getVisibleQuoteIds(requestRefId) : [];
  const quotes = allQuotes.filter((q) => visibleIds.includes(q.id));
  const unlockedCheck = requestRefId ? isUnlocked(requestRefId) : false;
  useEffect(() => {
    setUnlockedState(unlockedCheck);
  }, [unlockedCheck]);

  const handleUnlockPay = () => {
    setUnlockLoading(true);
    setTimeout(() => {
      if (requestRefId) {
        setUnlocked(requestRefId);
        setUnlockedState(true);
        toast.success(t("unlockedSuccess"));
      }
      setUnlockLoading(false);
      setUnlockModalOpen(false);
    }, 1200);
  };

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Request not found.</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const bestQuotePrice = quotes.length > 0 ? Math.min(...quotes.map((q) => q.price)) : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
            <FileText className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
                  <Car className="w-6 h-6 text-accent-foreground" />
                </div>
                <span className="text-xl font-display font-bold">
                  Collision <span className="text-accent">Collect</span>
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl">{request.vehicle}</CardTitle>
                {getStatusBadge(request.status)}
              </div>
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

          {request.imageUrls?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="w-5 h-5" />
                  {t("photos")} ({request.imageUrls.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("photosDescription")}</p>
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
                        <img src={url} alt={request.imageLabels?.[index] ?? `Photo ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                      {request.imageLabels?.[index] && (
                        <p className="text-xs text-muted-foreground truncate">{request.imageLabels[index]}</p>
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
              <img src={lightboxImage} alt="Enlarged" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
            </div>
          )}

          {quotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t("quotesOffersTitle")} ({quotes.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("quotesOffersSubtitle")}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {quotes.map((quote, index) => (
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
                        {index === 0 && (
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
                        <div className="px-3 pb-3 pt-0 flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t("unlockQuotesCta")} — {t("unlockQuotesPrice")}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {!unlocked && (
                  <div className="rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 p-4 text-center">
                    <p className="text-sm font-medium mb-1">{t("unlockQuotesCta")}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t("unlockQuotesDesc")}</p>
                    <Button
                      variant="hero"
                      className="w-full sm:w-auto"
                      onClick={() => setUnlockModalOpen(true)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t("payWithCard")} — {t("unlockQuotesPrice")}
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

          <Dialog open={unlockModalOpen} onOpenChange={setUnlockModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("unlockQuotesCta")}</DialogTitle>
                <DialogDescription>{t("unlockQuotesDesc")}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-2xl font-bold text-accent text-center">{t("unlockQuotesPrice")}</p>
                <p className="text-xs text-muted-foreground text-center mt-1">{t("payWithCard")}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUnlockModalOpen(false)} disabled={unlockLoading}>
                  {t("cancel")}
                </Button>
                <Button variant="hero" onClick={handleUnlockPay} disabled={unlockLoading}>
                  {unlockLoading ? t("unlocking") : `${t("payWithCard")} — ${t("unlockQuotesPrice")}`}
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
