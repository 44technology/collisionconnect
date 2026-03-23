import { Camera, Upload, Clock, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const stepKeys = [
  { icon: Camera, titleKey: "step1Title", descKey: "step1Desc" },
  { icon: Upload, titleKey: "step2Title", descKey: "step2Desc" },
  { icon: Clock, titleKey: "step3Title", descKey: "step3Desc" },
  { icon: CheckCircle, titleKey: "step4Title", descKey: "step4Desc" },
];

const HowItWorks = () => {
  const { t } = useLanguage();
  return (
    <section className="py-12 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-16">
          <span className="inline-block text-accent font-semibold mb-4">
            {t("howItWorksLabel")}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t("howItWorksTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            {t("howItWorksSub")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stepKeys.map((step, index) => (
            <div 
              key={index} 
              className="relative group"
            >
              {/* Connector line */}
              {index < stepKeys.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}
              
              <div className="relative bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-accent/30">
                {/* Step number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 gradient-accent rounded-full flex items-center justify-center text-sm font-bold text-accent-foreground shadow-accent">
                  {index + 1}
                </div>
                
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-8 h-8 text-accent" />
                </div>
                
                <h3 className="text-xl font-display font-bold text-card-foreground mb-3">
                  {t(step.titleKey)}
                </h3>
                
                <p className="text-muted-foreground">
                  {t(step.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
