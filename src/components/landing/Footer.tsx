import { Car, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";

const Footer = () => {
  const { t, locale, setLocale } = useLanguage();
  return (
    <footer className="bg-primary py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-primary-foreground">
                Collision <span className="text-accent">Collect</span>
              </span>
            </div>
            <p className="text-primary-foreground/60 max-w-md mb-6">
              America's leading damaged vehicle auction platform. Connecting body shops and vehicle owners.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  For Body Shops
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <Link to="/login/admin" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  {t("admin")}
                </Link>
              </li>
              <li>
                <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <Mail className="w-4 h-4" />
                <span>info@collisioncollect.com</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <Phone className="w-4 h-4" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <MapPin className="w-4 h-4" />
                <span>New York, NY, USA</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-primary-foreground/40 text-sm">
            © 2024 Collision Collect. All rights reserved.
          </p>
          <p className="text-primary-foreground/50 text-xs">
            {t("language")}:{" "}
            <button type="button" onClick={() => setLocale("en")} className={locale === "en" ? "text-accent font-medium" : "hover:text-accent transition-colors"}>
              {t("english")}
            </button>
            {" · "}
            <button type="button" onClick={() => setLocale("es")} className={locale === "es" ? "text-accent font-medium" : "hover:text-accent transition-colors"}>
              {t("spanish")}
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
