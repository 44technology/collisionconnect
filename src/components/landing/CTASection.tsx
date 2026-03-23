import { Button } from "@/components/ui/button";
import { ArrowRight, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";

const CTASection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="py-12 md:py-24 gradient-hero">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-card/10 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-primary-foreground/10 text-center">
            <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <User className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
              {t("ctaOwnerTitle")}
            </h3>
            <p className="text-primary-foreground/70 mb-8">
              {t("ctaOwnerDesc")}
            </p>
            <Button
              variant="hero"
              size="lg"
              onClick={() => navigate("/request/new")}
              className="group"
            >
              {t("ctaOwnerButton")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
