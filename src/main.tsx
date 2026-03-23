import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

removeCapacitorBootBanner();

createRoot(document.getElementById("root")!).render(<App />);
