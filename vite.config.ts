import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Prevent CORS issues when loading from WebView
    cors: true,
  },
  plugins: [
    react({
      // Optimize JSX for mobile performance
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: [
          // Optional optimization for production builds
          mode === 'production' && [
            'transform-remove-console',
            { exclude: ['error', 'warn'] }
          ],
        ].filter(Boolean),
      },
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize build for mobile devices
  build: {
    target: 'es2015', // Ensure compatibility with Android WebView
    assetsInlineLimit: 10000, // Inline small assets to reduce HTTP requests
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.logs in production for performance
        drop_console: mode === 'production',
        // Keep error logs
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code to optimize caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/database', 'firebase/auth'],
          ui: ['@/components/ui'],
        },
      },
    },
  },
}));
