import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";

const RequestSubmitted = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-xl font-display font-bold mb-2">{t("requestSubmittedTitle")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("requestSubmittedDesc")}
            {email && (
              <span className="block mt-2 font-medium text-foreground">{email}</span>
            )}
          </p>
          <Button className="w-full" variant="hero" onClick={() => navigate("/")}>
            <Car className="w-4 h-4 mr-2" />
            {t("backToHome")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestSubmitted;
