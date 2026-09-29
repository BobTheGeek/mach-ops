import { defineConfig } from "vite";
import { resolve } from "node:path";

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
});
