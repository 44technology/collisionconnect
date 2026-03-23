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
              <div className="w-14 h-14 overflow-hidden rounded-2xl bg-white flex items-center justify-center">
                <img
                  src="/fixy-logo.png"
                  alt="Fixly"
                  className="w-full h-full object-cover object-left scale-[1.5]"
                />
              </div>
            </div>
            <p className="text-primary-foreground/60 max-w-md mb-6">
              {t("footerTagline")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-4">{t("quickLinks")}</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  {t("howItWorksLink")}
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  {t("faq")}
                </a>
              </li>
              <li>
                <Link to="/login/admin" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  {t("admin")}
                </Link>
              </li>
              <li>
                <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
                  {t("contact")}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-4">{t("contact")}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@44technology.com" className="hover:text-accent transition-colors">info@44technology.com</a>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <Phone className="w-4 h-4" />
                <span>+1 (917) 727-5405</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/60">
                <MapPin className="w-4 h-4" />
                <span>Miami, FL</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-primary-foreground/40 text-sm">
            {t("copyright")}
          </p>
          <p className="text-primary-foreground/40 text-sm font-medium">
            44 Technology
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
