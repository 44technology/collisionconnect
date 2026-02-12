import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Car, Clock, CheckCircle, DollarSign, LogOut, Eye, MapPin, Calendar, Trophy, TrendingUp, Send } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBids } from "@/lib/bidsStore";

// Demo data
const demoRequests = [
  {
    id: 1,
    vehicle: "2022 Toyota Camry",
    damage: "Front bumper and headlight damage",
    insuranceValue: 18000,
    location: "New York, NY",
    createdAt: "2024-01-15",
    images: 6,
    myBid: null,
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

const ShopDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getWinningBidAmount } = useBids();
  const [requests, setRequests] = useState(demoRequests);

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
                <span className="text-xs block text-primary-foreground/60">Body Shop Panel</span>
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
                onClick={() => navigate("/")}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats - tıklanabilir değil, sadece bilgi */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Active Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{stats.bidded}</p>
                  <p className="text-sm text-muted-foreground">Bids Placed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Requests */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold">Active Requests</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
              <option>Newest</option>
              <option>Highest Value</option>
              <option>Nearest</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {requests.map((request) => (
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
                            Bid Placed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{request.damage}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          Insurance: <span className="font-semibold text-foreground">${request.insuranceValue.toLocaleString()}</span>
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
                          📷 {request.images} photos
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 ml-auto lg:ml-0 shrink-0">
                    {request.myBid ? (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">Your Bid</p>
                        <p className="text-lg font-bold text-success tabular-nums">${request.myBid.toLocaleString()}</p>
                        {(() => {
                          const winning = getWinningBidAmount(request.id);
                          if (winning == null) return null;
                          const pctAbove = ((request.myBid! - winning) / winning) * 100;
                          if (Math.abs(pctAbove) < 0.5) {
                            return (
                              <p className="text-xs text-success font-medium mt-0.5 flex items-center gap-1 justify-end">
                                <Trophy className="w-3 h-3" /> You won this deal
                              </p>
                            );
                          }
                          if (pctAbove > 0) {
                            return (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                                <TrendingUp className="w-3 h-3" /> {pctAbove.toFixed(0)}% above winning
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
                      Details
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
                        Place Bid
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
