import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Standalone SPA — builds to static assets that deploy to any host
// (Vercel, Netlify, GitHub Pages, S3, …). No backend, no PostCSS/Tailwind.
export default defineConfig({
  logLevel: "error",
  build: {
    emptyOutDir: true,
    sourcemap: false,
  },
  plugins: [react()],
});
