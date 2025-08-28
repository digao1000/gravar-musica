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
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Use esbuild for minification (default, faster than terser)
    minify: mode === 'production' ? 'esbuild' : false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Ensure SPA fallback for client-side routing
  appType: 'spa',
  base: './',
}));
