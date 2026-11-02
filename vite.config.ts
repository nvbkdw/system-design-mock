/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { questionBank } from "./plugins/questionBank";
import { seoPages } from "./plugins/seoPages";
import { tutorialBook } from "./plugins/tutorialBook";

export default defineConfig({
  // Relative asset URLs; each generated page sets <base> to the site root.
  base: "./",
  plugins: [react(), questionBank(), tutorialBook(), seoPages()],
  test: {
    include: ["src/**/*.test.ts", "plugins/**/*.test.ts"],
  },
});
