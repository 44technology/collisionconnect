import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Backward compatibility for old non-hash quote links:
// /quote/CC-XXXX-YYYY -> /#/quote/CC-XXXX-YYYY
function redirectLegacyQuotePathToHashRouter() {
  try {
    const { pathname, search, hash } = window.location;
    if (hash) return;
    if (!pathname.startsWith("/quote/")) return;
    window.location.replace(`${window.location.origin}/#${pathname}${search}`);
  } catch {
    // ignore
  }
}

// Capacitor / geçmiş bundle kalıntılarından gelebilen debug banner'ı gizle.
// (Bazı cihazlarda simülatör cache'i eski `index.html` içeriğini gösterebiliyor.)
function removeCapacitorBootBanner() {
  try {
    const all = Array.from(document.querySelectorAll("*"));
    for (const el of all) {
      const text = el.textContent || "";
      if (text.includes("CAPACITOR BOOT")) {
        el.remove();
      }
    }
  } catch {
    // ignore
  }
}

redirectLegacyQuotePathToHashRouter();
removeCapacitorBootBanner();

createRoot(document.getElementById("root")!).render(<App />);
