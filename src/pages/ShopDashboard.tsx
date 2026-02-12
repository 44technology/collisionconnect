import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Car, Clock, CheckCircle, DollarSign, LogOut, Eye, MapPin, Calendar, Trophy, TrendingUp, Send, Settings, Wallet, CreditCard } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBids } from "@/lib/bidsStore";
import { useLanguage } from "@/lib/LanguageContext";

type ShopRequest = {
  id: number;
  vehicle: string;
  damage: string;
  insuranceValue: number;
  location: string;
  createdAt: string;
  images: number;
  myBid: number | null;
  bidDeadlineAt?: string;
};

// Demo data — pending talepler için teklif süresi 24 saat (bidDeadlineAt)
const now = Date.now();
const in24h = now + 24 * 60 * 60 * 1000;
const demoRequests: ShopRequest[] = [
  {
    id: 1,
    vehicle: "2022 Toyota Camry",
    damage: "Front bumper and headlight damage",
    insuranceValue: 18000,
    location: "New York, NY",
    createdAt: "2024-01-15",
    images: 6,
    myBid: null,
    bidDeadlineAt: new Date(in24h).toISOString(),
  },
  {
    id: 2,
    vehicle: "2021 Honda Accord",
    damage: "Left door and fender damage",
    insuranceValue: 14000,
    location: "Brooklyn, NY",
    createdAt: "2024-01-17",
    images: 5,
    myBid: 11500,
  },
  {
    id: 3,
    vehicle: "2020 BMW 3 Series",
    damage: "Rear bumper and trunk damage",
    insuranceValue: 22000,
    location: "Queens, NY",
    createdAt: "2024-01-18",
    images: 8,
    myBid: null,
    bidDeadlineAt: new Date(in24h + 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    vehicle: "2019 Mercedes C-Class",
    damage: "Front bumper, hood and headlight damage",
    insuranceValue: 25000,
    location: "Manhattan, NY",
    createdAt: "2024-01-16",
    images: 7,
    myBid: 19500,
  },
];

type ListFilter = "all" | "bids" | "pending";

function getHoursLeft(deadlineAt: string): number | null {
  if (!deadlineAt) return null;
  const diff = new Date(deadlineAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.max(0, Math.floor(diff / (60 * 60 * 1000)));
}

const ShopDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { getWinningBidAmount } = useBids();
  const [requests, setRequests] = useState(demoRequests);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Teklif detay sayfasından dönüldüğünde listeyi güncelle (Place Bid orada yapıldı)
  useEffect(() => {
    const updated = (location.state as { updatedBid?: { requestId: number; amount: number } } | null)?.updatedBid;
    if (updated) {
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.requestId ? { ...r, myBid: updated.amount } : r))
      );
      navigate("/shop/dashboard", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const stats = {
    total: requests.length,
    bidded: requests.filter(r => r.myBid !== null).length,
    pending: requests.filter(r => r.myBid === null).length,
  };

  const filteredRequests = (() => {
    if (listFilter === "bids") return requests.filter(r => r.myBid != null);
    if (listFilter === "pending") return requests.filter(r => r.myBid == null);
    return requests;
  })();

  const payoutStats = (() => {
    let totalEarned = 0;
    let wonCount = 0;
    requests.forEach((r) => {
      if (r.myBid == null) return;
      const winning = getWinningBidAmount(r.id);
      if (winning != null && Math.abs(r.myBid - winning) < 0.01) {
        totalEarned += r.myBid;
        wonCount += 1;
      }
    });
    return { totalEarned, wonCount };
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-primary-foreground/70 hidden md:block">
                <span className="font-medium text-primary-foreground">ABC Body Shop</span>
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate("/shop/subscription")}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {t("subscription")}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate("/settings")}
              >
                <Settings className="w-4 h-4 mr-2" />
                {t("settings")}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate("/")}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats — tıklanınca liste filtrelenir */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card
            className={`cursor-pointer transition-all border-2 ${listFilter === "all" ? "border-accent bg-accent/10" : "border-border hover:border-accent/30"}`}
            onClick={() => setListFilter("all")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">{t("activeRequestsCount")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all border-2 ${listFilter === "bids" ? "border-success bg-success/10" : "border-border hover:border-success/30"}`}
            onClick={() => setListFilter("bids")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{stats.bidded}</p>
                  <p className="text-sm text-muted-foreground">{t("bidsPlaced")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all border-2 ${listFilter === "pending" ? "border-muted-foreground bg-muted/30" : "border-border hover:border-muted-foreground/50"}`}
            onClick={() => setListFilter("pending")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">{t("pending")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payouts */}
        <Card className="mb-6 border-border border-accent/30">
          <CardContent className="p-4">
            <h2 className="text-sm font-display font-bold mb-3 flex items-center gap-2 text-accent">
              <Wallet className="w-4 h-4" />
              {t("payouts")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">${payoutStats.totalEarned.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t("totalEarned")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{payoutStats.wonCount}</p>
                <p className="text-xs text-muted-foreground">{t("wonDeals")}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("availablePayout")}: ${payoutStats.totalEarned.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* Liste başlığı filtreye göre */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold">
            {listFilter === "all" && t("activeRequestsCount")}
            {listFilter === "bids" && t("yourBidsList")}
            {listFilter === "pending" && t("pending24h")}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("sortBy")}:</span>
            <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
              <option>{t("newest")}</option>
              <option>{t("highestValue")}</option>
              <option>{t("nearest")}</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:border-accent/20">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                      <Car className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm">{request.vehicle}</h3>
                        {request.myBid && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            {t("bidPlaced")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{request.damage}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          {t("insurance")}: <span className="font-semibold text-foreground">${request.insuranceValue.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {request.location}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {request.createdAt}
                        </span>
                        <span className="text-muted-foreground">
                          📷 {request.images} {t("photos")}
                        </span>
                        {request.myBid == null && (
                          request.bidDeadlineAt ? (() => {
                            const hours = getHoursLeft(request.bidDeadlineAt!);
                            if (hours === 0) return <span className="text-destructive font-medium">{t("timeExpired")}</span>;
                            return <span className="text-accent font-medium">{hours}h {t("hoursLeft")}</span>;
                          })() : <span className="text-accent font-medium">24h</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 ml-auto lg:ml-0 shrink-0">
                    {request.myBid ? (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{t("yourBid")}</p>
                        <p className="text-lg font-bold text-success tabular-nums">${request.myBid.toLocaleString()}</p>
                        {(() => {
                          const winning = getWinningBidAmount(request.id);
                          if (winning == null) return null;
                          const pctAbove = ((request.myBid! - winning) / winning) * 100;
                          if (Math.abs(pctAbove) < 0.5) {
                            return (
                              <p className="text-xs text-success font-medium mt-0.5 flex items-center gap-1 justify-end">
                                <Trophy className="w-3 h-3" /> {t("youWon")}
                              </p>
                            );
                          }
                          if (pctAbove > 0) {
                            return (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                                <TrendingUp className="w-3 h-3" /> {pctAbove.toFixed(0)}% {t("aboveWinning")}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/50 bg-white/15 text-white hover:bg-white/25 hover:text-white hover:border-white/70"
                      onClick={() =>
                        navigate(`/shop/dashboard/request/${request.id}`, {
                          state: { myBid: request.myBid ?? undefined },
                        })
                      }
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t("details")}
                    </Button>
                    {request.myBid == null && (
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() =>
                          navigate(`/shop/dashboard/request/${request.id}`, {
                            state: { myBid: undefined },
                          })
                        }
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {t("placeBid")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ShopDashboard;
