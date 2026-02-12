import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Lock, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/LanguageContext";

const LoginAdmin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login("admin", "Admin");
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToHome")}
        </Link>

        <Card className="border border-border/80 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-accent" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">{t("adminLogin")}</CardTitle>
            <CardDescription>
              {t("adminLoginDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@collisioncollect.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" variant="hero" className="w-full" size="lg">
                {t("signInAsAdmin")}
              </Button>
            </form>
            <div className="mt-4 pt-4 border-t border-border text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                {t("customerLogin")} →
              </Link>
              <span className="mx-2 text-muted-foreground">|</span>
              <Link to="/login/shop" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                {t("bodyShopLogin")} →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginAdmin;
