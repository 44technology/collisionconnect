import { Button } from "@/components/ui/button";
import { Car, Shield, DollarSign, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";

const HeroSection = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLanguage();
  const isMobile = useIsMobile();

  return (
    <section className="relative min-h-screen gradient-hero overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
      </div>

        <div className="container relative z-10 mx-auto px-4 pt-14 pb-24 md:pt-20 md:pb-16">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-10 md:mb-16">
            <div className="flex items-center gap-2">
            <div className="w-14 h-14 overflow-hidden rounded-2xl bg-white flex items-center justify-center">
              <img
                src="/fixy-logo.png"
                alt="Fixly"
                className="w-full h-full object-cover object-left scale-[1.5]"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language switcher */}
            <div className="hidden md:flex items-center gap-1 rounded-lg bg-primary-foreground/10 p-1">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${locale === "en" ? "bg-accent text-accent-foreground" : "text-primary-foreground/80 hover:text-primary-foreground"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("es")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${locale === "es" ? "bg-accent text-accent-foreground" : "text-primary-foreground/80 hover:text-primary-foreground"}`}
              >
                ES
              </button>
            </div>
            <Button
              variant="hero" 
              size="sm"
              onClick={() => navigate("/request/new")}
              className="hidden md:inline-flex"
            >
              {t("getAQuote")}
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              <span>{t("heroTagline")}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6">
              {t("heroTitle1")}
              <span className="text-gradient block">{t("heroTitle2")}</span>
              {t("heroTitle3")}
            </h1>
            
            <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg">
              {t("heroDescription")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="hero"
                size="xl"
                onClick={() => navigate("/request/new")}
                className="hidden md:inline-flex group"
              >
                {t("getStartedPhotos")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-10 md:mt-12 md:pt-12 md:border-t md:border-primary-foreground/10">
              <div>
                <div className="text-3xl font-display font-bold text-accent">500+</div>
                <div className="text-sm text-primary-foreground/60">{t("statsShops")}</div>
              </div>
              <div>
                <div className="text-3xl font-display font-bold text-accent">10K+</div>
                <div className="text-sm text-primary-foreground/60">{t("statsRepairs")}</div>
              </div>
              <div>
                <div className="text-3xl font-display font-bold text-accent">$2M+</div>
                <div className="text-sm text-primary-foreground/60">{t("statsSavings")}</div>
              </div>
            </div>
          </div>

          {/* Hero Image Area */}
          <div className="relative hidden lg:block">
            <div className="relative animate-float">
              {/* Card mockup */}
              <div className="bg-card rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="font-semibold text-card-foreground">{t("heroCardVehicle")}</div>
                    <div className="text-sm text-muted-foreground">{t("heroCardDamage")}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                    <span className="text-sm text-muted-foreground">{t("heroCardBestOffer")}</span>
                    <span className="font-bold text-accent">$12,500</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                    <span className="text-sm text-muted-foreground">{t("heroCardBids")}</span>
                    <span className="font-bold">8 {t("bids")}</span>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-success text-success-foreground px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                <DollarSign className="w-4 h-4 inline mr-1" />
                17% {t("heroCardSavings")}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky CTA */}
        {isMobile && (
          <div className="fixed left-0 right-0 bottom-0 z-40 p-4 pb-6 md:hidden">
            <Button
              variant="hero"
              size="xl"
              className="w-full justify-center"
              onClick={() => navigate("/request/new")}
            >
              {t("getStartedPhotos")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
