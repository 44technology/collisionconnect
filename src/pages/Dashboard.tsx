import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Car, Plus, Clock, CheckCircle, DollarSign, LogOut, FileText, Eye, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBids, shopAmountToCustomerPrice } from "@/lib/bidsStore";
import { useNotifications } from "@/lib/notificationContext";

const demoRequests = [
  { id: 1, vehicle: "2022 Toyota Camry", damage: "Front bumper and headlight damage", insuranceValue: 18000, status: "active", createdAt: "2024-01-15" },
  { id: 2, vehicle: "2021 Honda Civic", damage: "Right door and fender damage", insuranceValue: 12000, status: "pending", createdAt: "2024-01-18" },
  { id: 3, vehicle: "2020 Ford F-150", damage: "Rear bumper damage", insuranceValue: 8000, status: "completed", createdAt: "2024-01-10" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { getVisibleBids, getBidsVisibleToCustomer } = useBids();
  const { notifications, getUnreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [requests] = useState(demoRequests);
  const unreadCount = getUnreadCount();

  const getBidStats = (requestId: number) => {
    const visible = getBidsVisibleToCustomer(requestId);
    if (!visible) return { bidsCount: 0, bestBid: null as number | null };
    const bids = getVisibleBids(requestId);
    const count = bids.length;
    const bestCustomerPrice = count > 0 ? Math.min(...bids.map((b) => shopAmountToCustomerPrice(b.amount))) : null;
    return { bidsCount: count, bestBid: bestCustomerPrice };
  };

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
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="text-xl font-display font-bold">
                Collision <span className="text-accent">Collect</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); markAllAsRead(); }}>
                        Mark all as read
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {notifications.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className={n.read ? "" : "bg-accent/5"}
                        onClick={() => {
                          markAsRead(n.id);
                          navigate(`/dashboard/request/${n.requestId}`);
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">{n.vehicleName}</span>
                          <span className="text-xs text-muted-foreground">{n.message}</span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-sm text-muted-foreground hidden md:block">
                Welcome, <span className="font-medium text-foreground">John Doe</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums">{requests.length}</p>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums">{requests.filter(r => r.status === "active").length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums">{requests.filter(r => r.status === "completed").length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums">$1,800</p>
                  <p className="text-xs text-muted-foreground">Savings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold">My Requests</h2>
          <Button variant="hero" onClick={() => navigate("/dashboard/new-request")}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className="hover:border-accent/20">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm">{request.vehicle}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{request.damage}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          Insurance: <span className="font-medium text-foreground">${request.insuranceValue.toLocaleString()}</span>
                        </span>
                        {(() => {
                          const { bidsCount, bestBid } = getBidStats(request.id);
                          return (
                            <>
                              {bidsCount > 0 && (
                                <span className="text-muted-foreground">
                                  Offers: <span className="font-medium text-foreground">{bidsCount}</span>
                                </span>
                              )}
                              {bestBid != null && (
                                <span className="text-success font-medium" title="Includes 20% platform fee">
                                  Best: ${bestBid.toLocaleString()}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto md:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dashboard/request/${request.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                    {request.status === "active" && getBidStats(request.id).bidsCount > 0 && (
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => navigate(`/dashboard/request/${request.id}`)}
                      >
                        View Bids
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

export default Dashboard;
