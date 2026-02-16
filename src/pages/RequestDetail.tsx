import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, ArrowLeft, Clock, CheckCircle, FileText, DollarSign, Building2, LogOut, MapPin, ImageIcon } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBids } from "@/lib/bidsStore";
import { useLanguage } from "@/lib/LanguageContext";
import { useNotifications } from "@/lib/notificationContext";
import { getShopRequestById } from "@/lib/shopRequests";

const demoRequests = [
  { id: 1, vehicle: "2022 Toyota Camry", damage: "Front bumper and headlight damage", status: "active", createdAt: "2024-01-15" },
  { id: 2, vehicle: "2021 Honda Civic", damage: "Right door and fender damage", status: "pending", createdAt: "2024-01-18" },
  { id: 3, vehicle: "2020 BMW 3 Series", damage: "Rear bumper and trunk damage", status: "completed", createdAt: "2024-01-10" },
];

const RequestDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { getVisibleBids, getBidsVisibleToCustomer } = useBids();
  const { notifications, markAsRead } = useNotifications();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const requestId = id ? parseInt(id, 10) : NaN;
  const request = demoRequests.find((r) => r.id === requestId);
  const fullRequest = getShopRequestById(requestId);
  const bidsVisible = request ? getBidsVisibleToCustomer(request.id) : false;
  const bids = request && bidsVisible ? getVisibleBids(request.id) : [];
  const bestQuote = bids.length > 0 ? Math.min(...bids.map((b) => b.amount)) : null;

  useEffect(() => {
    if (requestId && notifications.length > 0) {
      notifications.filter((n) => n.requestId === requestId && !n.read).forEach((n) => markAsRead(n.id));
    }
  }, [requestId]);

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
                <CardTitle className="text-xl">{fullRequest?.vehicle ?? request.vehicle}{fullRequest?.trim ? ` ${fullRequest.trim}` : ""}</CardTitle>
                {getStatusBadge(request.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Submitted {request.createdAt}</p>
              {(fullRequest?.location || fullRequest?.zipCode) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {fullRequest.location}
                  {fullRequest.zipCode && (
                    <span className="ml-1">· {t("zip")} {fullRequest.zipCode}</span>
                  )}
                </p>
              )}
              {fullRequest?.desiredTimeframe && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {t("desiredTimeframeLabel")}: {t(
                    { asap: "desiredTimeframeAsap", "1week": "desiredTimeframe1Week", "2weeks": "desiredTimeframe2Weeks", "3-4weeks": "desiredTimeframe3To4Weeks", "1month+": "desiredTimeframe1MonthPlus" }[fullRequest.desiredTimeframe] ?? "desiredTimeframeAsap"
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{t("damageDetails")}</p>
                <p className="text-sm text-foreground">{fullRequest?.damage ?? request.damage}</p>
                {fullRequest?.additionalNotes && (
                  <p className="text-xs text-muted-foreground mt-1">{fullRequest.additionalNotes}</p>
                )}
              </div>
              {bidsVisible && bestQuote != null && (
                <div className="flex items-center gap-2 text-success">
                  <DollarSign className="w-4 h-4" />
                  <span>{t("bestPrice")}:</span>
                  <span className="font-semibold">${bestQuote.toLocaleString()}</span>
                </div>
              )}
              {!bidsVisible && request.status === "active" && (
                <p className="text-sm text-muted-foreground">
                  Bids are under review. You'll see offers after admin approval.
                </p>
              )}
            </CardContent>
          </Card>

          {fullRequest && fullRequest.imageUrls?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="w-5 h-5" />
                  {t("photos")} ({fullRequest.imageUrls.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("photosDescription")}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {fullRequest.imageUrls.map((url, index) => (
                    <div key={index} className="space-y-1">
                      <button
                        type="button"
                        className="aspect-[3/2] w-full rounded-lg border border-border overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                        onClick={() => setLightboxImage(url)}
                      >
                        <img src={url} alt={fullRequest.imageLabels?.[index] ?? `Photo ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                      {fullRequest.imageLabels?.[index] && (
                        <p className="text-xs text-muted-foreground truncate">{fullRequest.imageLabels[index]}</p>
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

          {bids.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t("offers")} ({bids.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("offersQuotesFromShops")}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {bids
                    .slice()
                    .sort((a, b) => a.amount - b.amount)
                    .map((bid, index) => (
                      <li
                        key={bid.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{t("offerFromBodyShop")}</p>
                            {bid.note && (
                              <p className="text-sm text-muted-foreground mt-1">{bid.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-accent">${bid.amount.toLocaleString()}</p>
                          {index === 0 && (
                            <span className="text-xs text-success font-medium">{t("bestPrice")}</span>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {!bidsVisible && request.status === "active" && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Bids are under review. You'll see offers here after admin approval.</p>
              </CardContent>
            </Card>
          )}
          {bidsVisible && bids.length === 0 && request.status === "active" && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No bids yet for this request.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      </div>
  );
};

export default RequestDetail;
