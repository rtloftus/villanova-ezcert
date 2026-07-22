import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        "pdf-parse",
        "better-sqlite3"
      ]
    }
  }
});