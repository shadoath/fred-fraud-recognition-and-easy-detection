import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import { resolve } from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/background/background.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          return chunk.name === "background"
            ? "background.js"
            : "assets/[name]-[hash].js";
        }
      }
    },
    // Disable code-splitting for extension scripts
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
  }
})
