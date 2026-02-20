/**
 * Unlock payment via Stripe Checkout (external payment – Apple compliant for service/intermediary).
 * We are not selling digital content; this is a service fee to connect with body shops.
 */

const FUNCTIONS_BASE = "/.netlify/functions";

export type CreateCheckoutResult = { url: string; sessionId: string } | { error: string };
export type VerifyResult = { success: true; requestRefId: string } | { error: string; paid?: boolean };

export async function createUnlockCheckout(
  requestRefId: string,
  successUrl: string,
  cancelUrl: string
): Promise<CreateCheckoutResult> {
  const res = await fetch(`${FUNCTIONS_BASE}/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestRefId, successUrl, cancelUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Could not start checkout" };
  if (data.url) return { url: data.url, sessionId: data.sessionId };
  return { error: data.error || "Invalid response" };
}

export async function verifyUnlockSession(sessionId: string): Promise<VerifyResult> {
  const res = await fetch(`${FUNCTIONS_BASE}/verify-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Verification failed", paid: data.paid };
  if (data.success && data.requestRefId) return { success: true, requestRefId: data.requestRefId };
  return { error: data.error || "Invalid response" };
}
