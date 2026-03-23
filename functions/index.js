const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onRequest } = require("firebase-functions/v2/https");
const sharp = require("sharp");
const { Storage } = require("@google-cloud/storage");

// Admin SDK (for functions runtime). Not strictly required for GCS access,
// but keep initialization in case you want to extend later.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("firebase-admin");

const storage = new Storage();

// Target: around 400KB max per image.
// Note: exact size depends on image content, so we aim for "<= 420KB".
const TARGET_MAX_BYTES = 420 * 1024;
const MAX_DIMENSION = 1600;

const VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

async function encodeJpegToMaxBytes(buffer) {
  // Try a few quality levels until we fit target size.
  // This is deterministic-ish, but still content-dependent.
  let quality = 82;
  let last = null;

  // Safety cap on iterations.
  for (let i = 0; i < 10; i++) {
    const out = await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality,
        mozjpeg: true,
        progressive: true,
      })
      .toBuffer();

    last = out;
    if (out.length <= TARGET_MAX_BYTES) return out;
    quality -= 8;
    if (quality < 25) break;
  }

  return last || buffer;
}

exports.optimizeRequestImages = onObjectFinalized(
  {
    // You can tweak these based on your expected image sizes.
    timeoutSeconds: 120,
    memory: "1GiB",
  },
  async (event) => {
    const bucket = event.data.bucket;
    const objectName = event.data.name;
    if (!bucket || !objectName) return;

    // We only care about: requests/{refId}/{file}
    const match = objectName.match(/^requests\/([^/]+)\/([^/]+)$/);
    if (!match) return;

    const refId = match[1];
    const fileName = match[2];

    // Safety: ignore temp paths (in case you deploy/update later).
    if (fileName.startsWith("__")) return;

    const gcsBucket = storage.bucket(bucket);
    const file = gcsBucket.file(objectName);

    // Fetch current metadata to decide whether we should process.
    const [metadata] = await file.getMetadata().catch(() => [null]);
    if (!metadata) return;

    const contentType = metadata.contentType || "";
    if (contentType && !contentType.startsWith("image/")) return;

    const size = Number(metadata.size ?? 0);
    if (size > 0 && size <= TARGET_MAX_BYTES) {
      // Already small enough; also prevents infinite loops when overwriting.
      return;
    }

    const tempObjectName = `requests/${refId}/__orig_tmp__/${fileName}`;
    const tempFile = gcsBucket.file(tempObjectName);

    // Move original to temp (copy + delete), then write optimized back to the same objectName.
    await file.copy(tempObjectName);
    await file.delete({ ignoreNotFound: true });

    const [originalBuffer] = await tempFile.download();
    const optimizedBuffer = await encodeJpegToMaxBytes(originalBuffer);

    // Overwrite original path with optimized buffer so Firestore/client URLs remain valid.
    await gcsBucket
      .file(objectName)
      .save(optimizedBuffer, {
        resumable: false,
        contentType: "image/jpeg",
      });

    // Cleanup temp original.
    await tempFile.delete({ ignoreNotFound: true });
  }
);

exports.vpicProxy = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const targetUrl = String(req.query.url || "");
  if (!targetUrl) {
    res.status(400).json({ error: "Missing query param: url" });
    return;
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  // Security: only allow requests to VPIC endpoints.
  if (!parsed.href.startsWith(VPIC_BASE)) {
    res.status(400).json({ error: "url must start with vpic.nhtsa.dot.gov/api/vehicles" });
    return;
  }

  try {
    const vpRes = await fetch(parsed.href, {
      headers: { Accept: "application/json" },
    });

    const text = await vpRes.text();
    res.status(vpRes.status);

    // Try to parse JSON; if it fails, return raw text.
    try {
      const json = JSON.parse(text);
      res.set("Content-Type", "application/json; charset=utf-8");
      res.send(json);
    } catch {
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.send(text);
    }
  } catch (e) {
    res.status(500).json({ error: "VPIC proxy failed", message: String(e) });
  }
});

