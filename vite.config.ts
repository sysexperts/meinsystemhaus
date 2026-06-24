import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Web-App: das gebaute Frontend wird vom Express-Server unter "/" ausgeliefert.
const API_TARGET = process.env.VITE_API_TARGET || "http://localhost:3001";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    // Im Dev-Modus werden API-Anfragen an den Backend-Server weitergeleitet.
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
      "/healthz": { target: API_TARGET, changeOrigin: true },
    },
  },
});
