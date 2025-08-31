
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { mochaPlugins } from "@getmocha/vite-plugins";

export default defineConfig(({ mode }) => ({
  base: "/", // 👈 garante que os assets carreguem do domínio raiz
  plugins: [
    ...mochaPlugins(process.env as any),
    react(),
    mode === "production" && cloudflare(),
  ].filter(Boolean),
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: true,
    strictPort: false,
  },
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: mode === "production" ? "esbuild" : false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
