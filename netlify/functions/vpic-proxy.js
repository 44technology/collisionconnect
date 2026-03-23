// Proxy for VPIC (NHTSA) to avoid iOS WebView CORS issues.
// Usage: /.netlify/functions/vpic-proxy?url=<full_vpic_url>

const VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

exports.handler = async (event) => {
  // Netlify functions use different event shape; handle both common cases.
  const method = event.httpMethod || "GET";

  const resHeaders = {
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: resHeaders,
      body: "",
    };
  }

  if (method !== "GET") {
    return { statusCode: 405, headers: resHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const qs = event.queryStringParameters || {};
  const targetUrl = qs.url;

  if (!targetUrl) {
    return { statusCode: 400, headers: resHeaders, body: JSON.stringify({ error: "Missing query param: url" }) };
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { statusCode: 400, headers: resHeaders, body: JSON.stringify({ error: "Invalid url" }) };
  }

  // Security: only allow VPIC endpoints.
  if (!parsed.href.startsWith(VPIC_BASE)) {
    return { statusCode: 400, headers: resHeaders, body: JSON.stringify({ error: "url must start with vpic.nhtsa.dot.gov/api/vehicles" }) };
  }

  try {
    const vpRes = await fetch(parsed.href, {
      headers: { Accept: "application/json" },
    });

    const text = await vpRes.text();
    const headers = {
      ...resHeaders,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Return JSON when possible, otherwise pass-through raw text.
    try {
      return { statusCode: vpRes.status, headers, body: text };
    } catch {
      return { statusCode: vpRes.status, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" }, body: text };
    }
  } catch (e) {
    return { statusCode: 500, headers: resHeaders, body: JSON.stringify({ error: "VPIC proxy failed", message: String(e) }) };
  }
};

