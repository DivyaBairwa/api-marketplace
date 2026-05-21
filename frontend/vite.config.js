import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backend = "http://localhost:3000";
const proxyPrefixes = [
  "/auth",
  "/admin",
  "/v1",
  "/catalog",
  "/buy",
  "/dashboard",
  "/my-key",
  "/my-logs",
  "/regenerate-key",
  "/health",
];

const proxy = Object.fromEntries(
  proxyPrefixes.map((p) => [
    p,
    {
      target: backend,
      changeOrigin: true,
      bypass(req) {
        const accept = req.headers.accept || "";
        if (req.method === "GET" && accept.includes("text/html")) {
          return req.url;
        }
      },
    },
  ]),
);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy,
  },
});
