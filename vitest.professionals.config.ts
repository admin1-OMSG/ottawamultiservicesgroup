import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["tests/professionals/**/*.test.tsx", "tests/interac/**/*.test.tsx", "tests/marketplace/**/*.test.tsx"],
    clearMocks: true,
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1,
  },
});
