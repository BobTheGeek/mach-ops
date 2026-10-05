import { defineConfig } from "vite";
import { resolve } from "node:path";
import { VitePWA } from "vite-plugin-pwa";

// Two pages, not one. design/README.md: the /dad parent view is "intentionally
// plain (light, Plex Sans) and not on the game skin", and plain HTML for it is
// explicitly allowed. Keeping it out of Phaser means a 78-row collapsible table,
// date inputs and a CSV download are ordinary DOM rather than canvas work.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dad: resolve(__dirname, "dad.html"),
      },
    },
  },
  plugins: [
    // Offline installable build. registerType autoUpdate keeps a school tablet
    // on the newest build without an update prompt; devOptions stays off so
    // pnpm dev never serves a service worker over the dev server.
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      manifest: {
        name: "Mach Ops: Weapons-Grade Math",
        short_name: "Mach Ops",
        display: "standalone",
        orientation: "landscape",
        scope: "/",
        start_url: "/",
        background_color: "#0a1018",
        theme_color: "#0a1018",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Music is fetched at runtime from /audio, so it must be in the
        // precache too: 4 MB admits the largest track (3.2 MB).
        globPatterns: ["**/*.{js,css,html,svg,woff2,mp3,png}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/dad\.html$/],
      },
    }),
  ],
});
