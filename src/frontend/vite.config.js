import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Standalone SPA — no canister/backend coupling. Builds to static assets that
// deploy to any host (Vercel, Netlify, GitHub Pages, S3, …).
export default defineConfig({
  logLevel: "error",
  build: {
    emptyOutDir: true,
    sourcemap: false,
  },
  css: {
    postcss: "./postcss.config.js",
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
});
