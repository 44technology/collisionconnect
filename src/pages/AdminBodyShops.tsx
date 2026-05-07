import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft, MessageCircle, Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  getAllBodyShopsAsync,
  addBodyShopAsync,
  updateBodyShopAsync,
  deleteBodyShopAsync,
  normalizeWhatsAppPhone,
  type AdminBodyShop,
} from "@/lib/bodyShopsStore";
import { searchCollisionCentersFromMap, type BodyShopSearchResult } from "@/lib/bodyShopsApi";
import { toast } from "sonner";

const AdminBodyShops = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const [shops, setShops] = useState<AdminBodyShop[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", whatsappPhone: "", zipCode: "", address: "", email: "" });
  const [adding, setAdding] = useState(false);
  const [importPlace, setImportPlace] = useState("");
  const [importResults, setImportResults] = useState<BodyShopSearchResult[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set());
  const [importAdding, setImportAdding] = useState(false);

  useEffect(() => {
    if (user?.userType !== "admin") {
      navigate("/");
    }
  }, [user?.userType, navigate]);

  const refresh = () => getAllBodyShopsAsync().then(setShops);

  useEffect(() => {
    refresh();
  }, []);

  const handleSaveEdit = async (id: string) => {
    if (!form.name.trim()) {
      toast.error(t("adminBodyShopNameRequired") ?? "Shop name is required.");
      return;
    }
    const updated = await updateBodyShopAsync(id, {
      name: form.name.trim(),
      whatsappPhone: form.whatsappPhone,
      zipCode: form.zipCode,
      address: form.address,
      email: form.email,
    });
    if (updated) {
      toast.success(t("saved") ?? "Saved.");
      setEditingId(null);
      setForm({ name: "", whatsappPhone: "", zipCode: "", address: "", email: "" });
      refresh();
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error(t("adminBodyShopNameRequired") ?? "Shop name is required.");
      return;
    }
    await addBodyShopAsync({
      name: form.name.trim(),
      whatsappPhone: form.whatsappPhone,
      zipCode: form.zipCode,
      address: form.address,
      email: form.email,
    });
    toast.success(t("adminBodyShopAdded") ?? "Body shop added.");
    setForm({ name: "", whatsappPhone: "", zipCode: "", address: "", email: "" });
    setAdding(false);
    refresh();
  };

  const handleImportSearch = async () => {
    const place = importPlace.trim();
    if (!place) return;
    setImportLoading(true);
    setImportResults([]);
    setImportSelected(new Set());
    try {
      const results = await searchCollisionCentersFromMap(place);
      setImportResults(results);
      if (results.length === 0) toast.info(t("adminCollisionCenterNoResults") ?? "No collision centers found for this location.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const hint = msg.includes("429") || msg.includes("minute")
        ? t("adminCollisionCenterSearchFailedRate")
        : t("adminCollisionCenterSearchFailed");
      toast.error(hint ?? "Search failed. Try another location (e.g. Miami, FL or 33142, USA).");
      console.warn(e);
    } finally {
      setImportLoading(false);
    }
  };

  const toggleImportSelected = (osmId: string) => {
    setImportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(osmId)) next.delete(osmId);
      else next.add(osmId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    const toAdd = importResults.filter((r) => r.osmId && importSelected.has(r.osmId));
    if (toAdd.length === 0) {
      toast.error("Select at least one shop.");
      return;
    }
    setImportAdding(true);
    let added = 0;
    for (const r of toAdd) {
      try {
        await addBodyShopAsync({
          name: r.name,
          whatsappPhone: r.phone,
          zipCode: r.zipCode,
          address: r.address || undefined,
          email: r.email || undefined,
        });
        added++;
      } catch (_) {}
    }
    setImportAdding(false);
    setImportSelected(new Set());
    if (added > 0) {
      toast.success(added === 1 ? (t("adminCollisionCenterAdded") ?? "Collision center added.") : `${added} collision centers added.`);
      refresh();
    }
  };

  const openWhatsApp = (phone: string) => {
    const num = normalizeWhatsAppPhone(phone);
    if (!num) return;
    window.open(`https://wa.me/${num}`, "_blank", "noopener,noreferrer");
  };

  if (!isAdmin) return null;

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/85">
        <div className="app-header-pt container mx-auto px-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
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

      <main className="app-safe-pb container mx-auto flex-1 overflow-y-auto overscroll-y-contain px-4 py-6">
        <h1 className="text-lg font-display font-bold mb-2">{t("adminOurCollisionCenters")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("adminOurCollisionCentersHint")}</p>

        <div className="mb-6 flex flex-wrap gap-3">
          {!adding && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("adminCollisionCenterAdd")}
            </Button>
          )}
        </div>

        <Card className="mb-6 border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t("adminCollisionCenterImportFromMap")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("adminCollisionCenterImportHint")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Input
                value={importPlace}
                onChange={(e) => setImportPlace(e.target.value)}
                placeholder={t("adminCollisionCenterSearchPlaceholder")}
                className="max-w-xs"
                onKeyDown={(e) => e.key === "Enter" && handleImportSearch()}
              />
              <Button onClick={handleImportSearch} disabled={importLoading}>
                {importLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("adminBodyShopSearchButton")}
              </Button>
            </div>
            {importResults.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{importResults.length} found</span>
                  <Button size="sm" onClick={handleAddSelected} disabled={importAdding || importSelected.size === 0}>
                    {importAdding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {t("adminCollisionCenterAddSelected")} ({importSelected.size})
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2">
                  {importResults.map((r) => (
                    <label
                      key={r.osmId ?? r.name + r.phone}
                      className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={r.osmId ? importSelected.has(r.osmId) : false}
                        onChange={() => r.osmId && toggleImportSelected(r.osmId)}
                        className="mt-1"
                      />
                      <div className="min-w-0 text-sm">
                        <p className="font-medium truncate">{r.name}</p>
                        {r.phone && <p className="text-muted-foreground">{r.phone}</p>}
                        {r.address && <p className="text-muted-foreground truncate">{r.address}</p>}
                        {r.email && <p className="text-muted-foreground truncate">{r.email}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {adding && (
          <Card className="mb-6 border-accent/30">
            <CardHeader>
              <CardTitle className="text-base">{t("adminCollisionCenterAdd")}</CardTitle>
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
              <div>
                <Label htmlFor="add-email">{t("adminBodyShopEmail")}</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="shop@example.com"
                />
              </div>
              <div>
                <Label htmlFor="add-address">{t("adminBodyShopAddress")}</Label>
                <Input
                  id="add-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, City, FL"
                />
              </div>
              <div>
                <Label htmlFor="add-zip">{t("adminBodyShopZipCode")}</Label>
                <Input
                  id="add-zip"
                  value={form.zipCode}
                  onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                  placeholder="33021"
                />
                <p className="text-xs text-muted-foreground mt-1">{t("adminBodyShopZipHint")}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd}>{t("add") ?? "Add"}</Button>
                <Button variant="outline" onClick={() => { setAdding(false); setForm({ name: "", whatsappPhone: "", zipCode: "", address: "", email: "" }); }}>
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
                    <div>
                      <Label className="text-xs">{t("adminBodyShopEmail")}</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("adminBodyShopAddress")}</Label>
                      <Input
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("adminBodyShopZipCode")}</Label>
                      <Input
                        value={form.zipCode}
                        onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                        className="mt-1"
                        placeholder="33021"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(shop.id)}>{t("save") ?? "Save"}</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setForm({ name: "", whatsappPhone: "", zipCode: "", address: "", email: "" }); }}>{t("cancel") ?? "Cancel"}</Button>
                    </div>
                  </div>
                    ) : (
                  <>
                    <div>
                      <p className="font-medium text-foreground">{shop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("adminBodyShopWhatsAppPhone")}: {shop.whatsappPhone || "—"}
                        {shop.zipCode ? ` · ${t("zip")} ${shop.zipCode}` : ""}
                        {shop.address ? ` · ${shop.address}` : ""}
                        {shop.email ? ` · ${shop.email}` : ""}
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
                          setForm({ name: shop.name, whatsappPhone: shop.whatsappPhone ?? "", zipCode: shop.zipCode ?? "", address: shop.address ?? "", email: shop.email ?? "" });
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
                            void deleteBodyShopAsync(shop.id).then(() => {
                              toast.success(t("adminBodyShopDeleted") ?? "Removed.");
                              refresh();
                            });
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
