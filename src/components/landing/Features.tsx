import { Shield, Zap, Users, TrendingUp, Clock, HeadphonesIcon } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const featureKeys = [
  { icon: Shield, titleKey: "feature1Title", descKey: "feature1Desc" },
  { icon: Zap, titleKey: "feature2Title", descKey: "feature2Desc" },
  { icon: Users, titleKey: "feature3Title", descKey: "feature3Desc" },
  { icon: TrendingUp, titleKey: "feature4Title", descKey: "feature4Desc" },
  { icon: Clock, titleKey: "feature5Title", descKey: "feature5Desc" },
  { icon: HeadphonesIcon, titleKey: "feature6Title", descKey: "feature6Desc" },
];

const Features = () => {
  const { t } = useLanguage();
  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block text-accent font-semibold mb-4">
            {t("featuresLabel")}
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t("featuresTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("featuresSub")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureKeys.map((feature, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 border border-border/80 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-7 h-7 text-accent" />
              </div>
              
              <h3 className="text-lg font-display font-bold text-card-foreground mb-2">
                {t(feature.titleKey)}
              </h3>
              
              <p className="text-muted-foreground text-sm">
                {t(feature.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
