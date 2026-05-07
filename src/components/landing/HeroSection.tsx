import { Button } from "@/components/ui/button";
import { ArrowRight, CircleHelp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const HeroSection = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useLanguage();

  return (
    <section className="relative min-h-[100dvh] app-header-pt">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-5 pb-8">
        <div className="mb-3 flex justify-end gap-2">
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
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
                aria-label={t("help")}
              >
                <CircleHelp className="h-5 w-5" />
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
        </div>

        <div className="flex flex-1 flex-col items-center">
          <div className="w-full max-w-[13rem]">
            <img src="/fixy-logo-transparent.png" alt="" className="h-auto w-full object-contain" />
          </div>

          <h1 className="mt-5 text-balance text-center text-2xl font-semibold tracking-tight text-primary-foreground">
            {t("getAQuote")}
          </h1>
          <p className="mt-2 text-center text-sm text-primary-foreground/70">{t("heroTagline")}</p>

          <div className="mt-6 w-full space-y-3">
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
            <p className="text-center text-xs text-primary-foreground/75">
              {t("alreadyHaveAccount")}{" "}
              <Link to="/login" className="font-semibold text-primary-foreground underline-offset-2 hover:underline">
                {t("signIn")}
              </Link>
            </p>
          </div>

          <div className="mt-6 w-full rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-4 text-left">
            <h2 className="text-sm font-semibold text-primary-foreground">{t("howToUseTitle")}</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-primary-foreground/75">
              <li>{t("howToUseStep1")}</li>
              <li>{t("howToUseStep2")}</li>
              <li>{t("howToUseStep3")}</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
