import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Single source of truth for the backend origin used by the dev/preview proxy.
  const backendOrigin = env.VITE_BACKEND_ORIGIN;
  // Only proxy when an origin is configured. In production the frontend is
  // served same-origin with the API, so no proxy is required.
  const apiProxy = backendOrigin
    ? {
        "/api": { target: backendOrigin, changeOrigin: true, secure: false },
      }
    : undefined;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      host: "127.0.0.1",
      proxy: apiProxy,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
      proxy: apiProxy,
    },
  };
});
