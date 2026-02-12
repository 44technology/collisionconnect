import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 gradient-hero">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Customer CTA */}
          <div className="bg-card/10 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-primary-foreground/10">
            <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mb-6">
              <User className="w-8 h-8 text-accent" />
            </div>
            
            <h3 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
              Are You a Vehicle Owner?
            </h3>
            
            <p className="text-primary-foreground/70 mb-8">
              Get the best offers for your damaged vehicle. Register for free 
              and start receiving bids within minutes.
            </p>
            
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => navigate("/register")}
              className="group"
            >
              Register as Customer
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Body Shop CTA */}
          <div className="bg-accent/10 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-accent/20">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-6">
              <Building2 className="w-8 h-8 text-accent-foreground" />
            </div>
            
            <h3 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
              Are You a Body Shop?
            </h3>
            
            <p className="text-primary-foreground/70 mb-8">
              Reach new customers and grow your business. Join our platform 
              and view damaged vehicle requests.
            </p>
            
            <Button 
              variant="heroOutline" 
              size="lg"
              onClick={() => navigate("/register/shop")}
              className="group border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              Register as Body Shop
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
