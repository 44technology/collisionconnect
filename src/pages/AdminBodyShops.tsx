import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft, MessageCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  getAllBodyShops,
  addBodyShop,
  updateBodyShop,
  deleteBodyShop,
  normalizeWhatsAppPhone,
  type AdminBodyShop,
} from "@/lib/bodyShopsStore";
import { toast } from "sonner";

const AdminBodyShops = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const [shops, setShops] = useState<AdminBodyShop[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", whatsappPhone: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (user?.userType !== "admin") {
      navigate("/");
    }
  }, [user?.userType, navigate]);

  const refresh = () => setShops(getAllBodyShops());

  useEffect(() => {
    refresh();
  }, []);

  const handleSaveEdit = (id: string) => {
    if (!form.name.trim()) {
      toast.error(t("adminBodyShopNameRequired") ?? "Shop name is required.");
      return;
    }
    updateBodyShop(id, { name: form.name.trim(), whatsappPhone: form.whatsappPhone });
    toast.success(t("saved") ?? "Saved.");
    setEditingId(null);
    setForm({ name: "", whatsappPhone: "" });
    refresh();
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast.error(t("adminBodyShopNameRequired") ?? "Shop name is required.");
      return;
    }
    addBodyShop({ name: form.name.trim(), whatsappPhone: form.whatsappPhone });
    toast.success(t("adminBodyShopAdded") ?? "Body shop added.");
    setForm({ name: "", whatsappPhone: "" });
    setAdding(false);
    refresh();
  };

  const openWhatsApp = (phone: string) => {
    const num = normalizeWhatsAppPhone(phone);
    if (!num) return;
    window.open(`https://wa.me/${num}`, "_blank", "noopener,noreferrer");
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xl font-display font-bold">
                Collision <span className="text-accent">Collect</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">{t("admin")}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("backToAdmin")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <h1 className="text-lg font-display font-bold mb-2">{t("adminOurBodyShops")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("adminOurBodyShopsHint")}</p>

        {!adding && (
          <Button className="mb-6" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("adminBodyShopAdd")}
          </Button>
        )}

        {adding && (
          <Card className="mb-6 border-accent/30">
            <CardHeader>
              <CardTitle className="text-base">{t("adminBodyShopAdd")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="add-name">{t("adminBodyShopName")}</Label>
                <Input
                  id="add-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t("quoteFormShopNamePlaceholder") ?? "ABC Body Shop"}
                />
              </div>
              <div>
                <Label htmlFor="add-whatsapp">{t("adminBodyShopWhatsAppPhone")}</Label>
                <Input
                  id="add-whatsapp"
                  value={form.whatsappPhone}
                  onChange={(e) => setForm((f) => ({ ...f, whatsappPhone: e.target.value }))}
                  placeholder="+1 954 123 4567"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd}>{t("add") ?? "Add"}</Button>
                <Button variant="outline" onClick={() => { setAdding(false); setForm({ name: "", whatsappPhone: "" }); }}>
                  {t("cancel") ?? "Cancel"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {shops.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground">{t("adminNoBodyShopsYet")}</p>
          )}
          {shops.map((shop) => (
            <Card key={shop.id} className="border-border">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {editingId === shop.id ? (
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-xs">{t("adminBodyShopName")}</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("adminBodyShopWhatsAppPhone")}</Label>
                      <Input
                        value={form.whatsappPhone}
                        onChange={(e) => setForm((f) => ({ ...f, whatsappPhone: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(shop.id)}>{t("save") ?? "Save"}</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setForm({ name: "", whatsappPhone: "" }); }}>{t("cancel") ?? "Cancel"}</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-foreground">{shop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("adminBodyShopWhatsAppPhone")}: {shop.whatsappPhone || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {shop.whatsappPhone && (
                        <Button size="sm" variant="outline" onClick={() => openWhatsApp(shop.whatsappPhone)}>
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          WhatsApp
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(shop.id);
                          setForm({ name: shop.name, whatsappPhone: shop.whatsappPhone });
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(t("adminBodyShopDeleteConfirm") ?? "Remove this body shop?")) {
                            deleteBodyShop(shop.id);
                            toast.success(t("adminBodyShopDeleted") ?? "Removed.");
                            refresh();
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminBodyShops;
