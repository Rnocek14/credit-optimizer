import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Canonical site origin. Set VITE_SITE_URL in the deploy environment; the
// default keeps index.html's %VITE_SITE_URL% placeholders resolving so they
// never ship as literal text. Build-time value — changing it needs a redeploy.
process.env.VITE_SITE_URL =
  (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://pivot.app").replace(/\/+$/, "");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: {
      origin: ['https://lovable.dev', 'https://*.lovableproject.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey'],
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
