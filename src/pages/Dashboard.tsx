import { useEffect, useMemo, useState } from "react";
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
import { Car, Plus, Clock, CheckCircle, LogOut, FileText, Eye, Bell, Settings, User, Inbox, Unlock, Hourglass, CircleHelp, MessageSquareQuote } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/authContext";
import { useNotifications } from "@/lib/notificationContext";
import { getAllSubmittedRequests } from "@/lib/submittedRequestsStore";
import { getQuotesByRequestRefId, getQuotesByRequestRefIdAsync } from "@/lib/quotesStore";
import { isUnlockedAsync } from "@/lib/unlockStore";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type RequestStatus = "active" | "pending" | "completed";
type ListFilter = "active" | "pending" | "completed" | "underReview" | "revealed";

type ListRequest = {
  requestRefId: string;
  vehicle: string;
  damage: string;
  trim?: string;
  desiredTimeframe?: string;
  status: RequestStatus;
  createdAt: string;
  imageUrls?: string[];
};

const demoRequests: ListRequest[] = [
  { requestRefId: "1", vehicle: "2022 Toyota Camry", damage: "Front bumper and headlight damage", trim: "LE", desiredTimeframe: "2weeks", status: "active", createdAt: "2024-01-15", imageUrls: [] },
  { requestRefId: "2", vehicle: "2021 Honda Civic", damage: "Right door and fender damage", trim: "Sport", desiredTimeframe: "asap", status: "pending", createdAt: "2024-01-18", imageUrls: [] },
  { requestRefId: "3", vehicle: "2020 BMW 3 Series", damage: "Rear bumper and trunk damage", trim: "330i", desiredTimeframe: "3-4weeks", status: "completed", createdAt: "2024-01-10", imageUrls: [] },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, setLocale, t } = useLanguage();
  const { user, logout } = useAuth();
  const { notifications, getUnreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [listFilter, setListFilter] = useState<ListFilter>("pending");
  const unreadCount = getUnreadCount();

  const isShopArea = location.pathname.startsWith("/shop/");
  const requestDetailPath = (id: string) =>
    isShopArea ? `/shop/dashboard/request/${id}` : `/dashboard/request/${id}`;
  const isShopUser = user?.userType === "shop";

  useEffect(() => {
    if (isShopUser && listFilter !== "active" && listFilter !== "pending" && listFilter !== "completed") {
      setListFilter("active");
    }
    if (!isShopUser && listFilter !== "pending" && listFilter !== "active" && listFilter !== "revealed") {
      setListFilter("pending");
    }
  }, [isShopUser, listFilter]);

  const submittedList: ListRequest[] = useMemo(() => {
    return getAllSubmittedRequests().map((s) => ({
      requestRefId: s.refId,
      vehicle: s.vehicle,
      damage: s.damage,
      trim: s.trim,
      desiredTimeframe: s.desiredTimeframe,
      status: "active" as RequestStatus,
      createdAt: s.createdAt,
      imageUrls: s.imageUrls ?? [],
    }));
  }, []);

  const requests = useMemo(() => [...submittedList, ...demoRequests], [submittedList]);

  const [asyncQuoteStats, setAsyncQuoteStats] = useState<Record<string, { bidsCount: number; bestBid: number | null }>>({});
  const [unlockByRefId, setUnlockByRefId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const ids = requests.map((r) => r.requestRefId);
    Promise.all(
      ids.map(async (refId) => {
        const quotes = await getQuotesByRequestRefIdAsync(refId);
        const bidsCount = quotes.length;
        const bestBid = bidsCount > 0 ? Math.min(...quotes.map((q) => q.price)) : null;
        const unlocked = await isUnlockedAsync(refId);
        return [refId, { bidsCount, bestBid, unlocked }] as const;
      })
    ).then((rows) => {
      if (cancelled) return;
      setAsyncQuoteStats(
        Object.fromEntries(rows.map(([id, s]) => [id, { bidsCount: s.bidsCount, bestBid: s.bestBid }]))
      );
      setUnlockByRefId(Object.fromEntries(rows.map(([id, s]) => [id, s.unlocked])));
    });
    return () => {
      cancelled = true;
    };
  }, [requests]);

  const getQuoteStats = (requestRefId: string) => {
    const cached = asyncQuoteStats[requestRefId];
    if (cached) return cached;
    const quotes = getQuotesByRequestRefId(requestRefId);
    const bidsCount = quotes.length;
    const bestBid = bidsCount > 0 ? Math.min(...quotes.map((q) => q.price)) : null;
    return { bidsCount, bestBid };
  };

  const stats = useMemo(() => {
    if (isShopUser) {
      return {
        active: requests.filter((r) => r.status === "active").length,
        pending: requests.filter((r) => r.status === "pending").length,
        completed: requests.filter((r) => r.status === "completed").length,
      };
    }
    return {
      active: requests.filter((r) => {
        if (r.status === "completed") return false;
        const unlocked = unlockByRefId[r.requestRefId] === true;
        return !unlocked && getQuoteStats(r.requestRefId).bidsCount > 0;
      }).length,
      underReview: requests.filter((r) => {
        if (r.status === "completed") return false;
        const unlocked = unlockByRefId[r.requestRefId] === true;
        return !unlocked && getQuoteStats(r.requestRefId).bidsCount === 0;
      }).length,
      revealed: requests.filter((r) => {
        if (r.status === "completed") return true;
        return unlockByRefId[r.requestRefId] === true;
      }).length,
    };
  }, [isShopUser, requests, unlockByRefId]);

  const filteredRequests = useMemo(() => {
    if (isShopUser) {
      if (listFilter === "active") return requests.filter((r) => r.status === "active");
      if (listFilter === "pending") return requests.filter((r) => r.status === "pending");
      if (listFilter === "completed") return requests.filter((r) => r.status === "completed");
      return requests;
    }
    if (listFilter === "active") {
      return requests.filter((r) => {
        if (r.status === "completed") return false;
        const unlocked = unlockByRefId[r.requestRefId] === true;
        return !unlocked && getQuoteStats(r.requestRefId).bidsCount > 0;
      });
    }
    if (listFilter === "underReview") {
      return requests.filter((r) => {
        if (r.status === "completed") return false;
        const unlocked = unlockByRefId[r.requestRefId] === true;
        return !unlocked && getQuoteStats(r.requestRefId).bidsCount === 0;
      });
    }
    if (listFilter === "revealed") {
      return requests.filter((r) => {
        if (r.status === "completed") return true;
        return unlockByRefId[r.requestRefId] === true;
      });
    }
    return requests;
  }, [isShopUser, listFilter, requests, unlockByRefId]);

  const getRequestBadge = (request: ListRequest) => {
    if (isShopUser) {
      switch (request.status) {
        case "active":
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
              <Clock className="w-3 h-3" />
              {t("active")}
            </span>
          );
        case "pending":
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
              <FileText className="w-3 h-3" />
              {t("pending")}
            </span>
          );
        case "completed":
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
              {t("completed")}
            </span>
          );
        default:
          return null;
      }
    }

    if (request.status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          {t("completed")}
        </span>
      );
    }

    const { bidsCount } = getQuoteStats(request.requestRefId);
    const unlocked = unlockByRefId[request.requestRefId] === true;

    if (unlocked) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/15 text-accent rounded-full text-xs font-medium">
          <Unlock className="w-3 h-3" />
          {t("statusRevealed")}
        </span>
      );
    }
    if (bidsCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
          <Inbox className="w-3 h-3" />
          {t("statusOffersReceived")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
        <Hourglass className="w-3 h-3" />
        {t("statusWaitingOffers")}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75">
        <div className="app-header-pt mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate(isShopArea ? "/shop/dashboard" : "/dashboard")}
            className="min-w-0 shrink text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            aria-label="Fixly"
          >
            <img
              src="/fixy-logo-transparent.png"
              alt="Fixly"
              className="h-9 w-auto max-w-[min(100%,9.5rem)] object-contain object-left sm:h-10 sm:max-w-[11rem]"
            />
          </button>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div
              role="group"
              aria-label={t("language")}
              className="inline-flex rounded-full border border-border/80 bg-muted/35 p-0.5"
            >
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={cn(
                  "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition sm:px-2.5",
                  locale === "en"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("es")}
                className={cn(
                  "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition sm:px-2.5",
                  locale === "es"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ES
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full" aria-label={t("notifications")}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-0.5 text-[10px] font-bold text-accent-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>{t("notifications")}</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        markAllAsRead();
                      }}
                    >
                      {t("markAllAsRead")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {notifications.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">{t("noNotifications")}</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={n.read ? "" : "bg-accent/5"}
                      onClick={() => {
                        markAsRead(n.id);
                        navigate(requestDetailPath(n.requestId));
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{n.vehicleName}</span>
                        <span className="text-xs text-muted-foreground">{n.message}</span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("profile")}>
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-muted-foreground">{t("welcome")}</p>
                  <p className="truncate text-sm font-semibold text-foreground">{user?.name ?? "—"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isShopUser ? (
                  <DropdownMenuItem onClick={() => navigate("/shop/preferences")}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("shopPreferencesTitle")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <div className="mb-6 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/15 p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">{t("myRequests")}</h1>
            {!isShopUser ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    aria-label={t("help")}
                  >
                    <CircleHelp className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border border-accent/70">
                  <DialogHeader>
                    <DialogTitle>{t("howToUseTitle")}</DialogTitle>
                    <DialogDescription>{t("helpHowToUseDescription")}</DialogDescription>
                  </DialogHeader>
                  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>{t("howToUseStep1")}</li>
                    <li>{t("howToUseStep2")}</li>
                    <li>{t("howToUseStep3")}</li>
                  </ol>
                </DialogContent>
              </Dialog>
            ) : null}
            </div>
            {!isShopUser ? (
              <Button
                type="button"
                variant="hero"
                size="icon"
                className="h-9 w-9 rounded-full"
                aria-label={t("newRequest")}
                onClick={() => navigate("/dashboard/new-request")}
              >
                <Plus className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("welcome")}
            {user?.name ? (
              <>
                {", "}
                <span className="font-medium text-foreground">{user.name}</span>
              </>
            ) : null}
            {" · "}
            {t("language")}: {locale === "en" ? t("english") : t("spanish")}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-3">
          {(isShopUser
            ? [
                { key: "active", label: t("active"), count: stats.active, icon: <Clock className="w-4 h-4 text-accent" />, activeClass: "border-accent bg-accent/10", idleClass: "border-border/80 hover:border-accent/35" },
                { key: "pending", label: t("pending"), count: stats.pending, icon: <FileText className="w-4 h-4 text-muted-foreground" />, activeClass: "border-muted-foreground/40 bg-muted/25", idleClass: "border-border/80 hover:border-muted-foreground/35" },
                { key: "completed", label: t("completed"), count: stats.completed, icon: <CheckCircle className="w-4 h-4 text-success" />, activeClass: "border-success bg-success/10", idleClass: "border-border/80 hover:border-success/35" },
              ]
            : [
                { key: "pending", label: t("statusWaitingOffers"), count: stats.underReview, icon: <Hourglass className="w-5 h-5 text-muted-foreground" />, activeClass: "border-muted-foreground/40 bg-muted/25", idleClass: "border-border/80 hover:border-muted-foreground/35" },
                { key: "active", label: t("statusOffersReceived"), count: stats.active, icon: <MessageSquareQuote className="w-5 h-5 text-accent" />, activeClass: "border-accent bg-accent/10", idleClass: "border-border/80 hover:border-accent/35" },
                { key: "revealed", label: t("statusRevealed"), count: stats.revealed, icon: <Eye className="w-5 h-5 text-success" />, activeClass: "border-success bg-success/10", idleClass: "border-border/80 hover:border-success/35" },
              ]).map((option) => (
            <Card
              key={option.key}
              className={cn(
                "cursor-pointer transition-all border-2 shadow-sm",
                listFilter === option.key ? option.activeClass : option.idleClass
              )}
              onClick={() => setListFilter(option.key as ListFilter)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-11 h-11 bg-background/50 rounded-lg flex items-center justify-center shrink-0">
                    {option.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold tabular-nums">{option.count}</p>
                    {isShopUser ? (
                      <p className="text-xs text-muted-foreground line-clamp-1">{option.label}</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Liste başlığı filtreye göre */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
            {listFilter === "active" && t("activeRequests")}
            {listFilter === "completed" && t("completed")}
            {listFilter === "pending" && t("statusWaitingOffers")}
            {listFilter === "underReview" && t("requestsUnderReview")}
            {listFilter === "revealed" && t("statusRevealed")}
          </h2>
        </div>

        {/* Requests List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredRequests.map((request) => (
            <Card
              key={request.requestRefId}
              className="border-border/80 shadow-sm transition-colors hover:border-accent/25 hover:shadow-md"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {request.imageUrls?.[0] ? (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                        <img
                          src={request.imageUrls[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Car className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">
                          {request.vehicle}
                          {request.trim ? ` ${request.trim}` : ""}
                        </h3>
                        {getRequestBadge(request)}
                      </div>
                      <p className="mb-1 line-clamp-2 text-xs text-muted-foreground">{request.damage}</p>
                      {request.desiredTimeframe && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("desiredTimeframeLabel")}: {t(
                            { asap: "desiredTimeframeAsap", "1week": "desiredTimeframe1Week", "2weeks": "desiredTimeframe2Weeks", "3-4weeks": "desiredTimeframe3To4Weeks", "1month+": "desiredTimeframe1MonthPlus" }[request.desiredTimeframe] ?? "desiredTimeframeAsap"
                          )}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        {(() => {
                          const { bidsCount, bestBid } = getQuoteStats(request.requestRefId);
                          return (
                            <>
                              {bidsCount > 0 && (
                                <span className="text-muted-foreground">
                                  {t("offers")}: <span className="font-medium text-foreground">{bidsCount}</span>
                                </span>
                              )}
                              {bestBid != null && (
                                <span className="text-success font-medium" title={t("bestOffer")}>
                                  {t("best")}: ${bestBid.toLocaleString()}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-2 self-end md:mt-0 md:ml-auto md:self-auto shrink-0">
                    <button
                      type="button"
                      className="min-w-[72px] text-center text-sm font-semibold text-white hover:text-white/90"
                      onClick={() => navigate(requestDetailPath(request.requestRefId))}
                    >
                      {t("details")}
                    </button>
                    {request.status === "active" && getQuoteStats(request.requestRefId).bidsCount > 0 && (
                      <Button
                        variant="hero"
                        size="sm"
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() => navigate(requestDetailPath(request.requestRefId))}
                      >
                        {t("viewBids")}
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
