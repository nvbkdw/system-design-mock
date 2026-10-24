/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { questionBank } from "./plugins/questionBank";
import { seoPages } from "./plugins/seoPages";

export default defineConfig({
  // Relative asset URLs; each generated page sets <base> to the site root.
  base: "./",
  plugins: [react(), questionBank(), seoPages()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
