import { defineConfig, mergeConfig } from "vitest/config";
import vite from "./vite.config";

export default mergeConfig(vite, defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    setupFiles: ["./tests/setup.ts"],
    maxWorkers: 2,
  },
}));
