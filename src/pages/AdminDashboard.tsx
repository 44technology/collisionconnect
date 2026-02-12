import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Car, LogOut, Eye, DollarSign, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { useBids, shopAmountToCustomerPrice } from "@/lib/bidsStore";
import { useNotifications } from "@/lib/notificationContext";
import { shopRequestsDetail } from "@/lib/shopRequests";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { addNotification } = useNotifications();
  const {
    getBids,
    getBidsVisibleToCustomer,
    getVisibleBidIds,
    setVisibleBidIds,
    getWinningBidAmount,
    setWinningBidAmount,
  } = useBids();

  useEffect(() => {
    if (user?.userType !== "admin") {
      navigate("/");
    }
  }, [user?.userType, navigate]);

  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [winningAmount, setWinningAmount] = useState("");
  const [selectedBidIds, setSelectedBidIds] = useState<string[]>([]);

  const selectedRequest = selectedRequestId ? shopRequestsDetail.find((r) => r.id === selectedRequestId) : null;
  const selectedBids = selectedRequestId ? getBids(selectedRequestId) : [];
  const sortedBids = [...selectedBids].sort((a, b) => a.amount - b.amount);
  const currentWinning = selectedRequestId ? getWinningBidAmount(selectedRequestId) : null;

  const openDetails = (requestId: number) => {
    setSelectedRequestId(requestId);
    setSelectedBidIds(getVisibleBidIds(requestId));
    setWinningAmount(getWinningBidAmount(requestId) != null ? String(getWinningBidAmount(requestId)) : "");
  };

  const selectAllBids = () => {
    setSelectedBidIds(sortedBids.map((b) => b.id));
  };

  const handleSaveVisibleBids = () => {
    if (selectedRequestId == null) return;
    setVisibleBidIds(selectedRequestId, selectedBidIds);
    if (selectedBidIds.length > 0 && selectedRequest) {
      addNotification(selectedRequestId, selectedRequest.vehicle, selectedBidIds.length);
    }
    toast.success(
      selectedBidIds.length > 0
        ? `${selectedBidIds.length} bid(s) are now visible to the customer. They will see a notification.`
        : "No bids visible to customer."
    );
  };

  const handleSetWinning = (requestId: number) => {
    const amount = parseInt(winningAmount, 10);
    if (Number.isNaN(amount)) return;
    setWinningBidAmount(requestId, amount);
    toast.success("Deal marked as completed. Body shops will see feedback.");
    setWinningAmount("");
    setSelectedRequestId(null);
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
                <span className="text-sm font-normal text-muted-foreground ml-2">Admin</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <h1 className="text-lg font-display font-bold mb-4">Requests & Bids</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Release bids to customer so they can see offers. When deal is done, set winning bid so body shops get feedback.
        </p>
        <div className="space-y-3">
          {shopRequestsDetail.map((request) => {
            const bids = getBids(request.id);
            const visibleCount = getVisibleBidIds(request.id).length;
            const winning = getWinningBidAmount(request.id);
            return (
              <Card key={request.id} className="hover:border-accent/20">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <Car className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{request.vehicle}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{request.damage}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{bids.length} bid(s)</span>
                          {visibleCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success rounded text-xs">
                              {visibleCount} visible to customer
                            </span>
                          )}
                          {winning != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">
                              <Trophy className="w-3 h-3" />
                              Winning: ${winning.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetails(request.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <Dialog open={selectedRequestId != null} onOpenChange={(open) => !open && setSelectedRequestId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.vehicle}</DialogTitle>
            <DialogDescription>
              Select which bids the customer can see (multi-select). Then set winning bid when deal is closed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label>Bids – tick to show to customer</Label>
              {sortedBids.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={selectAllBids}>
                  Select all
                </Button>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2">
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
                    <p className="font-medium">${bid.amount.toLocaleString()} (shop receives)</p>
                    <p className="text-muted-foreground text-xs">Customer sees: ${shopAmountToCustomerPrice(bid.amount).toLocaleString()}</p>
                    {bid.note && <p className="text-muted-foreground mt-1">{bid.note}</p>}
                  </div>
                  {currentWinning === bid.amount && (
                    <span className="text-xs text-success font-medium shrink-0">Winning</span>
                  )}
                </label>
              ))}
              {sortedBids.length === 0 && (
                <p className="text-sm text-muted-foreground">No bids yet.</p>
              )}
            </div>
            {selectedRequestId && (
              <Button
                type="button"
                variant="hero"
                size="sm"
                onClick={handleSaveVisibleBids}
                className="w-full"
              >
                Show {selectedBidIds.length} selected bid(s) to customer
              </Button>
            )}
            {selectedRequestId && (
              <div className="border-t border-border pt-4 space-y-2">
                <Label>Set winning bid (shop amount) – deal closed</Label>
                <div className="flex gap-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="e.g. 11600"
                    value={winningAmount}
                    onChange={(e) => setWinningAmount(e.target.value)}
                    className="pl-10"
                  />
                  <Button
                    size="sm"
                    variant="hero"
                    onClick={() => handleSetWinning(selectedRequestId)}
                  >
                    Set winning
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Body shops who bid higher will see &quot;X% above winning bid&quot; feedback.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
