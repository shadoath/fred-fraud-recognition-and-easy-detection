import react from "@vitejs/plugin-react-swc"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"
import { defineConfig } from "vite"

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // ── Content script build (IIFE — classic script, no ES module syntax) ──────
  // Run via: vite build --mode content
  // Output:  dist/content/gmailScanner.js
  if (mode === "content") {
    return {
      build: {
        lib: {
          entry: resolve(__dirname, "src/content/gmailScanner.ts"),
          formats: ["iife"],
          name: "FredGmailScanner",
        },
        outDir: "dist",
        emptyOutDir: false, // preserve the popup build output
        rollupOptions: {
          output: {
            entryFileNames: "content/gmailScanner.js",
          },
        },
      },
    }
  }

  // ── Main build: popup (index.html) + background service worker ─────────────
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
          background: resolve(__dirname, "src/background/serviceWorker.ts"),
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
  }
})
