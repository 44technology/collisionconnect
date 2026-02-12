import { Camera, Upload, Clock, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Camera,
    title: "Take Photos",
    description: "Capture photos of your vehicle's front, rear, left, right, and engine compartment.",
  },
  {
    icon: Upload,
    title: "Enter Details",
    description: "Enter the insurance value and vehicle information, then create your request.",
  },
  {
    icon: Clock,
    title: "Receive Bids",
    description: "Dozens of body shops will see your request and submit competitive offers.",
  },
  {
    icon: CheckCircle,
    title: "Choose the Best",
    description: "Select the offer that works best for you and deliver your vehicle.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block text-accent font-semibold mb-4">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Get an Offer in 4 Easy Steps
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Getting the best offer for your vehicle has never been easier.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative group"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
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
                  {step.title}
                </h3>
                
                <p className="text-muted-foreground">
                  {step.description}
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
