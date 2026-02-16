import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BidsProvider } from "@/lib/bidsStore";
import { SubscriptionProvider } from "@/lib/subscriptionStore";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import { NotificationProvider } from "@/lib/notificationContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import LoginShop from "./pages/LoginShop";
import LoginAdmin from "./pages/LoginAdmin";
import Register from "./pages/Register";
import RegisterShop from "./pages/RegisterShop";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import RequestSubmitted from "./pages/RequestSubmitted";
import RequestDetail from "./pages/RequestDetail";
import ShopDashboard from "./pages/ShopDashboard";
import ShopRequestDetail from "./pages/ShopRequestDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRequestDetail from "./pages/AdminRequestDetail";
import Settings from "./pages/Settings";
import ShopSubscription from "./pages/ShopSubscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthLoadingGuard({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  return <>{children}</>;
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
      <BrowserRouter>
      <AuthLoadingGuard>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/shop" element={<LoginShop />} />
          <Route path="/login/admin" element={<LoginAdmin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/shop" element={<RegisterShop />} />
          <Route path="/request/new" element={<NewRequest />} />
          <Route path="/request/submitted" element={<RequestSubmitted />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/new-request" element={<NewRequest />} />
          <Route path="/dashboard/request/:id" element={<RequestDetail />} />
          <Route path="/shop/dashboard" element={<ShopDashboard />} />
          <Route path="/shop/dashboard/request/:id" element={<ShopRequestDetail />} />
          <Route path="/shop/subscription" element={<ShopSubscription />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/dashboard/request/:id" element={<AdminRequestDetail />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthLoadingGuard>
      </BrowserRouter>
      </NotificationProvider>
      </SubscriptionProvider>
      </BidsProvider>
      </LanguageProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
