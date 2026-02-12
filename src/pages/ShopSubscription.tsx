import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, ArrowLeft, CreditCard, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { useSubscription, FREE_BIDS_COUNT, NO_JOB_DISCOUNT_RATE } from "@/lib/subscriptionStore";
import { useBids } from "@/lib/bidsStore";
import { shopRequestsDetail } from "@/lib/shopRequests";
import { toast } from "sonner";

const MONTHLY_PRICE = 29;
const DEMO_SHOP_NAME = "ABC Body Shop";

const ShopSubscription = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isSubscribed, subscribe, hadSubscriptionBefore } = useSubscription();
  const { getBids, getWinningBidAmount } = useBids();

  const hasWonAnyDeal = shopRequestsDetail.some((r) => {
    const winning = getWinningBidAmount(r.id);
    if (winning == null) return false;
    return getBids(r.id).some((b) => b.shopName === DEMO_SHOP_NAME && b.amount === winning);
  });

  const eligibleForNoJobDiscount = hadSubscriptionBefore && !hasWonAnyDeal;
  const displayPrice = eligibleForNoJobDiscount ? Math.round(MONTHLY_PRICE * (1 - NO_JOB_DISCOUNT_RATE)) : MONTHLY_PRICE;
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [recurring, setRecurring] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim() || !nameOnCard.trim()) {
      toast.error(t("fillCardDetails"));
      return;
    }
    subscribe(recurring);
    toast.success(t("subscriptionSuccess"));
    navigate("/shop/dashboard");
  };

  if (isSubscribed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">{t("subscriptionSuccess")}</p>
            <Button className="w-full" onClick={() => navigate("/shop/dashboard")}>
              {t("backToDashboard")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
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
              <Building2 className="w-6 h-6" />
              <span className="text-xl font-display font-bold">
                Collision <span className="text-accent">Collect</span>
              </span>
              <span className="text-sm text-primary-foreground/70">— {t("subscription")}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t("subscription")}
            </CardTitle>
            <CardDescription>
              {t("firstBidsFree").replace("{count}", String(FREE_BIDS_COUNT))}. {t("monthlyPrice")}: ${MONTHLY_PRICE}/month. Credit card only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {eligibleForNoJobDiscount && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success-foreground">
                  <p className="text-sm font-medium">{t("noJobDiscountTitle")}</p>
                  <p className="text-xs opacity-90 mt-0.5">{t("noJobDiscountDesc")}</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                {eligibleForNoJobDiscount && (
                  <p className="text-sm text-muted-foreground line-through">${MONTHLY_PRICE}/month</p>
                )}
                <p className="text-2xl font-bold tabular-nums">${displayPrice}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subCardNumber">{t("cardNumber")}</Label>
                <Input
                  id="subCardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="subCardExpiry">{t("cardExpiry")}</Label>
                  <Input
                    id="subCardExpiry"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subCardCvc">{t("cardCvc")}</Label>
                  <Input
                    id="subCardCvc"
                    placeholder="123"
                    type="password"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subNameOnCard">{t("nameOnCard")}</Label>
                <Input
                  id="subNameOnCard"
                  placeholder="John Doe"
                  value={nameOnCard}
                  onChange={(e) => setNameOnCard(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={recurring} onCheckedChange={(c) => setRecurring(Boolean(c))} />
                <span className="text-sm">{t("recurringLabel")}</span>
              </label>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
                {t("securePayment")}
              </p>
              <Button type="submit" variant="hero" className="w-full" size="lg">
                {t("subscribeButton")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ShopSubscription;
