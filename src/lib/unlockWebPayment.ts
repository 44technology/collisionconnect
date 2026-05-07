/**
 * Web: Stripe Checkout via Netlify Functions (unlock quote details $4.99).
 * Set STRIPE_SECRET_KEY, STRIPE_UNLOCK_PRICE_ID on Netlify.
 */

export type UnlockCheckoutResult =
  | { url: string }
  | { error: string };

export async function createUnlockCheckout(
  requestRefId: string,
  successUrl: string,
  cancelUrl: string
): Promise<UnlockCheckoutResult> {
  const fn =
    import.meta.env.VITE_UNLOCK_CHECKOUT_FN_URL ||
    "/.netlify/functions/create-unlock-checkout";
  try {
    const res = await fetch(fn, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestRefId, successUrl, cancelUrl }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) return { error: data.error || "Checkout failed" };
    if (!data.url) return { error: "No checkout URL" };
    return { url: data.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg };
  }
}

export type VerifyResult =
  | { success: true; requestRefId: string }
  | { error: string };

export async function verifyUnlockSession(sessionId: string): Promise<VerifyResult> {
  const fn =
    import.meta.env.VITE_UNLOCK_VERIFY_FN_URL ||
    "/.netlify/functions/verify-unlock-session";
  try {
    const res = await fetch(`${fn}?session_id=${encodeURIComponent(sessionId)}`);
    const data = (await res.json()) as { success?: boolean; requestRefId?: string; error?: string };
    if (!res.ok) return { error: data.error || "Verification failed" };
    if (data.success && data.requestRefId) return { success: true, requestRefId: data.requestRefId };
    return { error: data.error || "Payment not completed" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg };
  }
}
