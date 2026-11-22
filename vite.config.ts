import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const target = "http://127.0.0.1:8787";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api/v1": target, "/live-view/stream": target, "/trades": target } },
});
