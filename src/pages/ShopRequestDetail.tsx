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
import { useBids, shopAmountToCustomerPrice } from "@/lib/bidsStore";
import { toast } from "sonner";

const ShopRequestDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { addBid, getWinningBidAmount } = useBids();
  const [bidAmount, setBidAmount] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const requestId = id ? parseInt(id, 10) : NaN;
  const request = getShopRequestById(requestId);
  const myBid = (location.state as { myBid?: number } | null)?.myBid;

  const handleBidSubmit = () => {
    if (!bidAmount || !request) return;
    const amount = parseInt(bidAmount, 10);
    if (Number.isNaN(amount)) return;
    addBid(request.id, amount, bidNote);
    toast.success("Your bid has been submitted successfully!");
    setBidAmount("");
    setBidNote("");
    setBidDialogOpen(false);
    navigate("/shop/dashboard", { state: { updatedBid: { requestId: request.id, amount } } });
  };

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Request not found.</p>
          <Button onClick={() => navigate("/shop/dashboard")}>Back to Dashboard</Button>
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
                Back
              </Button>
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
                          <Trophy className="w-4 h-4" /> You won this deal
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
                    <div className="aspect-[3/2] rounded-lg border border-border overflow-hidden bg-muted">
                      <img
                        src={url}
                        alt={request.imageLabels[index] ?? `Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {request.imageLabels[index] ?? `Photo ${index + 1}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-white/50 bg-white/15 text-white hover:bg-white/25 hover:text-white hover:border-white/70"
              onClick={() => navigate("/shop/dashboard")}
            >
              Back to list
            </Button>
            {myBid == null && (
              <Button
                variant="hero"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-lg"
                onClick={() => setBidDialogOpen(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Place Bid
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Place Bid dialog – sadece detayları gördükten sonra */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Bid</DialogTitle>
            <DialogDescription>
              Enter your bid for {request?.vehicle}. Your bid is the amount you will receive (before platform fee).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-secondary rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Insurance Value:</span>
                <span className="font-bold">${request?.insuranceValue.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bidAmount">Your bid amount ($) – you receive this</Label>
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
                  Customer will see: <span className="font-medium text-foreground">${shopAmountToCustomerPrice(parseInt(bidAmount, 10)).toLocaleString()}</span> (20% platform fee)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bidNote">Note (Optional)</Label>
              <Textarea
                id="bidNote"
                placeholder="Estimated completion time, additional services, etc."
                value={bidNote}
                onChange={(e) => setBidNote(e.target.value)}
                rows={2}
              />
            </div>
            <Button variant="hero" className="w-full" onClick={handleBidSubmit}>
              Submit Bid
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopRequestDetail;
