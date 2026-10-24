/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { questionBank } from "./plugins/questionBank";

export default defineConfig({
  // Relative asset URLs so the build works under any GitHub Pages sub-path.
  base: "./",
  plugins: [react(), questionBank()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
