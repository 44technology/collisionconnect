import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, ArrowLeft, Upload, X, Camera, DollarSign, Info, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/lib/LanguageContext";

const NewRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const isGuestFlow = location.pathname === "/request/new";

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    vin: "",
    damageDescription: "",
    insuranceValue: "",
    additionalNotes: "",
  });
  const [images, setImages] = useState<{ id: string; name: string; type: string }[]>([]);
  const [email, setEmail] = useState("");

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: file.name,
        type: file.type,
      }));
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestFlow) {
      const trimmed = email.trim();
      if (!trimmed) {
        toast.error(t("enterEmail"));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast.error(t("invalidEmail"));
        return;
      }
      toast.success(t("requestSubmittedSuccess"));
      navigate(`/request/submitted?email=${encodeURIComponent(trimmed)}`);
      return;
    }
    toast.success(t("requestSubmittedSuccess"));
    navigate("/dashboard");
  };

  const backHref = isGuestFlow ? "/" : "/dashboard";
  const title = isGuestFlow ? t("newRequestTitleGuest") : t("newRequestTitle");

  const imageTypes = [
    { key: "front", label: "Front View", required: true },
    { key: "rear", label: "Rear View", required: true },
    { key: "left", label: "Left Side", required: true },
    { key: "right", label: "Right Side", required: true },
    { key: "engine", label: "Engine Bay", required: false },
    { key: "damage", label: "Damage Detail", required: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(backHref)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("back")}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-display font-bold">
                {title}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Guest: photos first; Dashboard: vehicle first */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {isGuestFlow && (
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" />
                {t("photos")}
              </CardTitle>
              <CardDescription>
                {t("photosDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {imageTypes.map((type) => (
                  <div 
                    key={type.key}
                    className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-accent/50 transition-colors cursor-pointer"
                  >
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">{type.label}</p>
                      {type.required && (
                        <span className="text-xs text-destructive">*</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              {images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">{t("uploadedPhotos")}</p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((img) => (
                      <div 
                        key={img.id}
                        className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg text-sm"
                      >
                        <span className="truncate max-w-[150px]">{img.name}</span>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Vehicle Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-accent" />
                Vehicle Information
              </CardTitle>
              <CardDescription>
                Enter your vehicle's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    placeholder="Toyota"
                    value={formData.make}
                    onChange={(e) => updateField("make", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="Camry"
                    value={formData.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    placeholder="2022"
                    value={formData.year}
                    onChange={(e) => updateField("year", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vin">VIN Number (Optional)</Label>
                <Input
                  id="vin"
                  placeholder="1HGBH41JXMN109186"
                  value={formData.vin}
                  onChange={(e) => updateField("vin", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Insurance Value */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent" />
                Insurance Value
              </CardTitle>
              <CardDescription>
                Enter the total loss value determined by your insurance company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="insuranceValue">Insurance Amount ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="insuranceValue"
                    type="number"
                    placeholder="15000"
                    value={formData.insuranceValue}
                    onChange={(e) => updateField("insuranceValue", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-accent/10 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  This amount will be used by body shops as a reference when submitting their bids. 
                  Please enter the official valuation from your insurance company's report.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Damage Description */}
          <Card>
            <CardHeader>
              <CardTitle>Damage Description</CardTitle>
              <CardDescription>
                Describe the damage to your vehicle in detail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="damageDescription">Damage Details</Label>
                <Textarea
                  id="damageDescription"
                  placeholder="Front bumper is crushed, right headlight is broken, dents on the hood..."
                  value={formData.damageDescription}
                  onChange={(e) => updateField("damageDescription", e.target.value)}
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any additional information or special requests..."
                  value={formData.additionalNotes}
                  onChange={(e) => updateField("additionalNotes", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload - only when dashboard flow (guest sees photos first above) */}
          {!isGuestFlow && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" />
                {t("photos")}
              </CardTitle>
              <CardDescription>
                {t("photosDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {imageTypes.map((type) => (
                  <div 
                    key={type.key}
                    className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-accent/50 transition-colors cursor-pointer"
                  >
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">{type.label}</p>
                      {type.required && (
                        <span className="text-xs text-destructive">*</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              {images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">{t("uploadedPhotos")}</p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((img) => (
                      <div 
                        key={img.id}
                        className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg text-sm"
                      >
                        <span className="truncate max-w-[150px]">{img.name}</span>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Email - only for guest flow, at the end */}
          {isGuestFlow && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-accent" />
                {t("yourEmail")}
              </CardTitle>
              <CardDescription>
                {t("yourEmailDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="request-email">{t("email")}</Label>
              <Input
                id="request-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
              />
            </CardContent>
          </Card>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(backHref)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" variant="hero" className="flex-1">
              {t("submitRequest")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default NewRequest;
