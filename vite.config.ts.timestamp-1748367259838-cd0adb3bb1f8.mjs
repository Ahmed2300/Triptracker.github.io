// vite.config.ts
import { defineConfig } from "file:///C:/Users/mazam/Desktop/trip-tracker-mobile-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/mazam/Desktop/trip-tracker-mobile-main/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///C:/Users/mazam/Desktop/trip-tracker-mobile-main/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\mazam\\Desktop\\trip-tracker-mobile-main";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Prevent CORS issues when loading from WebView
    cors: true
  },
  plugins: [
    react({
      // Optimize JSX for mobile performance
      jsxImportSource: "@emotion/react",
      babel: {
        plugins: [
          // Optional optimization for production builds
          mode === "production" && [
            "transform-remove-console",
            { exclude: ["error", "warn"] }
          ]
        ].filter(Boolean)
      }
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  // Optimize build for mobile devices
  build: {
    target: "es2015",
    // Ensure compatibility with Android WebView
    assetsInlineLimit: 1e4,
    // Inline small assets to reduce HTTP requests
    cssCodeSplit: true,
    minify: "terser",
    terserOptions: {
      compress: {
        // Remove console.logs in production for performance
        drop_console: mode === "production",
        // Keep error logs
        pure_funcs: mode === "production" ? ["console.log", "console.info", "console.debug"] : []
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code to optimize caching
          vendor: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/database", "firebase/auth"],
          ui: ["@/components/ui"]
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtYXphbVxcXFxEZXNrdG9wXFxcXHRyaXAtdHJhY2tlci1tb2JpbGUtbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcbWF6YW1cXFxcRGVza3RvcFxcXFx0cmlwLXRyYWNrZXItbW9iaWxlLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL21hemFtL0Rlc2t0b3AvdHJpcC10cmFja2VyLW1vYmlsZS1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICAvLyBQcmV2ZW50IENPUlMgaXNzdWVzIHdoZW4gbG9hZGluZyBmcm9tIFdlYlZpZXdcbiAgICBjb3JzOiB0cnVlLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3Qoe1xuICAgICAgLy8gT3B0aW1pemUgSlNYIGZvciBtb2JpbGUgcGVyZm9ybWFuY2VcbiAgICAgIGpzeEltcG9ydFNvdXJjZTogJ0BlbW90aW9uL3JlYWN0JyxcbiAgICAgIGJhYmVsOiB7XG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAvLyBPcHRpb25hbCBvcHRpbWl6YXRpb24gZm9yIHByb2R1Y3Rpb24gYnVpbGRzXG4gICAgICAgICAgbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nICYmIFtcbiAgICAgICAgICAgICd0cmFuc2Zvcm0tcmVtb3ZlLWNvbnNvbGUnLFxuICAgICAgICAgICAgeyBleGNsdWRlOiBbJ2Vycm9yJywgJ3dhcm4nXSB9XG4gICAgICAgICAgXSxcbiAgICAgICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgICB9LFxuICAgIH0pLFxuICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiZcbiAgICBjb21wb25lbnRUYWdnZXIoKSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgLy8gT3B0aW1pemUgYnVpbGQgZm9yIG1vYmlsZSBkZXZpY2VzXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiAnZXMyMDE1JywgLy8gRW5zdXJlIGNvbXBhdGliaWxpdHkgd2l0aCBBbmRyb2lkIFdlYlZpZXdcbiAgICBhc3NldHNJbmxpbmVMaW1pdDogMTAwMDAsIC8vIElubGluZSBzbWFsbCBhc3NldHMgdG8gcmVkdWNlIEhUVFAgcmVxdWVzdHNcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICAvLyBSZW1vdmUgY29uc29sZS5sb2dzIGluIHByb2R1Y3Rpb24gZm9yIHBlcmZvcm1hbmNlXG4gICAgICAgIGRyb3BfY29uc29sZTogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nLFxuICAgICAgICAvLyBLZWVwIGVycm9yIGxvZ3NcbiAgICAgICAgcHVyZV9mdW5jczogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nID8gWydjb25zb2xlLmxvZycsICdjb25zb2xlLmluZm8nLCAnY29uc29sZS5kZWJ1ZyddIDogW10sXG4gICAgICB9LFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIFNwbGl0IHZlbmRvciBjb2RlIHRvIG9wdGltaXplIGNhY2hpbmdcbiAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICBmaXJlYmFzZTogWydmaXJlYmFzZS9hcHAnLCAnZmlyZWJhc2UvZGF0YWJhc2UnLCAnZmlyZWJhc2UvYXV0aCddLFxuICAgICAgICAgIHVpOiBbJ0AvY29tcG9uZW50cy91aSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5VSxTQUFTLG9CQUFvQjtBQUN0VyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFFTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBO0FBQUEsTUFFSixpQkFBaUI7QUFBQSxNQUNqQixPQUFPO0FBQUEsUUFDTCxTQUFTO0FBQUE7QUFBQSxVQUVQLFNBQVMsZ0JBQWdCO0FBQUEsWUFDdkI7QUFBQSxZQUNBLEVBQUUsU0FBUyxDQUFDLFNBQVMsTUFBTSxFQUFFO0FBQUEsVUFDL0I7QUFBQSxRQUNGLEVBQUUsT0FBTyxPQUFPO0FBQUEsTUFDbEI7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELFNBQVMsaUJBQ1QsZ0JBQWdCO0FBQUEsRUFDbEIsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQTtBQUFBLElBQ1IsbUJBQW1CO0FBQUE7QUFBQSxJQUNuQixjQUFjO0FBQUEsSUFDZCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUE7QUFBQSxRQUVSLGNBQWMsU0FBUztBQUFBO0FBQUEsUUFFdkIsWUFBWSxTQUFTLGVBQWUsQ0FBQyxlQUFlLGdCQUFnQixlQUFlLElBQUksQ0FBQztBQUFBLE1BQzFGO0FBQUEsSUFDRjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBO0FBQUEsVUFFWixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2pELFVBQVUsQ0FBQyxnQkFBZ0IscUJBQXFCLGVBQWU7QUFBQSxVQUMvRCxJQUFJLENBQUMsaUJBQWlCO0FBQUEsUUFDeEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
