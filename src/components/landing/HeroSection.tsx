import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";

const HeroSection = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = searchParams.get("admin") === "1";

  const setAdmin = (v: boolean) => {
    setSearchParams(v ? { admin: "1" } : {});
  };

  return (
    <section className="relative min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-5 pt-6 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium text-primary-foreground/80">Fixly</div>
          <div className="flex items-center gap-1 rounded-lg bg-primary-foreground/10 p-1">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                locale === "en" ? "bg-primary-foreground/15 text-primary-foreground" : "text-primary-foreground/70"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("es")}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                locale === "es" ? "bg-primary-foreground/15 text-primary-foreground" : "text-primary-foreground/70"
              }`}
            >
              ES
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-[20rem]">
            <img src="/fixy-logo-transparent.png" alt="Fixly" className="h-auto w-full object-contain" />
          </div>

          <h1 className="mt-7 text-balance text-center text-2xl font-semibold tracking-tight text-primary-foreground">
            {t("getAQuote")}
          </h1>
          <p className="mt-3 text-center text-sm text-primary-foreground/70">
            {t("heroTagline")}
          </p>
        </div>

        <div className="space-y-3">
          {isAdmin ? (
            <Button
              asChild
              className="h-14 w-full rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              size="lg"
              variant="secondary"
            >
              <Link to="/login?mode=admin">Admin {t("signIn")}</Link>
            </Button>
          ) : null}

          <Button
            type="button"
            className="h-14 w-full rounded-2xl"
            size="lg"
            variant="hero"
            onClick={() => navigate("/request/new")}
          >
            {t("getAQuote")}
            <ArrowRight className="h-5 w-5" />
          </Button>

          <Button
            asChild
            className="h-12 w-full rounded-2xl border-2 border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            size="sm"
            variant="outline"
          >
            <Link to="/login">{t("signIn")}</Link>
          </Button>
        </div>

        <div className="mt-4 text-center text-xs text-primary-foreground/55">
          {isAdmin ? (
            <button
              type="button"
              className="font-medium text-primary-foreground/80 hover:underline"
              onClick={() => setAdmin(false)}
            >
              {t("backToHome")}
            </button>
          ) : (
            <button
              type="button"
              className="font-medium text-primary-foreground/50 hover:underline"
              onClick={() => setAdmin(true)}
            >
              Admin
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
