import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Lock, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import { isFirebaseEnabled } from "@/lib/firebase";
import { useLanguage } from "@/lib/LanguageContext";

const LoginShop = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, loginWithEmailAndPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFirebaseEnabled()) {
      setSubmitting(true);
      try {
        const state = await loginWithEmailAndPassword(email, password);
        if (state?.userType === "admin") navigate("/admin/dashboard");
        else if (state?.userType === "shop") navigate("/shop/dashboard");
        else navigate("/dashboard");
      } catch (err: unknown) {
        const msg = err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code === "auth/invalid-credential" || (err as { code: string }).code === "auth/user-not-found"
            ? t("invalidEmailOrPassword")
            : (err as { message?: string }).message ?? String(err)
          : String(err);
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    } else {
      login("shop", "ABC Body Shop");
      navigate("/shop/dashboard");
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Back button */}
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
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">{t("bodyShopLoginNav")}</CardTitle>
            <CardDescription>
              {t("signInToAccount")}
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
                    placeholder="shop@email.com"
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-muted-foreground">{t("rememberMe")}</span>
                </label>
                <a href="#" className="text-accent hover:underline">
                  {t("forgotPassword")}
                </a>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? t("signingIn") : t("signIn")}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t("noAccount")} </span>
              <Link to="/register/shop" className="text-accent hover:underline font-medium">
                {t("register")}
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-border text-center">
              <Link 
                to="/login" 
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                ← {t("customerLogin")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginShop;
