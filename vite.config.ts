import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { mochaPlugins } from "@getmocha/vite-plugins";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [
    ...mochaPlugins(process.env as any), 
    react(), 
    cloudflare(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
