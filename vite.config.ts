import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

function spaFallbackPlugin() {
  return {
    name: "spa-fallback",
    configurePreviewServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url?.split("?")[0] ?? "/";
        if (url !== "/" && !url.startsWith("/assets/") && !path.extname(url)) {
          const indexPath = path.join(process.cwd(), "dist", "index.html");
          if (fs.existsSync(indexPath)) {
            (req as { url?: string }).url = "/index.html";
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  plugins: [react(), spaFallbackPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
