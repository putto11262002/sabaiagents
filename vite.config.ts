import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],

  // Root directory for the frontend
  root: resolve(__dirname, 'src/frontend'),

  // Public base path
  base: '/',

  // Build configuration
  build: {
    // Output directory relative to project root
    outDir: resolve(__dirname, 'dist/client'),
    emptyOutDir: true,

    // Generate manifest for backend integration
    manifest: true,

    // Entry point for the build
    rollupOptions: {
      input: resolve(__dirname, 'src/frontend/app.tsx'),
    },
  },

  // Dev server configuration
  server: {
    // Port for Vite dev server
    port: 5173,

    // Enable middleware mode for Express integration
    middlewareMode: false, // We'll handle this programmatically

    // Proxy API requests to Express backend in development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
