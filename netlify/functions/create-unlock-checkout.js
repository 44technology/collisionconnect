/**
 * Netlify: Stripe Checkout Session for unlock ($4.99).
 * Env (Netlify): STRIPE_SECRET_KEY, STRIPE_UNLOCK_PRICE_ID (price_...)
 */
const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_UNLOCK_PRICE_ID;
  if (!secret || !priceId) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Stripe is not configured (STRIPE_SECRET_KEY / STRIPE_UNLOCK_PRICE_ID).",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { requestRefId, successUrl, cancelUrl } = body;
  if (!requestRefId || !successUrl || !cancelUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing requestRefId, successUrl, or cancelUrl" }),
    };
  }

  const stripe = new Stripe(secret);
  const sep = successUrl.includes("?") ? "&" : "?";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}${sep}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    client_reference_id: String(requestRefId),
    metadata: { requestRefId: String(requestRefId) },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: session.url }),
  };
};
