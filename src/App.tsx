import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BidsProvider } from "@/lib/bidsStore";
import { AuthProvider } from "@/lib/authContext";
import { NotificationProvider } from "@/lib/notificationContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import LoginShop from "./pages/LoginShop";
import LoginAdmin from "./pages/LoginAdmin";
import Register from "./pages/Register";
import RegisterShop from "./pages/RegisterShop";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import RequestDetail from "./pages/RequestDetail";
import ShopDashboard from "./pages/ShopDashboard";
import ShopRequestDetail from "./pages/ShopRequestDetail";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
      <BidsProvider>
      <NotificationProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/shop" element={<LoginShop />} />
          <Route path="/login/admin" element={<LoginAdmin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/shop" element={<RegisterShop />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/new-request" element={<NewRequest />} />
          <Route path="/dashboard/request/:id" element={<RequestDetail />} />
          <Route path="/shop/dashboard" element={<ShopDashboard />} />
          <Route path="/shop/dashboard/request/:id" element={<ShopRequestDetail />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
      </BidsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
