// @ts-check

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// GitHub Pages serves the organization site from the domain root. A future
// Cloudflare Workers Static Assets deployment would serve the same dist/.
const siteUrl = (process.env.PUBLIC_SITE_URL ?? "https://dbdelve.github.io").replace(/\/+$/, "");

export default defineConfig({
  site: siteUrl,
  output: "static",
  trailingSlash: "ignore",
  integrations: [sitemap()],
  build: {
    inlineStylesheets: "auto",
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: 4096,
      target: "es2022",
      sourcemap: false,
    },
  },
});
