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
  FileText,
  Trophy,
  Building2,
  ImageIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { useBids, shopAmountToCustomerPrice } from "@/lib/bidsStore";
import { useLanguage } from "@/lib/LanguageContext";
import { useNotifications } from "@/lib/notificationContext";
import { getShopRequestById } from "@/lib/shopRequests";
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
  const requestId = id ? parseInt(id, 10) : NaN;
  const request = Number.isNaN(requestId) ? undefined : getShopRequestById(requestId);

  const [selectedBidIds, setSelectedBidIds] = useState<string[]>([]);
  const [winningAmount, setWinningAmount] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const bids = request ? getBids(request.id) : [];
  const sortedBids = [...bids].sort((a, b) => a.amount - b.amount);
  const currentWinning = request ? getWinningBidAmount(request.id) : null;

  useEffect(() => {
    if (user?.userType !== "admin") {
      navigate("/");
    }
  }, [user?.userType, navigate]);

  useEffect(() => {
    if (request) {
      setSelectedBidIds(getVisibleBidIds(request.id));
      const win = getWinningBidAmount(request.id);
      setWinningAmount(win != null ? String(win) : "");
    }
  }, [request?.id]);

  const selectAllBids = () => {
    setSelectedBidIds(sortedBids.map((b) => b.id));
  };

  const handleSaveVisibleBids = () => {
    if (!request) return;
    setVisibleBidIds(request.id, selectedBidIds);
    if (selectedBidIds.length > 0) {
      addNotification(request.id, request.vehicle, selectedBidIds.length);
    }
    toast.success(
      selectedBidIds.length > 0
        ? t("bidsNowVisible")
        : t("noBidsVisible")
    );
  };

  const handleSetWinning = () => {
    if (!request) return;
    const amount = parseInt(winningAmount, 10);
    if (Number.isNaN(amount)) return;
    setWinningBidAmount(request.id, amount);
    toast.success(t("winningSaved"));
    setWinningAmount("");
  };

  if (!isAdmin) return null;

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
                  Collision <span className="text-accent">Collect</span>
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
              {request.vehicle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{request.damage}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("insuranceValue")}:</span>
                <span className="font-semibold">${request.insuranceValue.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("location")}:</span>
                <span className="font-medium">{request.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("date")}:</span>
                <span className="font-medium">{request.createdAt}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("vin")}:</span>
                <span className="font-mono text-xs">{request.vin}</span>
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

        {/* Fotoğraflar */}
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

        {/* Body shop teklifleri – kimlere onay verilecek */}
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
      </main>
    </div>
  );
};

export default AdminRequestDetail;
