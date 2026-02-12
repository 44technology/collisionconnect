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
import { toast } from "sonner";

const ShopRequestDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
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
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate("/shop/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("back")}
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl font-display font-bold">
                    Collision <span className="text-accent">Collect</span>
                  </span>
                  <span className="text-xs block text-primary-foreground/60">{t("bodyShopPanel")}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/")}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Vehicle & request info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Car className="w-6 h-6" />
                {request.vehicle}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Submitted {request.createdAt}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Make</p>
                  <p className="font-medium">{request.make}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-medium">{request.model}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Year</p>
                  <p className="font-medium">{request.year}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">VIN</p>
                  <p className="font-mono text-xs font-medium">{request.vin}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1.5 border-t border-border">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {request.location}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {request.createdAt}
                </span>
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Insurance value:</span>
                  <span className="font-semibold">${request.insuranceValue.toLocaleString()}</span>
                </span>
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
              <div className="p-3 bg-secondary rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("insuranceValueLabel")}:</span>
                  <span className="font-bold">${request?.insuranceValue.toLocaleString()}</span>
                </div>
              </div>
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
