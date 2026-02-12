import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Car, LogOut, Eye, DollarSign, Trophy, Settings, Building2, Users, TrendingUp, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { useBids } from "@/lib/bidsStore";
import { getSubscriptionStats } from "@/lib/subscriptionStore";
import { useLanguage } from "@/lib/LanguageContext";
import { shopRequestsDetail } from "@/lib/shopRequests";

const DEMO_CUSTOMER_COUNT = 24;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, logout, isAdmin } = useAuth();
  const { getBids, getVisibleBidIds, getWinningBidAmount, getLastBids, getActiveBodyShopCount } = useBids();

  const activeBodyShops = getActiveBodyShopCount();
  const last5 = getLastBids(5);
  const getVehicleByRequestId = (requestId: number) => shopRequestsDetail.find((r) => r.id === requestId)?.vehicle ?? `#${requestId}`;

  const payoutStats = (() => {
    let totalPaidToShops = 0;
    shopRequestsDetail.forEach((r) => {
      const winning = getWinningBidAmount(r.id);
      if (winning == null) return;
      totalPaidToShops += winning;
    });
    return { totalPaidToShops };
  })();
  const subscriptionStats = getSubscriptionStats();

  useEffect(() => {
    if (user?.userType !== "admin") {
      navigate("/");
    }
  }, [user?.userType, navigate]);

  const goToDetail = (requestId: number) => {
    navigate(`/admin/dashboard/request/${requestId}`);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xl font-display font-bold">
                Collision <span className="text-accent">Collect</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">{t("admin")}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              {t("settings")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
              <LogOut className="w-4 h-4 mr-2" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <h1 className="text-lg font-display font-bold mb-2">{t("adminDashboard")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("adminHint")}</p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{activeBodyShops}</p>
                <p className="text-sm text-muted-foreground">{t("activeBodyShops")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{DEMO_CUSTOMER_COUNT}</p>
                <p className="text-sm text-muted-foreground">{t("customers")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payouts / Subscription revenue */}
        <Card className="mb-8 border-border border-accent/30">
          <CardContent className="p-4">
            <h2 className="text-base font-display font-bold mb-3 flex items-center gap-2 text-accent">
              <Wallet className="w-5 h-5" />
              {t("payoutsAdmin")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{subscriptionStats.activeCount}</p>
                <p className="text-sm text-muted-foreground">{t("activeSubscriptions")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-accent">${subscriptionStats.monthlyRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t("subscriptionRevenue")}/month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last 5 bids */}
        <Card className="mb-8 border-border">
          <CardContent className="p-4">
            <h2 className="text-base font-display font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              {t("last5Bids")}
            </h2>
            {last5.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noBidsYet")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{t("request")}</th>
                      <th className="py-2 pr-4 font-medium">{t("shop")}</th>
                      <th className="py-2 pr-4 font-medium text-right">{t("amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {last5.map(({ requestId, bid }) => (
                      <tr key={bid.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pr-4">
                          <button
                            type="button"
                            className="text-accent hover:underline font-medium text-left"
                            onClick={(e) => { e.stopPropagation(); goToDetail(requestId); }}
                          >
                            {getVehicleByRequestId(requestId)}
                          </button>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{bid.shopName ?? "—"}</td>
                        <td className="py-2 pr-4 text-right font-semibold tabular-nums">${bid.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <h2 className="text-lg font-display font-bold mb-4">{t("requestsAndBids")}</h2>
        <div className="space-y-3">
          {shopRequestsDetail.map((request) => {
            const bids = getBids(request.id);
            const visibleCount = getVisibleBidIds(request.id).length;
            const winning = getWinningBidAmount(request.id);
            return (
              <Card
                key={request.id}
                className="hover:border-accent/40 cursor-pointer transition-colors"
                onClick={() => goToDetail(request.id)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <Car className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{request.vehicle}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{request.damage}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{bids.length} {t("bids")}</span>
                          {visibleCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success rounded text-xs">
                              {visibleCount} {t("visibleToCustomer")}
                            </span>
                          )}
                          {winning != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">
                              <Trophy className="w-3 h-3" />
                              {t("winning")}: ${winning.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/50 bg-white/15 text-white hover:bg-white/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToDetail(request.id);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {t("details")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
