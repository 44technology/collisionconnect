/**
 * Creates a Stripe Checkout session for the unlock fee.
 * Service fee for connecting with body shops – not digital content (Apple compliant).
 * Requires: STRIPE_SECRET_KEY, STRIPE_UNLOCK_PRICE_ID (optional; or we use price_data)
 */
const Stripe = require("stripe");

const UNLOCK_AMOUNT = 499; // $4.99 in cents
const UNLOCK_LABEL = "Unlock body shop contact details (service fee)";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "" };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error("STRIPE_SECRET_KEY not set");
    return { statusCode: 500, body: JSON.stringify({ error: "Server not configured for payments" }) };
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

  try {
    const sessionParams = {
      mode: "payment",
      client_reference_id: requestRefId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: UNLOCK_AMOUNT,
            product_data: {
              name: UNLOCK_LABEL,
              description: "One-time service fee to view body shop contact info for your repair request. You are paying for connection to service providers, not for digital content.",
              images: [],
            },
          },
        },
      ],
      metadata: { requestRefId },
    };

    const priceId = process.env.STRIPE_UNLOCK_PRICE_ID;
    if (priceId) {
      sessionParams.line_items = [{ price: priceId, quantity: 1 }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error("Stripe error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Checkout creation failed" }),
    };
  }
};
