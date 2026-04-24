/**
 * Bilingual (EN + ES) outreach copy for body shops via WhatsApp / SMS / email.
 * Step 1: no link — wait for "Yes" / "Sí" before sending the quote link (step 2).
 */

export type RequestVehicleFields = {
  vehicle?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
};

export function formatVehicleForOutreach(r: RequestVehicleFields | null | undefined): string {
  if (!r) return "vehicle";
  const vehicle = (r.vehicle ?? "").trim();
  const trim = (r.trim ?? "").trim();
  if (vehicle) {
    if (trim && !vehicle.toLowerCase().includes(trim.toLowerCase())) {
      return `${vehicle} ${trim}`.trim();
    }
    return vehicle;
  }
  const parts = [r.year, r.make, r.model, r.trim].filter(Boolean) as string[];
  return parts.join(" ").trim() || "vehicle";
}

/** Step 1 — English + Spanish, no URL. */
export function buildBodyShopOutreachIntro(vehicleDescription: string): string {
  const v = vehicleDescription.trim() || "vehicle";
  return [
    `Hello, this is an official message from Fixly. Our client has a damaged ${v}. Please reply to this message with "Yes" so that we can send the photos for an estimate.`,
    "",
    "—",
    "",
    `Hola, este es un mensaje oficial de Fixly. Nuestro cliente tiene un ${v} dañado. Responda a este mensaje con «Sí» para que podamos enviarle las fotos para un presupuesto.`,
  ].join("\n");
}

/** Step 2 — English + Spanish + quote link (only after they reply Yes / Sí). */
export function buildBodyShopOutreachWithLink(quoteLinkUrl: string): string {
  const link = quoteLinkUrl.trim();
  return [
    "Please click the link below to view all photos of the damaged vehicle, and kindly submit your pricing and estimated turnaround time.",
    "",
    link,
    "",
    "—",
    "",
    "Haga clic en el enlace de arriba para ver todas las fotos del vehículo dañado e indique su precio y el tiempo estimado de entrega.",
  ].join("\n");
}
