/**
 * Verifies a Stripe Checkout session and returns the requestRefId if payment succeeded.
 * Client then marks the request as unlocked (localStorage / Firestore).
 */
const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "" };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server not configured" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { sessionId } = body;
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing sessionId" }) };
  }

  const stripe = new Stripe(secret);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Payment not completed", paid: false }),
      };
    }

    const requestRefId = session.client_reference_id || session.metadata?.requestRefId || null;
    if (!requestRefId) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request reference" }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, requestRefId }),
    };
  } catch (err) {
    console.error("Verify session error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Verification failed" }),
    };
  }
};
