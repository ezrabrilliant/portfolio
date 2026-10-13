/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    rollupOptions: {
      output: {
        // function form: the object form only names entry modules, so react/jsx-runtime, react-dom/client,
        // scheduler and zustand ended up in vendor-r3f. The 3D world is lazy-loaded (WorldCanvas), so vendor-three
        // and vendor-r3f load with it, not with the page shell. Rollup's shared helpers (CommonJS interop, Vite's
        // preload helper) go with React: left alone they land in vendor-r3f and drag it into the initial load.
        manualChunks(id) {
          if (id.includes('commonjsHelpers') || id.includes('vite/preload-helper')) return 'vendor-react'
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|zustand|use-sync-external-store)[\\/]/.test(id)) return 'vendor-react'
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'vendor-three'
          if (/[\\/]node_modules[\\/](@react-three[\\/]|react-reconciler|troika-|webgl-sdf-generator|bidi-js|its-fine|suspend-react|react-use-measure)/.test(id)) return 'vendor-r3f'
          return undefined
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts", "server/**/*.test.js"],
    environment: "node",
  },
})
