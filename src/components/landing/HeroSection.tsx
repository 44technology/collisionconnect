import { Button } from "@/components/ui/button";
import { Car, Shield, DollarSign, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen gradient-hero overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pt-20 pb-16">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-primary-foreground">
              Collision <span className="text-accent">Collect</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/login/shop")}
            >
              Body Shop Login
            </Button>
            <Button 
              variant="hero" 
              size="sm"
              onClick={() => navigate("/request/new")}
            >
              Get a quote
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              <span>#1 Damaged Vehicle Platform in the USA</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6">
              Get the
              <span className="text-gradient block">Best Offer</span>
              For Your Damaged Vehicle
            </h1>
            
            <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg">
              Upload photos of your vehicle, enter the insurance value, and receive 
              competitive bids from dozens of body shops. Completely free!
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="xl"
                onClick={() => navigate("/request/new")}
                className="group"
              >
                Get started — add photos
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="heroOutline" 
                size="xl"
                onClick={() => navigate("/login/shop")}
              >
                Body Shop Login
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-primary-foreground/10">
              <div>
                <div className="text-3xl font-display font-bold text-accent">500+</div>
                <div className="text-sm text-primary-foreground/60">Registered Body Shops</div>
              </div>
              <div>
                <div className="text-3xl font-display font-bold text-accent">10K+</div>
                <div className="text-sm text-primary-foreground/60">Completed Repairs</div>
              </div>
              <div>
                <div className="text-3xl font-display font-bold text-accent">$2M+</div>
                <div className="text-sm text-primary-foreground/60">Total Savings</div>
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
                    <div className="font-semibold text-card-foreground">2022 Toyota Camry</div>
                    <div className="text-sm text-muted-foreground">Front bumper damage</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                    <span className="text-sm text-muted-foreground">Insurance Value</span>
                    <span className="font-bold text-success">$15,000</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                    <span className="text-sm text-muted-foreground">Best Offer</span>
                    <span className="font-bold text-accent">$12,500</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                    <span className="text-sm text-muted-foreground">Number of Bids</span>
                    <span className="font-bold">8 Bids</span>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-success text-success-foreground px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                <DollarSign className="w-4 h-4 inline mr-1" />
                17% Savings!
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
