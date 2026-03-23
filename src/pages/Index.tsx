import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const isMobile = useIsMobile();
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorks />
      {!isMobile && <Features />}
      {!isMobile && <CTASection />}
      {!isMobile && <Footer />}
    </div>
  );
};

export default Index;
