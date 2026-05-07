import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Car,
  ArrowLeft,
  DollarSign,
  MapPin,
  Calendar,
  Clock,
  FileText,
  LogOut,
  Send,
  ImageIcon,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getShopRequestById } from "@/lib/shopRequests";
import { useBids } from "@/lib/bidsStore";
import { useSubscription } from "@/lib/subscriptionStore";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";

const ShopRequestDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { logout } = useAuth();
  const { addBid, getWinningBidAmount } = useBids();
  const { canPlaceBid, recordBidPlaced, freeBidsRemaining, isSubscribed } = useSubscription();
  const [bidAmount, setBidAmount] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const requestId = id ? parseInt(id, 10) : NaN;
  const request = getShopRequestById(requestId);
  const myBid = (location.state as { myBid?: number } | null)?.myBid;

  const handleBidSubmit = () => {
    if (!bidAmount || !request) return;
    const amount = parseInt(bidAmount, 10);
    if (Number.isNaN(amount)) return;
    if (!canPlaceBid()) {
      toast.error(t("subscribeToPlaceMore"));
      setBidDialogOpen(false);
      navigate("/shop/subscription");
      return;
    }
    recordBidPlaced();
    addBid(request.id, amount, bidNote, "ABC Body Shop");
    toast.success(t("bidSubmitted"));
    setBidAmount("");
    setBidNote("");
    setBidDialogOpen(false);
    navigate("/shop/dashboard", { state: { updatedBid: { requestId: request.id, amount } } });
  };

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("requestNotFound")}</p>
          <Button onClick={() => navigate("/shop/dashboard")}>{t("backToDashboard")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-primary/20 bg-primary text-primary-foreground">
        <div className="app-header-pt container mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => navigate("/shop/dashboard")}
              aria-label={t("back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold sm:text-base">Fixly</p>
                <p className="truncate text-xs text-primary-foreground/65">{t("bodyShopPanel")}</p>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </header>

      <main className="app-safe-pb container mx-auto flex-1 overflow-y-auto overscroll-y-contain px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Vehicle & request info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Car className="w-6 h-6" />
                {request.vehicle}{request.trim ? ` ${request.trim}` : ""}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Submitted {request.createdAt}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("make")}</p>
                  <p className="font-medium">{request.make}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("model")}</p>
                  <p className="font-medium">{request.model}</p>
                </div>
                {request.trim && (
                  <div>
                    <p className="text-muted-foreground">{t("trim")}</p>
                    <p className="font-medium">{request.trim}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">{t("year")}</p>
                  <p className="font-medium">{request.year}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("vin")}</p>
                  <p className="font-mono text-xs font-medium">{request.vin}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1.5 border-t border-border">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {request.location}
                  {request.zipCode && (
                    <span className="font-medium text-foreground"> · {t("zip")} {request.zipCode}</span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {request.createdAt}
                </span>
                {request.desiredTimeframe && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {t("desiredTimeframeLabel")}: {t(
                      { asap: "desiredTimeframeAsap", "1week": "desiredTimeframe1Week", "2weeks": "desiredTimeframe2Weeks", "3-4weeks": "desiredTimeframe3To4Weeks", "1month+": "desiredTimeframe1MonthPlus" }[request.desiredTimeframe] ?? "desiredTimeframeAsap"
                    )}
                  </span>
                )}
              </div>
              {myBid != null && (
                <div className="pt-1.5 border-t border-border">
                  <p className="text-xs text-muted-foreground">Your bid</p>
                  <p className="text-lg font-bold text-success tabular-nums">${myBid.toLocaleString()}</p>
                  {(() => {
                    const winning = getWinningBidAmount(request.id);
                    if (winning == null) return null;
                    const pctAbove = ((myBid - winning) / winning) * 100;
                    if (Math.abs(pctAbove) < 0.5) {
                      return (
                        <p className="text-sm text-success font-medium mt-1 flex items-center gap-1">
                          <Trophy className="w-4 h-4" /> {t("youWon")}
                        </p>
                      );
                    }
                    if (pctAbove > 0) {
                      return (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" /> Deal closed. Winning bid ${winning.toLocaleString()}. Your bid was {pctAbove.toFixed(0)}% above.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Damage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Damage description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm text-foreground">{request.damage}</p>
              {request.additionalNotes && (
                <p className="text-xs text-muted-foreground pt-1">{request.additionalNotes}</p>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="w-5 h-5" />
                Photos ({request.imageUrls.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">Vehicle and damage photos from the customer.</p>
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
                        alt={request.imageLabels[index] ?? `Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <p className="text-xs font-medium text-muted-foreground">
                      {request.imageLabels[index] ?? `Photo ${index + 1}`}
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

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-white/50 bg-white/15 text-white hover:bg-white/25 hover:text-white hover:border-white/70"
              onClick={() => navigate("/shop/dashboard")}
            >
              {t("backToList")}
            </Button>
            {myBid == null && (
              <Button
                variant="hero"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-lg"
                onClick={() => setBidDialogOpen(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                {t("placeBid")}
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Place Bid dialog */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("placeBidButton")}</DialogTitle>
            <DialogDescription>
              {canPlaceBid()
                ? `${t("enterBid")} ${request?.vehicle}. ${t("bidNote")}`
                : t("subscribeToPlaceMore")}
            </DialogDescription>
          </DialogHeader>
          {!canPlaceBid() ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {t("firstBidsFree").replace("{count}", "3")}. {t("subscribeToPlaceMore")}
              </p>
              <Button variant="hero" className="w-full" onClick={() => { setBidDialogOpen(false); navigate("/shop/subscription"); }}>
                {t("subscription")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {!isSubscribed && freeBidsRemaining > 0 && (
                <p className="text-xs text-accent font-medium">
                  {t("firstBidsFree").replace("{count}", String(freeBidsRemaining))}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="bidAmount">{t("yourBidAmount")}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="bidAmount"
                    type="number"
                    placeholder="12000"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {bidAmount && !Number.isNaN(parseInt(bidAmount, 10)) && (
                  <p className="text-xs text-muted-foreground">
                    {t("customerWillSee")}: <span className="font-medium text-foreground">${parseInt(bidAmount, 10).toLocaleString()}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bidNote">{t("noteOptional")}</Label>
                <Textarea
                  id="bidNote"
                  placeholder="Estimated completion time, additional services, etc."
                  value={bidNote}
                  onChange={(e) => setBidNote(e.target.value)}
                  rows={2}
                />
              </div>
              <Button variant="hero" className="w-full" onClick={handleBidSubmit}>
                {t("submitBid")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopRequestDetail;
