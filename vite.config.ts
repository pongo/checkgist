import { fileURLToPath, URL } from "node:url";

import { defineConfig, normalizePath } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

const rootDirectory = normalizePath(fileURLToPath(new URL("./", import.meta.url)));

// https://vite.dev/config/
export default defineConfig({
  base: "/checkgist/",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    watch: {
      ignored: [
        `${rootDirectory}.*/**`,
        `${rootDirectory}coverage/**`,
        `${rootDirectory}docs/**`,
        `${rootDirectory}plans/**`,
        `${rootDirectory}tmp/**`,
        "**/*.test.ts",
      ],
    },
  },
});
