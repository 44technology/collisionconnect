import React, { type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Outlet, useLocation, Navigate } from "react-router-dom";
import { BidsProvider } from "@/lib/bidsStore";
import { SubscriptionProvider } from "@/lib/subscriptionStore";
import { AuthProvider, useAuth, type UserType } from "@/lib/authContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import { NotificationProvider } from "@/lib/notificationContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import RequestSubmitted from "./pages/RequestSubmitted";
import RequestDetail from "./pages/RequestDetail";
import QuotePage from "./pages/QuotePage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRequestDetail from "./pages/AdminRequestDetail";
import AdminBodyShops from "./pages/AdminBodyShops";
import Settings from "./pages/Settings";
import ShopPreferences from "./pages/ShopPreferences";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<{ children: ReactNode }, { error: unknown | null }> {
  state = { error: null as unknown | null };

  componentDidCatch(error: unknown) {
    // React runtime hatalarını ekranda göstermek için yakalıyoruz.
    // Mobilde siyah ekranın sebebini böylece hızlı göreceğiz.
    // eslint-disable-next-line no-console
    console.error("App crashed:", error);
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: "sans-serif" }}>
          <h2 style={{ marginBottom: 8 }}>App Error</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthLoadingGuard({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-center">
          Loading...
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function getHomePathForRole(userType: UserType): string {
  if (userType === "admin") return "/admin/dashboard";
  if (userType === "shop") return "/shop/dashboard";
  return "/dashboard";
}

function RequireAuth({ allowed }: { allowed?: UserType[] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowed && !allowed.includes(user.userType)) {
    return <Navigate to={getHomePathForRole(user.userType)} replace />;
  }

  return <Outlet />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
      <LanguageProvider>
      <BidsProvider>
      <SubscriptionProvider>
      <NotificationProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <HashRouter>
          <AuthLoadingGuard>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/shop" element={<Login />} />
              <Route path="/login/admin" element={<Navigate to="/login?mode=admin" replace />} />
              {/* GUEST: Quote alma (giriş gerekmiyor) */}
              <Route path="/request/new" element={<NewRequest />} />
              <Route path="/request/submitted" element={<RequestSubmitted />} />
              <Route path="/quote/:id" element={<QuotePage />} />
              {/* CUSTOMER AREA */}
              <Route element={<RequireAuth allowed={["customer"]} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/new-request" element={<NewRequest />} />
                <Route path="/dashboard/request/:id" element={<RequestDetail />} />
              </Route>

              {/* SHOP AREA */}
              <Route element={<RequireAuth allowed={["shop"]} />}>
                <Route path="/shop/dashboard" element={<Dashboard />} />
                <Route path="/shop/preferences" element={<ShopPreferences />} />
                <Route path="/shop/dashboard/request/:id" element={<RequestDetail />} />
                <Route path="/shop/subscription" element={<Navigate to="/" replace />} />
              </Route>

              {/* ADMIN AREA */}
              <Route element={<RequireAuth allowed={["admin"]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/dashboard/body-shops" element={<AdminBodyShops />} />
                <Route path="/admin/dashboard/request/:id" element={<AdminRequestDetail />} />
              </Route>

              {/* SHARED AUTH-REQUIRED */}
              <Route element={<RequireAuth />}>
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthLoadingGuard>
        </HashRouter>
      </ErrorBoundary>
      </NotificationProvider>
      </SubscriptionProvider>
      </BidsProvider>
      </LanguageProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
