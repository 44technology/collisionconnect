import { Shield, Zap, Users, TrendingUp, Clock, HeadphonesIcon } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Secure Platform",
    description: "All body shops are verified and licensed businesses.",
  },
  {
    icon: Zap,
    title: "Fast Offers",
    description: "Receive multiple offers within 24 hours.",
  },
  {
    icon: Users,
    title: "500+ Body Shops",
    description: "Wide network of body shops across the USA.",
  },
  {
    icon: TrendingUp,
    title: "Competitive Prices",
    description: "Body shops compete, you win.",
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "One platform instead of calling shops one by one.",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description: "We're always here to help with your questions.",
  },
];

const Features = () => {
  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block text-accent font-semibold mb-4">
            FEATURES
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Why Collision Collect?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A professional platform designed for damaged vehicle owners and body shops.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 border border-border/80 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-7 h-7 text-accent" />
              </div>
              
              <h3 className="text-lg font-display font-bold text-card-foreground mb-2">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
