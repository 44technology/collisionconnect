import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Car, ArrowLeft, Clock, CheckCircle, FileText, DollarSign, Building2, LogOut, CreditCard, Lock } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBids, shopAmountToCustomerPrice } from "@/lib/bidsStore";
import { useLanguage } from "@/lib/LanguageContext";
import { useNotifications } from "@/lib/notificationContext";
import { toast } from "sonner";

const demoRequests = [
  { id: 1, vehicle: "2022 Toyota Camry", damage: "Front bumper and headlight damage", insuranceValue: 18000, status: "active", createdAt: "2024-01-15" },
  { id: 2, vehicle: "2021 Honda Civic", damage: "Right door and fender damage", insuranceValue: 12000, status: "pending", createdAt: "2024-01-18" },
  { id: 3, vehicle: "2020 Ford F-150", damage: "Rear bumper damage", insuranceValue: 8000, status: "completed", createdAt: "2024-01-10" },
];

const RequestDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { getVisibleBids, getBidsVisibleToCustomer } = useBids();
  const { notifications, markAsRead } = useNotifications();
  const requestId = id ? parseInt(id, 10) : NaN;
  const request = demoRequests.find((r) => r.id === requestId);
  const bidsVisible = request ? getBidsVisibleToCustomer(request.id) : false;
  const bids = request && bidsVisible ? getVisibleBids(request.id) : [];
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");

  const bestCustomerPrice = bids.length > 0 ? Math.min(...bids.map((b) => shopAmountToCustomerPrice(b.amount))) : null;

  const handlePayClick = (amount: number) => {
    setPaymentAmount(amount);
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setNameOnCard("");
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (paymentAmount == null) return;
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim() || !nameOnCard.trim()) {
      toast.error(t("fillCardDetails"));
      return;
    }
    toast.success(t("paymentSuccess"));
    setPaymentDialogOpen(false);
    setPaymentAmount(null);
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setNameOnCard("");
  };

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
                <CardTitle className="text-xl">{request.vehicle}</CardTitle>
                {getStatusBadge(request.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Submitted {request.createdAt}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Damage description</p>
                <p className="text-sm text-foreground">{request.damage}</p>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Insurance value:</span>
                <span className="font-semibold">${request.insuranceValue.toLocaleString()}</span>
              </div>
              {bidsVisible && bestCustomerPrice != null && (
                <div className="flex items-center gap-2 text-success">
                  <DollarSign className="w-4 h-4" />
                  <span>{t("bestPrice")}:</span>
                  <span className="font-semibold">${bestCustomerPrice.toLocaleString()}</span>
                </div>
              )}
              {!bidsVisible && request.status === "active" && (
                <p className="text-sm text-muted-foreground">
                  Bids are under review. You'll see offers after admin approval.
                </p>
              )}
            </CardContent>
          </Card>

          {bids.length > 0 && bestCustomerPrice != null && (
            <Card className="border-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent">
                  <CreditCard className="w-5 h-5" />
                  {t("payThroughPlatform")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("payThroughPlatformDesc")}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <span className="text-sm text-muted-foreground">{t("youPay")}</span>
                  <span className="text-2xl font-bold tabular-nums text-foreground">${bestCustomerPrice.toLocaleString()}</span>
                  <Button variant="hero" size="lg" className="shrink-0" onClick={() => handlePayClick(bestCustomerPrice)}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t("payNow")}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {bids.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t("offers")} ({bids.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("youPay")} the amount shown. Pay securely with your card when you're ready.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {bids
                    .slice()
                    .sort((a, b) => a.amount - b.amount)
                    .map((bid, index) => {
                      const customerPrice = shopAmountToCustomerPrice(bid.amount);
                      return (
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
                            <p className="font-semibold text-accent">${customerPrice.toLocaleString()}</p>
                            {index === 0 && (
                              <span className="text-xs text-success font-medium">Best price</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
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

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t("confirmPayment")}
            </DialogTitle>
            <DialogDescription>{t("confirmPaymentDesc")}</DialogDescription>
          </DialogHeader>
          {paymentAmount != null && (
            <>
              <div className="py-2 px-3 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-xs text-muted-foreground">{t("youPay")}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">${paymentAmount.toLocaleString()}</p>
              </div>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
                  <Input
                    id="cardNumber"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cardExpiry">{t("cardExpiry")}</Label>
                    <Input
                      id="cardExpiry"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cardCvc">{t("cardCvc")}</Label>
                    <Input
                      id="cardCvc"
                      placeholder="123"
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      maxLength={4}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nameOnCard">{t("nameOnCard")}</Label>
                  <Input
                    id="nameOnCard"
                    placeholder="John Doe"
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                  />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" />
                  {t("securePayment")}
                </p>
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="hero" onClick={handleConfirmPayment}>
              {t("payNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestDetail;
