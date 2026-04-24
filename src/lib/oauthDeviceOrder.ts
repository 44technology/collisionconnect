/**
 * Primary OAuth for customer flows: Apple-first on iPhone/iPad, Google-first on Android.
 * Desktop and others default to Google first (Apple still available).
 */
export function getOauthPrimaryProvider(): "apple" | "google" {
  if (typeof navigator === "undefined") return "google";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPod/i.test(ua) ||
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "apple";
  if (/Android/i.test(ua)) return "google";
  return "google";
}
